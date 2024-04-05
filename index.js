const PORT = process.env.PROD_PORT || 3000;
import express, { urlencoded } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import sql from "mysql2";
import session from "express-session";
import bodyParser from "body-parser";
import { v4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import morgan from "morgan";
// import { storeReturnTo } from "./middleware";
import dotenv from "dotenv";
import {
  createDeck,
  shuffle,
  sendGameState,
  checkMeld,
  isSubset,
  arraysEqual,
} from "./utils.js";
import { checkUserToken, getUserId } from "./middleware.js";
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const db = sql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "rummy",
  waitForConnections: true,
});
const sessionConfig = {
  secret: process.env.SECRET || "idkthesecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(session(sessionConfig));
app.use(urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("<h1>Server Running</h1>");
});

app.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const query =
      "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)";
    db.query(query, [email, passwordHash, name, "user"], (err, result) => {
      if (err) {
        throw err;
      }
      const userId = result.insertId;
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const hours = currentDate.getHours();
      const minutes = currentDate.getMinutes();
      const seconds = currentDate.getSeconds();
      const date = `${year}-${month}-${day}`;
      const time = `${hours}:${minutes}:${seconds}`;

      const insertActiveUserQuery =
        "INSERT INTO activeusers (user_id, isActive, last_active_date, last_active_time) VALUES (?, ?, ?, ?)";
      db.query(
        insertActiveUserQuery,
        [userId, true, date, time],
        (err, result) => {
          if (err) {
            throw err;
          }
          const insertUserDashboard =
            "INSERT INTO userdashboard (user_id, deposit_amount, current_balance, number_of_games_played, number_of_wins, number_of_lossess, winning_amount, total_amount_won, total_amount_lost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
          db.query(
            insertUserDashboard,
            [userId, 0, 1000, 0, 0, 0, 0, 0, 0],
            (err, result) => {
              if (err) {
                throw err;
              }
              const token = jwt.sign(
                {
                  id: userId,
                  email,
                  name,
                },
                "secretstring",
                {
                  expiresIn: "10000h",
                }
              );
              res.status(201).json({ token });
            }
          );
        }
      );
    });
  } catch (err) {
    res.status(500).json({ err });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, result) => {
      if (err) {
        throw err;
      }
      if (result.length > 0) {
        const firstUser = result[0];
        const isMatch = await bcrypt.compare(password, firstUser.password);
        if (isMatch) {
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const day = currentDate.getDate();
          const hours = currentDate.getHours();
          const minutes = currentDate.getMinutes();
          const seconds = currentDate.getSeconds();
          const date = `${year}-${month}-${day}`;
          const time = `${hours}:${minutes}:${seconds}`;
          const updateQuery =
            "UPDATE activeusers SET last_active_date = ?, last_active_time = ? WHERE user_id = ?";
          db.query(
            updateQuery,
            [date, time, firstUser.user_id],
            (err, updateResult) => {
              if (err) {
                throw err;
              }
              const token = jwt.sign(
                {
                  id: firstUser.user_id,
                  email: firstUser.email,
                  name: firstUser.name,
                },
                "secretstring",
                {
                  expiresIn: "10000h",
                }
              );
              res.status(200).json({ token });
            }
          );
        } else {
          res.status(400).json({ msg: "Invalid credentials." });
        }
      } else {
        res.status(400).json({ msg: "User does not exist." });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error." });
  }
});

app.get("/deposit", async (req, res) => {
  const token = req.headers["authorization"];
  const amount = req.body.amount;
  const userId = await getUserId(token);
  if (userId) {
    // Fetching userDashBoard data
    try {
      const query = "Select * from userdashboard where user_id = ?";
      db.query(query, [userId], (err, userData) => {
        if (err) {
          throw err;
        } else {
          const data = userData[0];
          // Updating the data
          const updateQuery =
            "UPDATE userdashboard SET deposit_amount = ?, current_balance = ? WHERE user_id = ?";
          db.query(
            updateQuery,
            [
              data.deposit_amount + amount,
              data.current_balance + amount,
              userId,
            ],
            (err, updatedData) => {
              if (err) {
                throw err;
              }
              res.status(200).json({ ...updatedData });
            }
          );
        }
      });
    } catch (err) {
      console.error("Error fetching data: ", err);
    }
  }
});

