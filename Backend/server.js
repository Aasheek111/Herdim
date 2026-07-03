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

const roomUsers = {};

function getRoomUsers(room) {
  return Object.values(roomUsers[room] || {});
}

function sendRoomUsers(room) {
  io.to(room).emit("room-users", getRoomUsers(room));
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("chat", ({ user, message, to }) => {
    console.log("Message:", message);
    const chatMessage = {
      user: { ...user, id: socket.id },
      message,
      to: to || null,
      from: socket.id,
    };

    if (to) {
      io.to(to).emit("chat", chatMessage);
      socket.emit("chat", chatMessage);
    } else {
      io.to(user.room).emit("chat", chatMessage);
    }
  });

  socket.on("joined", (user) => {
    const joinedUser = {
      id: socket.id,
      name: user.name,
      room: user.room,
      picture: user.picture || "",
    };

    socket.join(user.room);
    socket.data.user = joinedUser;

    if (!roomUsers[user.room]) {
      roomUsers[user.room] = {};
    }

    roomUsers[user.room][socket.id] = joinedUser;
    console.log(`${user.name} Joined the Room`);
    io.to(user.room).emit("joined", joinedUser);
    sendRoomUsers(user.room);
  });

  socket.on("call-user", ({ to, from }) => {
    io.to(to).emit("call-user", { from: { ...from, id: socket.id } });
  });

  socket.on("accept-call", ({ to, from }) => {
    io.to(to).emit("accept-call", { from: { ...from, id: socket.id } });
  });

  socket.on("end-call", ({ to, from }) => {
    io.to(to).emit("end-call", { from: { ...from, id: socket.id } });
  });

  socket.on("candidate", ({ candidate, to }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("disconnect", () => {
    const user = socket.data.user;

    if (user && roomUsers[user.room]) {
      delete roomUsers[user.room][socket.id];
      socket.to(user.room).emit("left", user);
      sendRoomUsers(user.room);
    }

    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Running on port 3000");
});
