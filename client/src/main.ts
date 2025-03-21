import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Client, Room } from 'colyseus.js';
import { GameState, Planet, Player, Vector3 } from './types';

// Set up the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Add stars to the background
addStars();

// Set up the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Add directional light (sun-like)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Connect to the Colyseus server
const client = new Client('ws://localhost:3000');
let room: Room | null = null;
const planets: Map<string, THREE.Mesh> = new Map();
const players: Map<string, THREE.Group> = new Map();
let localPlayer: {
  id: string;
  mesh: THREE.Group;
  onPlanet: boolean;
  planetId: string;
  angle: number;
} | null = null;

// Game state
let keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  space: false,
  shift: false
};

// Connect to the game room
async function connectToServer() {
  try {
    room = await client.joinOrCreate<any>('game_room');
    console.log('Connected to server!');
    
    // Handle room state changes
    room.onStateChange((state: any) => {
      // Update planets
      if (state.planets && state.planets.forEach) {
        state.planets.forEach((planet: Planet) => {
          createPlanet(planet);
        });
      }
      
      // Update players
      if (state.players && state.players.forEach) {
        state.players.forEach((player: Player, key: string) => {
          if (!players.has(player.id)) {
            createPlayer(player);
          } else {
            updatePlayer(player);
          }
        });
      }
    });
    
    // Handle player removal
    if (room.state && room.state.players && room.state.players.onRemove) {
      room.state.players.onRemove((player: Player, sessionId: string) => {
        removePlayer(sessionId);
      });
    }
    
    // Set up input handlers
    setupInputHandlers();
    
  } catch (error) {
    console.error('Could not connect to server:', error);
  }
}

// Create a planet
function createPlanet(planet: Planet): void {
  if (planets.has(planet.id)) return;
  
  const geometry = new THREE.SphereGeometry(planet.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: planet.color,
    roughness: 0.7,
    metalness: 0.1
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
  
  scene.add(mesh);
  planets.set(planet.id, mesh);
}

// Create a player
function createPlayer(player: Player): void {
  if (players.has(player.id)) return;
  
  // Create player model - a simple character with body and head
  const group = new THREE.Group();
  
  // Body (cone shape)
  const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: player.id === room?.sessionId ? 0x00ff00 : 0xff0000,
    roughness: 0.5,
    metalness: 0.5
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.75;
  group.add(body);
  
  // Head (sphere)
  const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: player.id === room?.sessionId ? 0x00dd00 : 0xdd0000,
    roughness: 0.5,
    metalness: 0.5
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.85;
  group.add(head);
  
  // Position the player
  group.position.set(player.position.x, player.position.y, player.position.z);
  
  scene.add(group);
  players.set(player.id, group);
  
  // If this is the local player, store a reference
  if (player.id === room?.sessionId) {
    localPlayer = {
      id: player.id,
      mesh: group,
      onPlanet: player.onPlanet,
      planetId: player.planetId,
      angle: player.angle
    };
  }
}

// Update player position
function updatePlayer(player: Player): void {
  const playerMesh = players.get(player.id);
  if (playerMesh) {
    playerMesh.position.set(player.position.x, player.position.y, player.position.z);
    playerMesh.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z);
    
    // Update local player data
    if (player.id === room?.sessionId && localPlayer) {
      localPlayer.onPlanet = player.onPlanet;
      localPlayer.planetId = player.planetId;
      localPlayer.angle = player.angle;
    }
  }
}

// Remove a player
function removePlayer(playerId: string): void {
  const playerMesh = players.get(playerId);
  if (playerMesh) {
    scene.remove(playerMesh);
    players.delete(playerId);
  }
}

// Set up input handlers
function setupInputHandlers(): void {
  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = true;
        break;
      case 'Space':
        keys.space = true;
        // If on a planet, take off
        if (localPlayer && localPlayer.onPlanet && room) {
          room.send('takeoff');
        }
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.shift = true;
        // If near a planet, land on it
        if (localPlayer && !localPlayer.onPlanet) {
          tryLandOnPlanet();
        }
        break;
    }
  });
  
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'Space':
        keys.space = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.shift = false;
        break;
    }
  });
}

