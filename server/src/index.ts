import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import { GameState, Planet, Player, SocketEvents, Vector3 } from './types';

const port = Number(process.env.PORT || 3000);
const app = express();

app.use(cors());
app.use(express.json());

// Initial game state with planets
const gameState: GameState = {
  planets: [
    {
      id: 'planet1',
      name: 'Earth',
      position: { x: 0, y: 0, z: 0 },
      radius: 5,
      color: '#2233ff'
    },
    {
      id: 'planet2',
      name: 'Mars',
      position: { x: 15, y: 0, z: 15 },
      radius: 3,
      color: '#ff3300'
    },
    {
      id: 'planet3',
      name: 'Venus',
      position: { x: -15, y: 0, z: -15 },
      radius: 4,
      color: '#ffcc00'
    }
  ],
  players: {}
};

// Create HTTP & WebSocket servers
const server = http.createServer(app);
const gameServer = new Server({
  server,
});

// Register room handlers
gameServer.define('game_room', GameRoom);

// Register colyseus monitor (development only)
app.use('/colyseus', monitor());

// Start the server
gameServer.listen(port);
console.log(`Server running on http://localhost:${port}`);
