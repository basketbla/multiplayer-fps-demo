import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { Player } from "../schema/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 16;

  onCreate() {
    this.setState(new GameState());

    // Handle player movement
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.position.x = data.position.x;
        player.position.y = data.position.y;
        player.position.z = data.position.z;
        player.quaternion.x = data.quaternion.x;
        player.quaternion.y = data.quaternion.y;
        player.quaternion.z = data.quaternion.z;
        player.quaternion.w = data.quaternion.w;
      }
    });

    // Handle player jump
    this.onMessage("jump", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // The actual jump physics will be handled client-side with Rapier
        // This just broadcasts the jump event to other clients
        this.broadcast("playerJumped", { id: client.sessionId });
      }
    });

    console.log("GameRoom created!");
  }

  onJoin(client: Client) {
    console.log(`Client joined: ${client.sessionId}`);
    
    // Create a new player
    const player = new Player();
    player.id = client.sessionId;
    
    // Random position on the planet surface
    const radius = 10; // Planet radius
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    player.position.x = radius * Math.sin(phi) * Math.cos(theta);
    player.position.y = radius * Math.sin(phi) * Math.sin(theta);
    player.position.z = radius * Math.cos(phi);
    
    // Add player to the game state
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    console.log(`Client left: ${client.sessionId}`);
    
    // Remove the player from the game state
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("GameRoom disposed!");
  }
}
