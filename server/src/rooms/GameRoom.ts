import { Room, Client } from "colyseus";
import { GameRoomState, Player, Vector3 } from "../schema/GameState";

export class GameRoom extends Room<GameRoomState> {
  maxClients = 16;

  onCreate() {
    console.log("Game room created!");
    
    // Initialize room state
    this.setState(new GameRoomState());

    // Handle player movement
    this.onMessage("move", (client, data: { position: { x: number, y: number, z: number }, rotation: { y: number } }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Update player position
        player.position.x = data.position.x;
        player.position.z = data.position.z;
        
        // Only update Y position if jumping
        if (player.isJumping) {
          player.position.y = data.position.y;
        }
        
        // Update player rotation (only Y rotation for looking left/right)
        player.rotation.y = data.rotation.y;
      }
    });

    // Handle player jumping
    this.onMessage("jump", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isJumping) {
        console.log(`Player ${client.sessionId} jumped`);
        player.isJumping = true;
        player.jumpTime = 0;
        
        // Schedule jump updates
        const updateJump = () => {
          if (player && player.isJumping) {
            player.jumpTime += 0.1; // Increment by 0.1 seconds
            
            // End jump after 1 second
            if (player.jumpTime >= 1.0) {
              player.isJumping = false;
              player.position.y = 0; // Reset to ground level
            } else {
              // Schedule next update
              this.clock.setTimeout(updateJump, 100);
            }
          }
        };
        
        // Start the jump update cycle
        this.clock.setTimeout(updateJump, 100);
      }
    });
  }

  onJoin(client: Client) {
    console.log(`Player ${client.sessionId} joined the game`);
    
    // Create a new player at a random position on the flat plane
    const player = new Player(
      client.sessionId,
      new Vector3(
        (Math.random() - 0.5) * 20, // Random X position
        0,                          // Y position (on the ground)
        (Math.random() - 0.5) * 20  // Random Z position
      ),
      new Vector3(0, Math.random() * Math.PI * 2, 0) // Random Y rotation
    );
    
    // Add player to the game state
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    console.log(`Player ${client.sessionId} left the game`);
    
    // Remove player from the game state
    this.state.players.delete(client.sessionId);
  }
}
