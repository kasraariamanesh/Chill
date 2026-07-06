import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { RoomDetails, ChatMessage, VideoState, FileMetadata, UserInfo } from "./src/types.js";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = process.env.PORT || 3000;

  // In-memory Room Storage
  const rooms = new Map<string, RoomDetails & { password?: string }>();

  // API Routes (can be placed here before Vite middleware)
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: Date.now() });
  });

  // Socket.io Connection Logic
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join room with password and username
    socket.on("join-room", ({ roomId, password, username }, callback) => {
      if (!roomId || !username) {
        return callback({ error: "Room ID and Username are required." });
      }

      // Convert Room ID to uppercase for cleaner experience
      const formattedRoomId = roomId.trim().toUpperCase();
      const trimmedUsername = username.trim();

      let room = rooms.get(formattedRoomId);

      if (!room) {
        // Create new room
        room = {
          roomId: formattedRoomId,
          password: password ? password.trim() : undefined,
          users: [],
          messages: [],
          status: "lobby",
        };
        rooms.set(formattedRoomId, room);
      } else {
        // Room exists, verify password if room has a password
        if (room.password && room.password !== (password ? password.trim() : "")) {
          return callback({ error: "Invalid password for this room." });
        }

        // Limit to 2 users (designed specifically for partners / couples)
        if (room.users.length >= 2) {
          // Check if this socket is already in the room
          const exists = room.users.some(u => u.id === socket.id);
          if (!exists) {
            return callback({ error: "Room is full. Chill is designed for up to 2 people." });
          }
        }
      }

      // Join socket room
      socket.join(formattedRoomId);

      // Add user to room details
      const isHost = room.users.length === 0;
      const newUser: UserInfo = {
        id: socket.id,
        username: trimmedUsername,
        isReady: false,
        isHost,
      };

      // Remove any previous session of this socket from room users to avoid duplication
      room.users = room.users.filter(u => u.id !== socket.id);
      room.users.push(newUser);

      // Save updated room state
      rooms.set(formattedRoomId, room);

      // Inform other users in room
      socket.to(formattedRoomId).emit("user-joined", {
        user: newUser,
        systemMessage: `🎬 ${trimmedUsername} joined the Chill room!`,
      });

      console.log(`${trimmedUsername} joined room: ${formattedRoomId}`);

      // Return room details to joining user
      const { password: _, ...safeRoomDetails } = room;
      callback({ room: safeRoomDetails });
    });

    // Handle file selection (users select local files or host shares magnet)
    socket.on("file-selected", ({ roomId, fileMetadata }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      const room = rooms.get(formattedRoomId);
      if (!room) return;

      room.currentVideo = fileMetadata;

      // Update user status
      const user = room.users.find(u => u.id === socket.id);
      if (user) {
        user.isReady = true;
      }

      rooms.set(formattedRoomId, room);

      // Broadcast file selected event
      io.to(formattedRoomId).emit("file-selected-update", {
        userId: socket.id,
        username: user?.username || "Partner",
        fileMetadata,
        roomUsers: room.users,
      });
    });

    socket.on("start-cinema", ({ roomId }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      const room = rooms.get(formattedRoomId);
      if (room) {
        room.status = "theater";
      }
      socket.to(formattedRoomId).emit("start-cinema-broadcast");
    });

    // WebRTC Signaling for Voice Chat
    socket.on("webrtc-signal", ({ roomId, signal, to }) => {
      if (to) {
        io.to(to).emit("webrtc-signal", { signal, from: socket.id });
      } else {
        const formattedRoomId = roomId?.trim().toUpperCase();
        socket.to(formattedRoomId).emit("webrtc-signal", { signal, from: socket.id });
      }
    });

    socket.on("guest-ready-for-webrtc-send", ({ roomId }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      socket.to(formattedRoomId).emit("guest-ready-for-webrtc");
    });

    // Handle play, pause, seek event synchronization
    socket.on("video-sync", ({ roomId, state }: { roomId: string; state: VideoState }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      const room = rooms.get(formattedRoomId);
      if (!room) return;

      // Update video state
      room.videoState = state;
      rooms.set(formattedRoomId, room);

      // Broadcast sync event to everyone else in the room
      socket.to(formattedRoomId).emit("video-sync-receive", {
        state,
        senderId: socket.id,
      });
    });

    // Handle buffering state changes
    socket.on("buffering-status", ({ roomId, isBuffering }: { roomId: string; isBuffering: boolean }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      socket.to(formattedRoomId).emit("partner-buffering-update", {
        userId: socket.id,
        isBuffering,
      });
    });

    socket.on("host-time-update", ({ roomId, currentTime, duration }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      socket.to(formattedRoomId).emit("host-time-update-receive", { currentTime, duration });
    });

    // Handle subtitle file change notification
    socket.on("subtitle-status", ({ roomId, filename }: { roomId: string; filename: string }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      socket.to(formattedRoomId).emit("partner-subtitle-update", {
        userId: socket.id,
        filename,
      });
    });

    // Handle quick reactions
    socket.on("send-reaction", ({ roomId, reaction }: { roomId: string; reaction: string }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      socket.to(formattedRoomId).emit("reaction-receive", {
        reaction,
        senderId: socket.id,
      });
    });

    // Handle chat message
    socket.on("send-message", ({ roomId, text }, callback) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      const room = rooms.get(formattedRoomId);
      if (!room) return callback({ error: "Room not found." });

      const user = room.users.find(u => u.id === socket.id);
      if (!user) return callback({ error: "User not in room." });

      const messageId = Math.random().toString(36).substring(2, 9);
      const newMessage: ChatMessage = {
        id: messageId,
        username: user.username,
        text: text.trim(),
        timestamp: Date.now(),
      };

      room.messages.push(newMessage);
      // Keep only last 50 messages
      if (room.messages.length > 50) {
        room.messages.shift();
      }

      rooms.set(formattedRoomId, room);

      // Broadcast message to everyone in the room
      io.to(formattedRoomId).emit("message-receive", newMessage);
      callback({ success: true });
    });

    // Handle heartbeat/latency tracking between the 2 clients
    socket.on("latency-ping", ({ roomId, time }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      // Forward ping back to calculate roundtrip
      socket.emit("latency-pong", { time });
    });

    // Handle partner connection check / force alignment
    socket.on("request-partner-time", ({ roomId }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      socket.to(formattedRoomId).emit("request-partner-time-query", { requesterId: socket.id });
    });

    socket.on("respond-partner-time", ({ roomId, requesterId, currentTime, isPlaying }) => {
      const formattedRoomId = roomId?.trim().toUpperCase();
      io.to(requesterId).emit("respond-partner-time-result", { currentTime, isPlaying });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // Find room user was in
      rooms.forEach((room, formattedRoomId) => {
        const index = room.users.findIndex(u => u.id === socket.id);
        if (index !== -1) {
          const removedUser = room.users[index];
          room.users.splice(index, 1);

          if (room.users.length === 0) {
            // Clean up room if no users left
            rooms.delete(formattedRoomId);
            console.log(`Room ${formattedRoomId} deleted because it is empty.`);
          } else {
            // Inform remaining user
            rooms.set(formattedRoomId, room);
            io.to(formattedRoomId).emit("user-left", {
              userId: socket.id,
              username: removedUser.username,
              systemMessage: `👋 ${removedUser.username} left the Chill room.`,
              roomUsers: room.users,
            });
          }
        }
      });
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (typeof PORT === "string" && (PORT.startsWith("/") || PORT.startsWith("\\"))) {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Chill Watch Server listening on Passenger Unix socket: ${PORT}`);
    });
  } else {
    httpServer.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`🚀 Chill Watch Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
