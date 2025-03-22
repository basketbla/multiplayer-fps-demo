import React, { useEffect, useState } from 'react';
import { useMultiplayer } from './MultiplayerContext';
import * as THREE from 'three';

// Simple representation of other players
const PlayerAvatar = ({ position }: { position: THREE.Vector3 }) => {
  return (
    <mesh position={position}>
      <capsuleGeometry args={[0.5, 1, 4, 8]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
};

// Simple projectile representation
const Projectile = ({ position, color = '#ff0000' }: { position: THREE.Vector3, color?: string }) => {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
};

export const OtherPlayers: React.FC = () => {
  const { room, clientId } = useMultiplayer();
  const [players, setPlayers] = useState<{[key: string]: {position: THREE.Vector3}}>({});
  const [projectiles, setProjectiles] = useState<{[key: string]: {position: THREE.Vector3, color: string}}>({});
  
  useEffect(() => {
    if (!room) return;
    
    // Update player positions and projectiles when state changes
    const handleStateChange = (state: any) => {
      // Update players
      const newPlayers: {[key: string]: {position: THREE.Vector3}} = {};
      
      state.players.forEach((player: any, id: string) => {
        // Don't include the current player
        if (id !== clientId) {
          newPlayers[id] = {
            position: new THREE.Vector3(
              player.position.x,
              player.position.y,
              player.position.z
            )
          };
        }
      });
      
      setPlayers(newPlayers);
      
      // Update projectiles
      const newProjectiles: {[key: string]: {position: THREE.Vector3, color: string}} = {};
      
      state.projectiles.forEach((projectile: any, id: string) => {
        newProjectiles[id] = {
          position: new THREE.Vector3(
            projectile.position.x,
            projectile.position.y,
            projectile.position.z
          ),
          color: projectile.color || '#ff0000'
        };
      });
      
      setProjectiles(newProjectiles);
    };
    
    room.onStateChange(handleStateChange);
    
    // Initial state
    if (room.state) {
      handleStateChange(room.state);
    }
    
    return () => {
      // No cleanup needed as Colyseus handles this
    };
  }, [room, clientId]);
  
  return (
    <>
      {/* Render other players */}
      {Object.entries(players).map(([id, player]) => (
        <PlayerAvatar key={`player-${id}`} position={player.position} />
      ))}
      
      {/* Render projectiles */}
      {Object.entries(projectiles).map(([id, projectile]) => (
        <Projectile key={`projectile-${id}`} position={projectile.position} color={projectile.color} />
      ))}
    </>
  );
};
