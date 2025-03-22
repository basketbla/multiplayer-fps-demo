import React, { useEffect, useState } from 'react';
import { useMultiplayer } from './MultiplayerContext';

export const ConnectionStatus: React.FC = () => {
  const { connected, room, clientId } = useMultiplayer();
  const [playerCount, setPlayerCount] = useState(0);
  
  useEffect(() => {
    if (room) {
      // Update player count when state changes
      const handleStateChange = (state: any) => {
        setPlayerCount(state.players.size);
      };
      
      room.onStateChange(handleStateChange);
      
      // Initial player count
      if (room.state && room.state.players) {
        setPlayerCount(room.state.players.size);
      }
    }
  }, [room]);
  
  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <div>Connection: {connected ? '✅ Connected' : '❌ Disconnected'}</div>
      <div>Room ID: {room?.id || 'None'}</div>
      <div>Client ID: {clientId || 'None'}</div>
      <div>Players in room: {playerCount}</div>
    </div>
  );
};