async function changeActiveStatus(isActive, userToken) {
  try {
    jwt.verify(userToken, "secretstring", async function (err, user) {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ msg: "Token expired" });
        } else {
          return res.status(403).json({ msg: "Invalid token" });
        }
      }
      const userId = user.id;
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate() + 1;
      const hours = currentDate.getHours();
      const minutes = currentDate.getMinutes();
      const seconds = currentDate.getSeconds();
      const date = `${year}-${month}-${day}`;
      const time = `${hours}:${minutes}:${seconds}`;
      const updateQuery =
        "UPDATE activeusers SET isActive = ?, last_active_date = ?, last_active_time = ? WHERE user_id = ?";
      db.query(
        updateQuery,
        [isActive ? 1 : 0, date, time, userId],
        (err, updateResult) => {
          if (err) {
            throw err;
          }
        }
      );
    });
  } catch (err) {
    console.error("Error updating active status:", err);
    throw err;
  }
}

const maxPlayers = 3;
const cardsPerPlayer = 6;
const priceOfGame = 100;
let userQueue = [];
let gameStates = {};

// Socket.io wala part
io.on("connection", async (socket) => {
  socket.on("joinButtonClicked", (user_token) => {
    checkUserToken(user_token)
      .then((isValid) => {
        if (isValid) {
          if (!userQueue.includes(socket.id)) {
            userQueue.push(socket.id);
            if (userQueue.length === maxPlayers) {
              const roomId = v4();
              const deck = createDeck();
              const shuffledDeck = shuffle(deck);
              const playerHandsMap = {};
              const discardPile = [];
              const meld = [];
              discardPile.push(...shuffledDeck.splice(0, 1));

              if (!gameStates[roomId]) {
                gameStates[roomId] = {
                  players: [],
                  deck: shuffledDeck,
                  playerHands: {},
                  discardPile,
                  meld,
                  currentTurn: 0,
                };
              }

              for (let i = 0; i < maxPlayers; i++) {
                gameStates[roomId].players.push(userQueue[i]);
                const socketId = userQueue[i];
                playerHandsMap[socketId] = shuffledDeck.splice(
                  0,
                  cardsPerPlayer
                );
              }

              gameStates[roomId].playerHands = playerHandsMap;

              for (let i = 0; i < maxPlayers; i++) {
                const socketId = userQueue.shift();
                const playerHand = playerHandsMap[socketId];
                io.to(socketId).emit("joinRoom", roomId, {
                  players: gameStates[roomId].players,
                  deck: gameStates[roomId].deck,
                  discardPile: gameStates[roomId].discardPile,
                  playerHand,
                  meld,
                  currentTurn: gameStates[roomId].currentTurn,
                });
              }
            }
          }
        } else {
          socket.emit("invalidToken");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on("join", (roomId) => {
    socket.join(roomId);
    socket.emit("joined", roomId);
  });
  socket.on("btnClicked", (roomId, msg) => {
    socket.to(roomId).emit("clicked", socket.id, msg);
  });
  socket.on("addRemainingCards", (roomId) => {
    const gameState = gameStates[roomId];
    if (gameState) {
      const playerHand = gameState.playerHands[socket.id];
      if (playerHand) {
        gameState.deck.push(...playerHand); // Add remaining cards back to the deck
        delete gameState.playerHands[socket.id]; // Remove player from playerHands
        const currentTurnIndex = gameState.players.indexOf(socket.id);
        if (currentTurnIndex < gameState.currentTurn)
          gameState.currentTurn -= 1;
        gameState.players = gameState.players.filter(
          (playerId) => playerId !== socket.id
        );
        const players = gameState.players;
        if (players.length === 1) {
          io.to(players[0]).emit("youWin");
        }
        io.to(socket.id).emit("youLost");
        gameState.deck = shuffle(gameState.deck);
        gameStates[roomId] = gameState;
        // Send updated game state to all players in the room
        sendGameState(players, io, gameState);
      }
    }
  });
  socket.on("exitRoom", (roomId) => {
    const index = userQueue.indexOf(socket.id);
    if (index > -1) {
      userQueue.splice(index, 1);
    }
    if (roomId) {
      socket.leave(roomId);
      socket.to(roomId).emit("UserLeft", socket.id);
    }
  });
  socket.on("changeStatus", async (isActiveBool, user_token) => {
    await changeActiveStatus(isActiveBool, user_token);
  });
  socket.on("disconnectEvent", async (token) => {
    if (token) await changeActiveStatus(false, token);
    socket.disconnect();
  });
  socket.on("checkTurn", (roomId, callbackFuncIdentifier, args) => {
    const index = gameStates[roomId].players.indexOf(socket.id);
    if (index === gameStates[roomId].currentTurn) {
      io.to(socket.id).emit("isTurn", callbackFuncIdentifier, args);
    } else {
      io.to(socket.id).emit("incorrectTurn");
    }
  });
  // Game Logic Events
  // Discard Card Picked
  socket.on("discardCard", (card, roomId) => {
    if (roomId && gameStates[roomId]) {
      const gameState = gameStates[roomId];
      const playerHand = gameState.playerHands[socket.id];
      playerHand.push(card);
      gameState.discardPile.pop();
      gameState.playerHands[socket.id] = playerHand;
      gameStates[roomId] = gameState;
      const players = gameState.players;
      sendGameState(players, io, gameState);
    }
  });
  // Deck Card Picked
  socket.on("deckCard", (card, roomId) => {
    if (roomId && gameStates[roomId]) {
      const gameState = gameStates[roomId];
      const playerHand = gameState.playerHands[socket.id];
      playerHand.push(card);
      gameState.deck.shift();
      gameState.playerHands[socket.id] = playerHand;
      gameStates[roomId] = gameState;
      const players = gameState.players;
      sendGameState(players, io, gameState);
    }
  });
  // To Play a card to discard Pile
  socket.on("playCard", (card, roomId) => {
    const cardId = card.id;
    if (roomId && gameStates[roomId]) {
      const gameState = gameStates[roomId];
      const playerHand = gameState.playerHands[socket.id];
      const discardedCardIndex = playerHand.findIndex(
        (card) => card.id === cardId
      );
      if (discardedCardIndex !== -1) {
        const discardedCard = playerHand.splice(discardedCardIndex, 1)[0];
        gameState.discardPile.push(discardedCard);
        gameState.playerHands[socket.id] = playerHand;
        // Handling Winning Condition
        if (playerHand.length === 0) {
          socket.emit("youWin");
        }
        gameStates[roomId] = gameState;
        const players = gameState.players;
        gameStates[roomId].currentTurn =
          (gameStates[roomId].currentTurn + 1) % gameState.players.length;
        // Maintaining Deck Size
        let deck = gameState.deck;
        let discardPile = gameState.discardPile;
        if (deck.length == 0) {
          const cardsToMoveToDesk = discardPile.slice(0, -1);
          deck = shuffle([...cardsToMoveToDesk]);
          discardPile = discardPile.slice(-1);
          gameStates[roomId].deck = deck;
          gameStates[roomId].discardPile = discardPile;
        }
        sendGameState(players, io, gameState);
      }
    }
  });
  // Add new Meld
  socket.on("addNewMeld", (selectedCards, roomId) => {
    if (roomId && gameStates[roomId] && selectedCards.length > 2) {
      if (checkMeld(selectedCards)) {
        const gameState = gameStates[roomId];
        let playerHand = gameState.playerHands[socket.id];
        const meld = gameState.meld;
        const sortedCards = selectedCards.slice().sort((a, b) => a.id - b.id);
        meld.push(sortedCards);
        playerHand = playerHand.filter((card) => {
          return !selectedCards.some((selectedCard) => {
            return (
              selectedCard.id === card.id &&
              selectedCard.suit === card.suit &&
              selectedCard.rank === card.rank
            );
          });
        });
        if (playerHand.length === 0) {
          socket.emit("youWin");
        }
        gameState.meld = meld;
        gameState.playerHands[socket.id] = playerHand;
        gameStates[roomId] = gameState;
        const players = gameState.players;
        sendGameState(players, io, gameState);
      }
    }
  });
  // Add cards to Meld
  socket.on("addToMeld", (oldMeld, newMeld, selectedCards, roomId) => {
    if (roomId && gameStates[roomId] && selectedCards.length > 0) {
      if (checkMeld(newMeld) && isSubset(oldMeld, newMeld)) {
        const gameState = gameStates[roomId];
        let playerHand = gameState.playerHands[socket.id];
        const meld = gameState.meld;
        const sortedCards = newMeld.slice().sort((a, b) => a.id - b.id);
        const newMeldDeck = meld.map((m) => {
          if (arraysEqual(m, oldMeld)) {
            return sortedCards;
          }
          return m;
        });
        playerHand = playerHand.filter((card) => {
          return !selectedCards.some((selectedCard) => {
            return (
              selectedCard.id === card.id &&
              selectedCard.suit === card.suit &&
              selectedCard.rank === card.rank
            );
          });
        });
        if (playerHand.length === 0) {
          socket.emit("youWin");
        }
        gameState.meld = newMeldDeck;
        gameState.playerHands[socket.id] = playerHand;
        gameStates[roomId] = gameState;
        const players = gameState.players;
        sendGameState(players, io, gameState);
      }
    }
  });
  // Handling Winning Condition
  socket.on("userWin", async (roomId, userToken) => {
    if (roomId && userToken) {
      socket.to(roomId).emit("userWin", socket.id);
      const userId = await getUserId(userToken);
      if (userId) {
        // updating userDashBoard
        try {
          const query = "Select * from userdashboard where user_id = ?";
          db.query(query, [userId], (err, userData) => {
            if (err) {
              throw err;
            } else {
              const data = userData[0];
              // Updating the data
              const updateQuery =
                "UPDATE userdashboard SET current_balance = ?, number_of_games_played = ?, number_of_wins = ?, winning_amount = ?, total_amount_won = ? WHERE user_id = ?";
              db.query(
                updateQuery,
                [
                  data.current_balance + priceOfGame * (maxPlayers - 1),
                  data.number_of_games_played + 1,
                  data.number_of_wins + 1,
                  data.winning_amount + priceOfGame * (maxPlayers - 1),
                  data.total_amount_won + priceOfGame * (maxPlayers - 1),
                  userId,
                ],
                (err, updatedData) => {
                  if (err) {
                    throw err;
                  }
                }
              );
            }
          });
        } catch (err) {
          console.error("Error fetching data: ", err);
        }
      }
    }
  });
  // Handling Losing Condition
  socket.on("userLost", async (userToken) => {
    if (userToken) {
      const userId = await getUserId(userToken);
      if (userId) {
        // Fetching userDashBoard data
        try {
          const query = "Select * from userdashboard where user_id = ?";
          db.query(query, [userId], (err, userData) => {
            if (err) {
              throw err;
            } else {
              const data = userData[0];
              // Updating the data
              const updateQuery =
                "UPDATE userdashboard SET current_balance = ?, number_of_games_played = ?, number_of_lossess = ?, total_amount_lost = ? WHERE user_id = ?";
              db.query(
                updateQuery,
                [
                  data.current_balance - priceOfGame,
                  data.number_of_games_played + 1,
                  data.number_of_lossess + 1,
                  data.total_amount_lost + priceOfGame,
                  userId,
                ],
                (err, updatedData) => {
                  if (err) {
                    throw err;
                  }
                }
              );
            }
          });
        } catch (err) {
          console.error("Error fetching data: ", err);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Connected to server Port ${PORT} !!!`);
});
