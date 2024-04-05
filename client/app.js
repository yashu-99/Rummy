const socket = io("http://localhost:3000/");
const Joinbtn = document.getElementById("btn");
const Sendbtn = document.getElementById("btn2");
const Input = document.getElementById("msg");
const room_content = document.getElementById("room_content");
const join_room = document.getElementById("join_room");
const Exitbtn = document.getElementById("exit_btn");
import { renderGameState } from "./functions.js";
let roomId;
let userToken = null;
let gameState = {};
Joinbtn.addEventListener("click", () => {
  if (userToken) {
    if (!roomId) socket.emit("joinButtonClicked", userToken);
    else console.log("you are already in a room");
  } else {
    console.log("Log in First to Play!!");
  }
});
socket.on("invalidToken", () => {
  console.log("Invalid Token Please Login Again");
});
Exitbtn.addEventListener("click", () => {
  if (roomId) {
    socket.emit("exitRoom", roomId);
    socket.emit("addRemainingCards", roomId);
  }
  console.log("Leaving room: ", roomId);
  roomId = null;
  room_content.style.display = "none";
  join_room.style.display = "block";
});
Sendbtn.addEventListener("click", () => {
  const msg = Input.value;
  if (roomId) socket.emit("btnClicked", roomId, msg);
  else console.log("Join a room first");
  Input.value = "";
});

socket.on("joinRoom", (room_id, gameStates) => {
  roomId = room_id;
  gameState = gameStates;
  console.log(gameState);
  socket.emit("join", roomId);
});
socket.on("joined", (roomId) => {
  room_content.style.display = "block";
  join_room.style.display = "none";
  renderGameState(gameState);
});
socket.on("clicked", (userId, msg) => {
  console.log(`User: ${userId} sent the msg: ${msg}`);
});
socket.on("UserLeft", (id) => {
  console.log(`User: ${id} left the game!!!`);
});

const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);

  const email = formData.get("email");
  const password = formData.get("password");
  fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      userToken = data.token;
      console.log(userToken);
      if (userToken) {
        loginForm.style.display = "none";
        socket.emit("changeStatus", true, userToken);
      } else {
        alert("Invalid Credentials");
      }
    })
    .catch((error) => {
      console.error("Error fetching token:", error);
    });
});

window.addEventListener("beforeunload", () => {
  if (roomId) {
    socket.emit("exitRoom", roomId);
    socket.emit("addRemainingCards", roomId);
  }
  roomId = null;
  socket.emit("disconnectEvent", userToken);
});

// Game Logic
socket.on("gameStateUpdate", (currentGameState) => {
  gameState = currentGameState;
  console.log(gameState);
  renderGameState(gameState);
});
// Discard Pile Logic
function sendDiscardEvent(card) {
  if (roomId && card) socket.emit("discardCard", card, roomId);
  else if (!card) {
    console.log("The deck is Empty!!");
  } else {
    console.log("connect to a room first!!");
  }
}
function sendDeckEvent(card) {
  if (roomId && card) socket.emit("deckCard", card, roomId);
  else if (!card) {
    console.log("The deck is Empty!!");
  } else {
    console.log("connect to a room first!!");
  }
}
function sendPlayCardEvent(card) {
  if (roomId && card) {
    socket.emit("playCard", card, roomId);
  } else if (!card) {
    console.log("The deck is Empty!!");
  } else {
    console.log("connect to a room first!!");
  }
}

// Meld Deck Logic
function addNewMeldEvent(selectedCards) {
  if (selectedCards.length > 2 && roomId) {
    socket.emit("addNewMeld", selectedCards, roomId);
  } else if (!roomId) {
    console.log("Join a room first!!");
  } else {
    console.log("Meld must contain atleast 3 cards!!!");
  }
}

function addToMeld(oldMeld, newMeld, selectedCards) {
  if (roomId && selectedCards.length > 0) {
    socket.emit("addToMeld", oldMeld, newMeld, selectedCards, roomId);
  } else if (!roomId) {
    console.log("Join a room first!!");
  } else {
    console.log("Select some cards first!!");
  }
}

//Check Turn Function
const functionMap = {
  sendDiscardEvent: sendDiscardEvent,
  sendDeckEvent: sendDeckEvent,
  sendPlayCardEvent: sendPlayCardEvent,
  addNewMeldEvent: addNewMeldEvent,
  addToMeld: addToMeld,
};
export function checkTurn(callbackFuncIdentifier, args) {
  if (roomId) {
    socket.emit("checkTurn", roomId, callbackFuncIdentifier, args);
  } else {
    console.log("Join a Room First!!");
  }
}

socket.on("isTurn", (callbackFuncIdentifier, args) => {
  const callbackFunc = functionMap[callbackFuncIdentifier];
  if (callbackFunc) {
    callbackFunc(...args);
  } else {
    console.log("Invalid function identifier");
  }
});
socket.on("incorrectTurn", () => {
  console.log("Please Wait for your Turn!!");
});

// Winning Condition
socket.on("youWin", () => {
  console.log("You Win!!");
  if (roomId && userToken) socket.emit("userWin", roomId, userToken);
  roomId = null;
  room_content.style.display = "none";
  join_room.style.display = "block";
});
socket.on("youLost", () => {
  socket.emit("userLost", userToken);
  roomId = null;
  room_content.style.display = "none";
  join_room.style.display = "block";
});
socket.on("userWin", (socketId) => {
  console.log(socketId, " won the Game!!!");
  socket.emit("userLost", userToken);
  roomId = null;
  room_content.style.display = "none";
  join_room.style.display = "block";
});
