const socket = io("http://localhost:3000/");
const Joinbtn = document.getElementById("btn");
const Sendbtn = document.getElementById("btn2");
const Input = document.getElementById("msg");
let roomId;
Joinbtn.addEventListener("click", () => {
  if (!roomId) socket.emit("joinButtonClicked");
  else console.log("you are already in a room");
});
Sendbtn.addEventListener("click", () => {
  const msg = Input.value;
  if (roomId) socket.emit("btnClicked", roomId, msg);
  else console.log("Join a room first");
  Input.value = "";
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
socket.on("clicked", (userId, msg) => {
  console.log(`User: ${userId} sent the msg: ${msg}`);
});
