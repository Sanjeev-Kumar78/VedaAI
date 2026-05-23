import type http from "node:http";
import { Server } from "socket.io";
import { createRedisConnection } from "../../config/redis.js";
import { env } from "../../config/env.js";

export function attachSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      methods: ["GET", "POST"]
    }
  });

  const redisSubscriber = createRedisConnection();
  
  redisSubscriber.subscribe("vedaai_events", (err) => {
    if (err) console.error("Redis Subscribe Error:", err);
    else console.log("Subscribed to vedaai_events channel.");
  });

  redisSubscriber.on("message", (channel, message) => {
    if (channel === "vedaai_events") {
      try {
        const payload = JSON.parse(message);
        io.emit(payload.type, payload);
      } catch (e) {
        console.error("Failed to parse redis message", e);
      }
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected via socket.io");
    socket.emit("connected", { status: "ok" });
  });

  return io;
}
