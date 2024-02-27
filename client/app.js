const socket = io("http://localhost:3000/");
const Joinbtn = document.getElementById("btn");
const Clickbtn = document.getElementById("btn2");
let roomId;
Joinbtn.addEventListener("click", () => {
  if (!roomId) socket.emit("joinButtonClicked");
  else console.log("you are already in a room");
});
Clickbtn.addEventListener("click", () => {
  if (roomId) socket.emit("btnClicked", roomId);
  else console.log("Join a room first");
});

socket.on("joinRoom", (room_id) => {
  console.log("Received room ID:", room_id);
  roomId = room_id;
  console.log("changed: ", roomId);
  socket.emit("join", roomId);
});
socket.on("joined", (roomId) => {
  console.log("Successfully joined room:", roomId);
});
socket.on("clicked", (userId) => {
  console.log(`User: ${userId} clicked the Btn!!!!`);
});
