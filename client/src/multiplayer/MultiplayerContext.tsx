import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Room } from 'colyseus.js';
import { Vector3 } from 'three';

interface MultiplayerContextType {
  connected: boolean;
  room: Room | null;
  clientId: string;
  sendProjectile: (position: Vector3, direction: Vector3) => void;
}

const defaultContext: MultiplayerContextType = {
  connected: false,
  room: null,
  clientId: '',
  sendProjectile: () => {}
};

const MultiplayerContext = createContext<MultiplayerContextType>(defaultContext);

export const useMultiplayer = () => useContext(MultiplayerContext);

interface MultiplayerProviderProps {
  children: ReactNode;
}

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({ children }) => {
  const [client] = useState(new Client('ws://localhost:3001'));
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const connectToServer = async () => {
      try {
        console.log('Connecting to game server...');
        const joinedRoom = await client.joinOrCreate('game_room');
        console.log('Connected to room:', joinedRoom.id);
        
        setRoom(joinedRoom);
        setConnected(true);
        setClientId(joinedRoom.sessionId);
        
        // Handle disconnection
        joinedRoom.onLeave((code) => {
          console.log('Left room', code);
          setConnected(false);
          setRoom(null);
        });
        
      } catch (error) {
        console.error('Could not connect to server:', error);
        setConnected(false);
      }
    };
    
    connectToServer();
    
    return () => {
      if (room) {
        room.leave();
      }
    };
  }, [client]);
  
  const sendProjectile = (position: Vector3, direction: Vector3) => {
    if (room && connected) {
      room.send('projectile:create', {
        position: {
          x: position.x,
          y: position.y,
          z: position.z
        },
        direction: {
          x: direction.x,
          y: direction.y,
          z: direction.z
        },
        color: '#ff0000' // Red projectile
      });
    }
  };
  
  return (
    <MultiplayerContext.Provider 
      value={{ 
        connected, 
        room, 
        clientId,
        sendProjectile
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};
