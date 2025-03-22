import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Client } from 'colyseus.js'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import './App.css'

// Constants
const PLANET_RADIUS = 10
const GRAVITY_FORCE = 9.8
const WALK_SPEED = 6
const JUMP_FORCE = 220
const MOUSE_SENSITIVITY = 0.5

// Colyseus client setup
const client = new Client('ws://localhost:3001')

// Gravity Attractor component
const GravityAttractor = ({ children }: { children: React.ReactNode }) => {
  return (
    <group>
      {children}
    </group>
  )
}

// Planet component
const Planet = () => {
  const planetRef = useRef<THREE.Mesh>(null)
  
  return (
    <>
      <RigidBody type="fixed" colliders="ball" restitution={0.2} friction={1}>
        <mesh ref={planetRef} position={[0, 0, 0]}>
          <sphereGeometry args={[PLANET_RADIUS, 32, 32]} />
          <meshStandardMaterial color="#4060aa" />
        </mesh>
      </RigidBody>
      <GravityAttractor>
        <Player planetRef={planetRef} />
      </GravityAttractor>
    </>
  )
}

interface ColyseusRoom {
  leave: () => void;
  send: (type: string, data?: unknown) => void;
  onStateChange: (callback: (state: unknown) => void) => void;
}

// Player component
const Player = ({ planetRef }: { planetRef: React.RefObject<THREE.Mesh | null> }) => {
  const playerRef = useRef<RapierRigidBody>(null)
  const playerMeshRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const [grounded, setGrounded] = useState(false)
  const [room, setRoom] = useState<ColyseusRoom | null>(null)
  
  // Keyboard controls
  const keys = useKeyboardControls()
  
  // Mouse movement
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  
  // Connect to Colyseus server
  useEffect(() => {
    let currentRoom: ColyseusRoom | null = null;
    
    const connectToServer = async () => {
      try {
        const gameRoom = await client.joinOrCreate<ColyseusRoom>('game_room')
        setRoom(gameRoom)
        currentRoom = gameRoom;
        
        // Handle player movement from other players
        gameRoom.onStateChange(() => {
          // Update other players (not implemented in this example)
        })
        
      } catch (error) {
        console.error("Could not connect to server:", error)
      }
    }
    
    connectToServer()
    
    return () => {
      if (currentRoom) {
        currentRoom.leave()
      }
    }
  }, [])
  
  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Only rotate if pointer is locked
      if (document.pointerLockElement) {
        setRotation({
          y: rotation.y + e.movementX * MOUSE_SENSITIVITY * 0.01,
          x: Math.max(-Math.PI/2, Math.min(Math.PI/2, rotation.x - e.movementY * MOUSE_SENSITIVITY * 0.01))
        })
      }
    }
    
    const handleClick = () => {
      document.body.requestPointerLock()
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
    }
  }, [rotation])
  
  // Apply gravity and handle movement
  useFrame(() => {
    if (!playerRef.current || !planetRef.current || !playerMeshRef.current) return
    
    // Get current position
    const playerPosition = playerRef.current.translation()
    const planetPosition = new THREE.Vector3(0, 0, 0) // Center of the planet
    
    // Calculate gravity direction (from player to planet center)
    const gravityDir = new THREE.Vector3(
      planetPosition.x - playerPosition.x,
      planetPosition.y - playerPosition.y,
      planetPosition.z - playerPosition.z
    ).normalize()
    
    // Apply gravity force
    playerRef.current.applyImpulse(
      { x: gravityDir.x * GRAVITY_FORCE, y: gravityDir.y * GRAVITY_FORCE, z: gravityDir.z * GRAVITY_FORCE },
      true
    )
    
    // Align player up direction with gravity direction (away from planet)
    const upVector = gravityDir.clone().negate()
    const rightVector = new THREE.Vector3(1, 0, 0).cross(upVector).normalize()
    const forwardVector = upVector.clone().cross(rightVector).normalize()
    
    // Create rotation matrix and apply to player mesh
    const rotMatrix = new THREE.Matrix4().makeBasis(rightVector, upVector, forwardVector)
    playerMeshRef.current.quaternion.setFromRotationMatrix(rotMatrix)
    
    // Apply player's look rotation
    const lookRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotation.x, rotation.y, 0, 'YXZ')
    )
    playerMeshRef.current.quaternion.multiply(lookRotation)
    
    // Update camera position and rotation
    if (cameraRef.current) {
      cameraRef.current.position.copy(playerPosition)
      cameraRef.current.quaternion.copy(playerMeshRef.current.quaternion)
    }
    
    // Handle movement based on keyboard input
    if (keys.forward || keys.backward || keys.left || keys.right) {
      // Calculate movement direction in player's local space
      const moveDir = new THREE.Vector3(
        (keys.left ? -1 : 0) + (keys.right ? 1 : 0),
        0,
        (keys.forward ? -1 : 0) + (keys.backward ? 1 : 0)
      ).normalize().multiplyScalar(WALK_SPEED * 0.1)
      
      // Transform direction to world space based on player's orientation
      const worldMoveDir = moveDir.applyQuaternion(playerMeshRef.current.quaternion)
      
      // Apply movement impulse
      playerRef.current.applyImpulse(
        { x: worldMoveDir.x, y: worldMoveDir.y, z: worldMoveDir.z },
        true
      )
      
      // Send position to server
      if (room) {
        room.send("move", {
          position: {
            x: playerPosition.x,
            y: playerPosition.y,
            z: playerPosition.z
          },
          quaternion: {
            x: playerMeshRef.current.quaternion.x,
            y: playerMeshRef.current.quaternion.y,
            z: playerMeshRef.current.quaternion.z,
            w: playerMeshRef.current.quaternion.w
          }
        })
      }
    }
    
    // Handle jumping
    if (keys.jump && grounded) {
      const jumpDir = upVector.multiplyScalar(JUMP_FORCE * 0.05)
      playerRef.current.applyImpulse(
        { x: jumpDir.x, y: jumpDir.y, z: jumpDir.z },
        true
      )
      
      if (room) {
        room.send("jump")
      }
      
      setGrounded(false)
    }
    
    // Check if grounded
    const rayStart = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z)
    
    // Simplified grounded check (in a real implementation, use Rapier's ray casting)
    const distanceToPlanet = rayStart.distanceTo(planetPosition) - PLANET_RADIUS
    if (distanceToPlanet < 1.5) {
      setGrounded(true)
    }
  })
  
  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 15, 0]} />
      
      <RigidBody 
        ref={playerRef}
        position={[0, PLANET_RADIUS + 2, 0]} 
        colliders="ball"
        mass={1}
        lockRotations
      >
        <group ref={playerMeshRef}>
          <mesh>
            <capsuleGeometry args={[0.5, 1, 4, 8]} />
            <meshStandardMaterial color="hotpink" />
          </mesh>
        </group>
      </RigidBody>
    </>
  )
}

// Other players component (not fully implemented)
const OtherPlayers = () => {
  return null
}

function App() {
  return (
    <div className="canvas-container">
      <Canvas shadows>
        <color attach="background" args={['#000']} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
        
        <Stars radius={100} depth={50} count={5000} factor={4} />
        
        <Physics gravity={[0, 0, 0]}>
          <Planet />
          <OtherPlayers />
        </Physics>
      </Canvas>
      
      <div className="controls-info">
        <p>WASD: Move | SPACE: Jump | MOUSE: Look</p>
        <p>Click to lock cursor</p>
      </div>
    </div>
  )
}

export default App
