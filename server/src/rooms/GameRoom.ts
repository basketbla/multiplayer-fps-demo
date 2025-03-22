import { Room, Client } from "@colyseus/core";
import { GameRoomState, Player, Projectile } from "../schema/GameRoomState";
import { PlayerAnimation, PlayerInput, ProjectileInput } from "../../../shared/types";

export class GameRoom extends Room<GameRoomState> {
  private projectileIdCounter: number = 0;
  private readonly PROJECTILE_LIFETIME_MS = 10000; // 10 seconds

  onCreate() {
    this.setState(new GameRoomState());

    // Handle player movement and rotation updates
    this.onMessage("player:move", (client, message: PlayerInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Update player position
      player.position.x = message.position.x;
      player.position.y = message.position.y;
      player.position.z = message.position.z;

      // Update player rotation
      player.rotation.x = message.rotation.x;
      player.rotation.y = message.rotation.y;
      player.rotation.z = message.rotation.z;
      player.rotation.w = message.rotation.w;

      // Update animation state
      player.animation = message.animation;
    });

    // Handle projectile creation
    this.onMessage("projectile:create", (client, message: ProjectileInput) => {
      const projectileId = `${client.sessionId}_${this.projectileIdCounter++}`;
      const projectile = new Projectile(projectileId, client.sessionId);

      // Set projectile position
      projectile.position.x = message.position.x;
      projectile.position.y = message.position.y;
      projectile.position.z = message.position.z;

      // Set projectile direction
      projectile.direction.x = message.direction.x;
      projectile.direction.y = message.direction.y;
      projectile.direction.z = message.direction.z;

      // Set projectile color
      projectile.color = message.color;

      // Add projectile to state
      this.state.projectiles.set(projectileId, projectile);

      // Remove projectile after a certain time
      setTimeout(() => {
        if (this.state.projectiles.has(projectileId)) {
          this.state.projectiles.delete(projectileId);
        }
      }, this.PROJECTILE_LIFETIME_MS);
    });

    // Set up a regular cleanup for projectiles
    this.setSimulationInterval(() => this.cleanupProjectiles(), 1000);
  }

  onJoin(client: Client) {
    console.log(`Client joined: ${client.sessionId}`);
    
    // Create a new player
    const player = new Player(client.sessionId);
    
    // Set initial position (random position within the arena)
    player.position.x = (Math.random() * 40) - 20; // -20 to 20
    player.position.y = 1;
    player.position.z = (Math.random() * 40) - 20; // -20 to 20
    
    // Set initial animation
    player.animation = PlayerAnimation.IDLE;
    
    // Add player to the room state
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    console.log(`Client left: ${client.sessionId}`);
    
    // Remove player from the room state
    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId);
    }
    
    // Clean up any projectiles owned by this player
    this.cleanupPlayerProjectiles(client.sessionId);
  }

  private cleanupProjectiles() {
    const now = Date.now();
    
    // Remove projectiles that have exceeded their lifetime
    this.state.projectiles.forEach((projectile, key) => {
      if (now - projectile.timestamp > this.PROJECTILE_LIFETIME_MS) {
        this.state.projectiles.delete(key);
      }
    });
  }

  private cleanupPlayerProjectiles(playerId: string) {
    // Remove all projectiles owned by the player who left
    this.state.projectiles.forEach((projectile, key) => {
      if (projectile.ownerId === playerId) {
        this.state.projectiles.delete(key);
      }
    });
  }
}
