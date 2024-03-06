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
import { createDeck, shuffle } from "./utils.js";
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

app.post("/login", (req, res) => {
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
          console.log("Active status updated successfully");
        }
      );
    });
  } catch (err) {
    console.error("Error updating active status:", err);
    throw err;
  }
}

const maxPlayers = 5;
const cardsPerPlayer = 6;
let userQueue = [];
let gameStates = {};

// Socket.io wala part
io.on("connection", async (socket) => {
  console.log("user joined!!!", socket.id);
  socket.on("joinButtonClicked", () => {
    if (!userQueue.includes(socket.id)) userQueue.push(socket.id);
    if (userQueue.length === maxPlayers) {
      const roomId = v4();
      const deck = createDeck();
      const shuffledDeck = shuffle(deck);
      const playerHandsMap = {};
      const discardPile = [];
      discardPile.push(shuffledDeck.splice(0, 1));
      if (!gameStates[roomId]) {
        gameStates[roomId] = {
          players: [],
          deck: [],
          playerHands: {},
          discardPile,
        };
      }
      for (let i = 0; i < maxPlayers; i++) {
        gameStates[roomId].players.push(userQueue[i]);
        playerHandsMap[userQueue[i]] = shuffledDeck.splice(0, cardsPerPlayer);
      }
      gameStates[roomId].deck = shuffledDeck;
      gameStates[roomId].playerHands = playerHandsMap;
      for (let i = 0; i < maxPlayers; i++) {
        const socketId = userQueue.shift();
        io.to(socketId).emit("joinRoom", roomId, gameStates[roomId]);
      }
    }
  });
  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    socket.emit("joined", roomId);
  });
  socket.on("btnClicked", (roomId, msg) => {
    socket.to(roomId).emit("clicked", socket.id, msg);
  });
  socket.on("exitRoom", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("UserLeft", socket.id);
  });
  socket.on("changeStatus", async (isActiveBool, user_token) => {
    await changeActiveStatus(isActiveBool, user_token);
  });
  socket.on("disconnectEvent", async (token) => {
    await changeActiveStatus(false, token);
    socket.disconnect();
  });
  socket.on("disconnect", async () => {
    console.log("a user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Connected to server Port ${PORT} !!!`);
});
