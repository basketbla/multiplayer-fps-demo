import { Room, Client } from "colyseus";
import { GameRoomState, Player, Vector3 } from "../schema/GameState";

export class GameRoom extends Room<GameRoomState> {
  maxClients = 16;

  onCreate() {
    console.log("Game room created!");
    
    // Initialize room state
    this.setState(new GameRoomState());

    // Handle player movement
    this.onMessage("move", (client, data: { position: { x: number, y: number, z: number }, rotation: { x: number, y: number, z: number } }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.onPlanet) {
        // Update player position and rotation
        player.position.x = data.position.x;
        player.position.y = data.position.y;
        player.position.z = data.position.z;
        
        player.rotation.x = data.rotation.x;
        player.rotation.y = data.rotation.y;
        player.rotation.z = data.rotation.z;
      }
    });

    // Handle player landing on planet
    this.onMessage("land", (client, data: { planetId: string, position: { x: number, y: number, z: number } }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Land on the planet
        player.onPlanet = true;
        player.planetId = data.planetId;
        
        // Set position on the planet surface
        player.position.x = data.position.x;
        player.position.y = data.position.y;
        player.position.z = data.position.z;
        
        // Calculate initial angle based on position
        const planet = this.state.planets.find(p => p.id === data.planetId);
        if (planet) {
          const dx = player.position.x - planet.position.x;
          const dz = player.position.z - planet.position.z;
          player.angle = Math.atan2(dz, dx);
        }
        
        console.log(`Player ${client.sessionId} landed on planet ${data.planetId}`);
      }
    });

    // Handle player leaving planet
    this.onMessage("takeoff", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.onPlanet) {
        // Take off from the planet
        player.onPlanet = false;
        
        // Get the planet
        const planet = this.state.planets.find(p => p.id === player.planetId);
        if (planet) {
          // Calculate takeoff direction (away from planet center)
          const dx = player.position.x - planet.position.x;
          const dy = player.position.y - planet.position.y;
          const dz = player.position.z - planet.position.z;
          
          // Normalize direction
          const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const nx = dx / length;
          const ny = dy / length;
          const nz = dz / length;
          
          // Move player slightly away from the planet
          player.position.x += nx * 2;
          player.position.y += ny * 2;
          player.position.z += nz * 2;
          
          console.log(`Player ${client.sessionId} took off from planet ${player.planetId}`);
          player.planetId = "";
        }
      }
    });

    // Handle player walking on planet surface
    this.onMessage("walk", (client, data: { angle: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.onPlanet) {
        // Update player angle for walking around the planet
        player.angle = data.angle;
        
        // Get the planet
        const planet = this.state.planets.find(p => p.id === player.planetId);
        if (planet) {
          // Calculate new position based on angle and planet radius
          const x = planet.position.x + Math.cos(player.angle) * (planet.radius + 0.5);
          const z = planet.position.z + Math.sin(player.angle) * (planet.radius + 0.5);
          
          // Update player position
          player.position.x = x;
          player.position.z = z;
          
          // Calculate y position (height) based on planet radius
          // This assumes the planet is a perfect sphere
          const dx = x - planet.position.x;
          const dz = z - planet.position.z;
          const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
          const y = planet.position.y + Math.sqrt(Math.pow(planet.radius + 0.5, 2) - Math.pow(horizontalDistance, 2));
          player.position.y = y;
          
          // Update player rotation to stand on the planet surface
          // Make the player face the direction of movement
          player.rotation.y = player.angle + Math.PI / 2;
          
          // Tilt the player to stand perpendicular to the planet surface
          const tiltAngle = Math.atan2(y - planet.position.y, horizontalDistance);
          player.rotation.x = Math.PI / 2 - tiltAngle;
        }
      }
    });
  }

  onJoin(client: Client) {
    console.log(`Player ${client.sessionId} joined the game`);
    
    // Create a new player at a random position
    const player = new Player(
      client.sessionId,
      new Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ),
      new Vector3(0, 0, 0)
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
