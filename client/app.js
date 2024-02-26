const socket = io("http://localhost:3000/");
const btn = document.getElementById("btn");
btn.addEventListener("click", () => {
  socket.emit("btnClicked", "asdafdsf");
});
