import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 3001);
const app = express();

app.use(cors());
app.use(express.json());

// Colyseus monitor route
app.use("/colyseus", monitor());

const gameServer = new Server({
  server: createServer(app)
});

// Register the game room
gameServer.define("game_room", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`🚀 Game server is running on http://localhost:${port}`);
}).catch(err => {
  console.error(err);
});
