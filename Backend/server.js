const express = require("express");
const app = express();
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const server = new createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "https://herdim.vercel.app",
    origin: "http://localhost:5173",
    
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.get("/", (req, res) => {
  res.send("It's all Guddu");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("chat", ({ user, message }) => {
    console.log("Message:", message);
    io.emit("chat", { user, message });
  });

  socket.on("joined", (user) => {
    console.log(`${user} Joined the Room`);
    io.emit("joined", user);
  });

  socket.on("candidate", (candidate) => {
    socket.broadcast.emit("candidate", candidate);
  });

  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });
});

server.listen(3000, () => {
  console.log("Running on port 3000");
});
