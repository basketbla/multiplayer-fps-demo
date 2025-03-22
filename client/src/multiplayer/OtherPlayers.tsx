import { useAnimations, useGLTF } from "@react-three/drei";
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { useMultiplayer } from "./MultiplayerContext";

// Avatar representation of other players
const PlayerAvatar = ({
  position,
  rotation,
}: {
  position: THREE.Vector3;
  rotation?: THREE.Quaternion;
}) => {
  const { scene, animations } = useGLTF("/avatar.glb");
  const { actions } = useAnimations(animations, scene);

  return (
    <group position={[position.x, position.y, position.z]}>
      <primitive
        object={scene}
        scale={0.7}
        position={[0, -0.5, 0]}
        rotation={[rotation?.x, rotation?.y, rotation?.z]}
      />
    </group>
  );
};

export const OtherPlayers: React.FC = () => {
  const { room, clientId } = useMultiplayer();
  const [players, setPlayers] = useState<{
    [key: string]: {
      position: THREE.Vector3;
      rotation?: THREE.Quaternion;
    };
  }>({});

  useEffect(() => {
    if (!room) return;

    // Update player positions when state changes
    const handleStateChange = (state: any) => {
      // Update players
      const newPlayers: {
        [key: string]: {
          position: THREE.Vector3;
          rotation?: THREE.Quaternion;
        };
      } = {};

      state.players.forEach((player: any, id: string) => {
        // Don't include the current player
        if (id !== clientId) {
          newPlayers[id] = {
            position: new THREE.Vector3(
              player.position.x,
              player.position.y,
              player.position.z
            ),
            // Add rotation if available
            rotation: player.rotation,
          };
        }
      });

      setPlayers(newPlayers);
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
        <PlayerAvatar
          key={`player-${id}`}
          position={player.position}
          rotation={player.rotation}
        />
      ))}
    </>
  );
};

// Preload the model to ensure it's cached
useGLTF.preload("/avatar.glb");
