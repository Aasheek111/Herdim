import io from "socket.io-client";
const socket=io("https://herdim.onrender.com/");
// const socket=io("http://localhost:3000")

//https://herdim-backend.onrender.com/       http://localhost:3000

export default socket;