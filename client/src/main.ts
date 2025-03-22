import { Client, Room } from "colyseus.js";
import * as THREE from "three";
import { Player } from "./types";

// Set up the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Set up the camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Add directional light (sun-like)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Create a flat ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x228b22, // Forest green
  roughness: 0.8,
  metalness: 0.2,
  side: THREE.DoubleSide,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2; // Rotate to be horizontal
ground.position.y = 0; // Position at y=0
scene.add(ground);

// Add some decorative elements to the scene
addSceneElements();

// Connect to the Colyseus server
const client = new Client("ws://localhost:3000");
let room: Room | null = null;
const players: Map<string, THREE.Group> = new Map();
let localPlayer: {
  id: string;
  mesh: THREE.Group;
  isJumping: boolean;
} | null = null;

// Game state
let keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
};

// Mouse state for camera control
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;
let isMouseLocked = false;
let playerRotation = 0; // Track player rotation separately

// Connect to the game room
async function connectToServer() {
  try {
    room = await client.joinOrCreate<any>("game_room");
    console.log("Connected to server!");

    // Handle room state changes
    room.onStateChange((state: any) => {
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
    console.error("Could not connect to server:", error);
  }
}

// Create a player
function createPlayer(player: Player): void {
  if (players.has(player.id)) return;

  // Create player model - a simple character with body and head
  const group = new THREE.Group();

  // Body (cube shape)
  const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 1);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: player.id === room?.sessionId ? 0x00ff00 : 0xff0000,
    roughness: 0.5,
    metalness: 0.5,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.75;
  group.add(body);

  // Head (sphere)
  const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: player.id === room?.sessionId ? 0x00dd00 : 0xdd0000,
    roughness: 0.5,
    metalness: 0.5,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.85;
  group.add(head);

  // Position the player
  group.position.set(player.position.x, player.position.y, player.position.z);
  group.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z);

  scene.add(group);
  players.set(player.id, group);

  // If this is the local player, store a reference
  if (player.id === room?.sessionId) {
    localPlayer = {
      id: player.id,
      mesh: group,
      isJumping: player.isJumping,
    };
  }
}

// Update player position
function updatePlayer(player: Player): void {
  const playerMesh = players.get(player.id);
  if (playerMesh) {
    playerMesh.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );
    playerMesh.rotation.set(
      player.rotation.x,
      player.rotation.y,
      player.rotation.z
    );

    // Update local player data
    if (player.id === room?.sessionId && localPlayer) {
      localPlayer.isJumping = player.isJumping;
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

// Add decorative elements to the scene
function addSceneElements(): void {
  // Add some trees
  for (let i = 0; i < 20; i++) {
    const treeGroup = new THREE.Group();

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      roughness: 0.8,
      metalness: 0.2,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    treeGroup.add(trunk);

    // Tree top (cone)
    const topGeometry = new THREE.ConeGeometry(2, 4, 8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x006400, // Dark green
      roughness: 0.8,
      metalness: 0.2,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 5;
    treeGroup.add(top);

    // Position the tree randomly on the ground
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    treeGroup.position.set(x, 0, z);

    scene.add(treeGroup);
  }

  // Add some rocks
  for (let i = 0; i < 30; i++) {
    const rockGeometry = new THREE.DodecahedronGeometry(
      Math.random() * 0.5 + 0.5, // Random size
      0 // No subdivisions
    );
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      roughness: 0.9,
      metalness: 0.1,
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);

    // Position the rock randomly on the ground
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    rock.position.set(x, 0.5, z);

    // Random rotation
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(rock);
  }

  // Add a distant mountain range for scenery
  const mountainGeometry = new THREE.ConeGeometry(20, 30, 4);
  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x4682b4, // Steel blue
    roughness: 0.9,
    metalness: 0.1,
  });

  for (let i = 0; i < 5; i++) {
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    const angle = (i / 5) * Math.PI * 2;
    const distance = 80;

    mountain.position.set(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );

    scene.add(mountain);
  }
}

// Set up input handlers
function setupInputHandlers(): void {
  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = true;
        break;
      case "Space":
        if (!keys.jump) { // Only trigger jump if not already jumping
          keys.jump = true;
          if (localPlayer && !localPlayer.isJumping && room) {
            console.log("Sending jump command to server");
            room.send("jump", {});
          }
        }
        break;
      case "Escape":
        toggleMouseLock();
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = false;
        break;
      case "Space":
        keys.jump = false;
        break;
    }
  });

  // Mouse controls for camera
  document.addEventListener("mousemove", (e) => {
    if (isMouseLocked) {
      // Convert mouse movement to rotation change
      playerRotation -= e.movementX * 0.003;
      targetMouseY -= e.movementY * 0.003;

      // Limit vertical look
      targetMouseY = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, targetMouseY)
      );
    }
  });

  // Mouse lock for pointer controls
  document.addEventListener("click", () => {
    if (!isMouseLocked) {
      lockMouse();
    }
  });

  // Create UI elements for instructions
  createUI();
}

