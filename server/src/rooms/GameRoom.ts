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
          // We add a small offset to the radius to place the player slightly above the surface
          const planetRadius = planet.radius;
          const playerHeight = 0.5; // Height of player above planet surface
          
          // Calculate new position based on spherical coordinates
          const phi = player.angle; // Horizontal angle (longitude)
          const theta = Math.PI / 2; // Vertical angle (latitude) - at equator
          
          // Convert spherical to Cartesian coordinates
          const x = planet.position.x + (planetRadius + playerHeight) * Math.sin(theta) * Math.cos(phi);
          const y = planet.position.y + (planetRadius + playerHeight) * Math.cos(theta);
          const z = planet.position.z + (planetRadius + playerHeight) * Math.sin(theta) * Math.sin(phi);
          
          // Update player position
          player.position.x = x;
          player.position.y = y;
          player.position.z = z;
          
          // Update player rotation to stand on the planet surface
          // Make the player face the direction of movement (tangent to the planet surface)
          player.rotation.y = player.angle + Math.PI / 2;
          
          // Calculate the normal vector (pointing from planet center to player)
          const normalX = player.position.x - planet.position.x;
          const normalY = player.position.y - planet.position.y;
          const normalZ = player.position.z - planet.position.z;
          
          // Normalize the normal vector
          const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
          const normalizedX = normalX / normalLength;
          const normalizedY = normalY / normalLength;
          const normalizedZ = normalZ / normalLength;
          
          // Calculate rotation to align player with the normal vector
          // This makes the player stand perpendicular to the planet surface
          const upVector = new Vector3(0, 1, 0); // Default up direction
          
          // We need to rotate the player to align with the normal vector
          // This is a simplified approach - in a full implementation, you'd use quaternions
          const tiltX = Math.acos(normalizedY) - Math.PI / 2;
          const tiltZ = Math.atan2(normalizedX, normalizedZ);
          
          player.rotation.x = tiltX;
          player.rotation.z = tiltZ;
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