// Try to land on a nearby planet
function tryLandOnPlanet(): void {
  if (!localPlayer || !room) return;
  
  let closestPlanet: any = null;
  let closestDistance = Infinity;
  
  // Find the closest planet
  planets.forEach((planetMesh, planetId) => {
    const distance = localPlayer!.mesh.position.distanceTo(planetMesh.position);
    
    // Find the planet in the room state
    let planet: any = null;
    if (room && room.state && room.state.planets) {
      // Handle different ways the planets might be stored in the state
      if (typeof room.state.planets.find === 'function') {
        planet = room.state.planets.find((p: any) => p.id === planetId);
      } else if (typeof room.state.planets.get === 'function') {
        planet = room.state.planets.get(planetId);
      } else if (room.state.planets[planetId]) {
        planet = room.state.planets[planetId];
      }
    }
    
    // Check if we're close enough to land (within 3 units of the surface)
    if (planet && typeof planet.radius === 'number') {
      const landingDistance = distance - planet.radius;
      if (landingDistance < 3 && landingDistance < closestDistance) {
        closestDistance = landingDistance;
        closestPlanet = planet;
      }
    }
  });
  
  // Land on the closest planet
  if (closestPlanet && closestPlanet.id && room) {
    const planetMesh = planets.get(closestPlanet.id);
    if (planetMesh && localPlayer) {
      // Calculate landing position on the planet surface
      const direction = new THREE.Vector3()
        .subVectors(localPlayer.mesh.position, planetMesh.position)
        .normalize();
      
      const landingPosition = new THREE.Vector3()
        .copy(planetMesh.position)
        .add(direction.multiplyScalar(closestPlanet.radius + 0.5));
      
      // Send landing message to server
      room.send('land', {
        planetId: closestPlanet.id,
        position: {
          x: landingPosition.x,
          y: landingPosition.y,
          z: landingPosition.z
        }
      });
    }
  }
}

// Handle player movement
function handlePlayerMovement(deltaTime: number): void {
  if (!localPlayer || !room) return;
  
  if (localPlayer.onPlanet) {
    // Walking on planet surface
    let angleChange = 0;
    
    if (keys.forward) angleChange += 1;
    if (keys.backward) angleChange -= 1;
    if (keys.left) angleChange += 0.5;
    if (keys.right) angleChange -= 0.5;
    
    if (angleChange !== 0) {
      // Update angle for walking around the planet
      localPlayer.angle += angleChange * deltaTime;
      
      // Send walk message to server
      room.send('walk', { angle: localPlayer.angle });
    }
  } else {
    // Flying in space
    const moveSpeed = 10 * deltaTime;
    const rotateSpeed = 2 * deltaTime;
    
    // Get the camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Calculate movement direction
    const movement = new THREE.Vector3(0, 0, 0);
    
    if (keys.forward) movement.add(cameraDirection.clone().multiplyScalar(moveSpeed));
    if (keys.backward) movement.add(cameraDirection.clone().multiplyScalar(-moveSpeed));
    
    const right = new THREE.Vector3()
      .crossVectors(cameraDirection, camera.up)
      .normalize();
    
    if (keys.right) movement.add(right.clone().multiplyScalar(moveSpeed));
    if (keys.left) movement.add(right.clone().multiplyScalar(-moveSpeed));
    
    if (movement.length() > 0) {
      // Apply movement to player position
      localPlayer.mesh.position.add(movement);
      
      // Send position update to server
      room.send('move', {
        position: {
          x: localPlayer.mesh.position.x,
          y: localPlayer.mesh.position.y,
          z: localPlayer.mesh.position.z
        },
        rotation: {
          x: localPlayer.mesh.rotation.x,
          y: localPlayer.mesh.rotation.y,
          z: localPlayer.mesh.rotation.z
        }
      });
    }
  }
}

// Add stars to the background
function addStars(): void {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1
  });
  
  const starsVertices = [];
  for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starsVertices.push(x, y, z);
  }
  
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Connect to the server
connectToServer();

// Clock for delta time calculation
const clock = new THREE.Clock();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = clock.getDelta();
  
  // Update controls
  controls.update();
  
  // Handle player movement
  handlePlayerMovement(deltaTime);
  
  // Rotate planets
  planets.forEach((planet) => {
    planet.rotation.y += 0.001;
  });
  
  // Update camera to follow player if on a planet
  if (localPlayer && localPlayer.onPlanet) {
    // Set camera to follow the player from behind
    const offset = new THREE.Vector3(0, 3, 5);
    const playerPos = localPlayer.mesh.position.clone();
    
    camera.position.copy(playerPos).add(offset);
    camera.lookAt(playerPos);
  }
  
  renderer.render(scene, camera);
}

animate();