// Lock/unlock mouse pointer
function toggleMouseLock(): void {
  if (isMouseLocked) {
    document.exitPointerLock();
    isMouseLocked = false;
  } else {
    lockMouse();
  }
}

function lockMouse(): void {
  renderer.domElement.requestPointerLock();
  isMouseLocked = true;
}

// Handle pointer lock change
document.addEventListener("pointerlockchange", () => {
  isMouseLocked = document.pointerLockElement === renderer.domElement;
});

// Create UI elements
function createUI(): void {
  const instructions = document.createElement("div");
  instructions.style.position = "absolute";
  instructions.style.top = "10px";
  instructions.style.width = "100%";
  instructions.style.textAlign = "center";
  instructions.style.color = "white";
  instructions.style.fontFamily = "Arial, sans-serif";
  instructions.style.fontSize = "14px";
  instructions.style.fontWeight = "bold";
  instructions.style.textShadow = "1px 1px 2px black";
  instructions.innerHTML =
    "Click to play<br>WASD = Move, SPACE = Jump, ESC = Toggle mouse";
  document.body.appendChild(instructions);
}

// Handle player movement
function handlePlayerMovement(deltaTime: number): void {
  if (!localPlayer || !room) return;

  // Only process movement if we have pointer lock (except for ESC key)
  if (!isMouseLocked) return;

  // Smooth vertical camera movement
  mouseY += (targetMouseY - mouseY) * 10 * deltaTime;

  // Update player rotation - this rotates the actual character model
  localPlayer.mesh.rotation.y = playerRotation;

  // Calculate movement direction
  const moveSpeed = 5 * deltaTime;
  const moveVector = new THREE.Vector3(0, 0, 0);

  // Forward/backward movement in the direction the player is facing
  if (keys.forward) {
    moveVector.z -= moveSpeed;
  }
  if (keys.backward) {
    moveVector.z += moveSpeed;
  }

  // Left/right movement perpendicular to the direction the player is facing
  if (keys.left) {
    moveVector.x -= moveSpeed;
  }
  if (keys.right) {
    moveVector.x += moveSpeed;
  }

  // Apply rotation to movement vector based on player's rotation
  const rotatedMoveVector = moveVector.applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    playerRotation
  );

  // Apply movement
  if (rotatedMoveVector.length() > 0 || localPlayer.isJumping) {
    // Apply horizontal movement
    localPlayer.mesh.position.x += rotatedMoveVector.x;
    localPlayer.mesh.position.z += rotatedMoveVector.z;

    // Handle jumping
    if (localPlayer.isJumping) {
      // Get jump time from server
      const jumpTime = room.state.players.get(localPlayer.id)?.jumpTime || 0;
      
      // Simple jump arc (sin curve)
      const jumpHeight = 3;
      const jumpDuration = 1;
      const jumpProgress = Math.min(1, jumpTime / jumpDuration);
      
      // Parabolic jump curve
      localPlayer.mesh.position.y = jumpHeight * Math.sin(jumpProgress * Math.PI);
    } else {
      // Make sure we're on the ground when not jumping
      localPlayer.mesh.position.y = 0;
    }

    // Send position update to the server including the rotation
    room.send("move", {
      position: {
        x: localPlayer.mesh.position.x,
        y: localPlayer.mesh.position.y,
        z: localPlayer.mesh.position.z,
      },
      rotation: {
        y: localPlayer.mesh.rotation.y,
      },
    });
  }
}

// Handle window resize
window.addEventListener("resize", () => {
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

  // Handle player movement
  handlePlayerMovement(deltaTime);

  // Update camera to follow player in 3rd person view
  if (localPlayer) {
    const playerPos = localPlayer.mesh.position.clone();

    // Calculate camera position based on player position and rotation
    const cameraDistance = 5;
    const cameraHeight = 3;

    // Calculate camera offset based on player's rotation
    const cameraOffset = new THREE.Vector3(
      Math.sin(playerRotation) * cameraDistance,
      cameraHeight,
      Math.cos(playerRotation) * cameraDistance
    );

    // Apply vertical tilt
    const verticalRotationMatrix = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        playerRotation
      ),
      mouseY
    );
    cameraOffset.applyMatrix4(verticalRotationMatrix);

    // Set camera position and orientation
    camera.position.copy(playerPos).add(cameraOffset);
    camera.lookAt(
      playerPos.x,
      playerPos.y + 1, // Look at the player's head
      playerPos.z
    );
  }

  renderer.render(scene, camera);
}

animate();
