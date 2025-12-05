require('dotenv').config();
const http = require('http');
const express = require('express');
const app = express();
const cors = require("cors");
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const authRoutes = require("./routes/authRoutes");
const jwt = require("jsonwebtoken");
const Message = require("./schemas/Message");
const channelRoutes = require("./routes/channelRoutes");
const User = require('./schemas/User');
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.FRONTEND_URL;
// Mongo Db Config
const mongoUrl = process.env.mongoUrl;
mongoose.connect(mongoUrl).then(()=>{
  console.log("Connected to MongoDB");
}).catch((err)=>{
  console.log(err);
});

// middlewares
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/channel", channelRoutes);

// Socket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["POST", "GET"],
    credentials: true
  }
});

// SOCKET + AUTH
io.use((client, next) => {
  try {
    let token = client.handshake?.auth?.token;
    if (!token) {
      const authHeader = client.handshake?.headers?.authorization || client.handshake?.headers?.Authorization;
      if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      console.warn("Socket auth failed: token not provided (socket id:", client.id, ")");
      return next(new Error("Auth error: token missing"));
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set!");
      return next(new Error("Server configuration error"));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    client.userId = payload.id;
    return next();
  } catch (err) {
    console.warn("Socket auth failed: invalid token", err && err.message);
    return next(new Error("Auth error: invalid token"));
  }
});

// Socket Connection
io.on("connection", (client) => {
  console.log("User Connected!: ", client.id, " userId:", client.userId);

  // Socket Join Channel
  client.on("join-channel", async ({ channelId }) => {
    try {
      if (!channelId) return;
      client.join(channelId);

      const messages = await Message.find({ channelId })
        .sort({ createdAt: 1 })
        .limit(100);

      client.emit("channel-messages", messages);
    } catch (err) {
      console.error("join-channel error:", err);
      client.emit("error", { message: "Failed to join channel" });
    }
  });

  // Send Message by Socket
  client.on("send-message", async ({ channelId, text, senderName }) => {
    try {
      if (!channelId || !text) return;
      const message = await Message.create({
        channelId,
        senderId: client.userId,
        senderName,
        text,
      });
      io.to(channelId).emit("new-message", message);
    } catch (err) {
      console.error("send-message error:", err);
      client.emit("error", { message: "Failed to send message" });
    }
  });

  // Typing events (optional)
  client.on("typing", ({ channelId }) => {
    if (!channelId) return;
    client.to(channelId).emit("typing", { userId: client.userId });
  });

  client.on("stop-typing", ({ channelId }) => {
    if (!channelId) return;
    client.to(channelId).emit("stop-typing", { userId: client.userId });
  });

  // Disconnect Socket
  client.on("disconnect", (reason) => {
    console.log("User disconnected:", client.id, "userId:", client.userId, "reason:", reason);
  });
});

app.get("/", (req, res) => {
  res.send("Chat Web App Server is Live Now!");
});

server.listen(PORT, () => {
  console.log(`PORT: ${PORT} RUNNING!`);
});
