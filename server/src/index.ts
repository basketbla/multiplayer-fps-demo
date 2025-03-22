import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import path from "path";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 3001);
const app = express();

// Apply CORS middleware
app.use(cors());

// Serve static files from the client's dist directory
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Add Colyseus Monitor
app.use("/monitor", monitor());

// Create HTTP server
const httpServer = createServer(app);

// Create a Colyseus server using the same HTTP server
const server = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Register the game room
server.define("game_room", GameRoom);

// Start the server using the shared HTTP server
httpServer.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
