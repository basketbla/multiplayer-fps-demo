import { Client, Room } from "colyseus.js";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface MultiplayerContextType {
  connected: boolean;
  room: Room | null;
  clientId: string;
}

const defaultContext: MultiplayerContextType = {
  connected: false,
  room: null,
  clientId: "",
};

const MultiplayerContext =
  createContext<MultiplayerContextType>(defaultContext);

export const useMultiplayer = () => useContext(MultiplayerContext);

interface MultiplayerProviderProps {
  children: ReactNode;
}

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({
  children,
}) => {
  const [client] = useState(new Client("ws://localhost:3001"));
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    const connectToServer = async () => {
      try {
        console.log("Connecting to game server...");
        const joinedRoom = await client.joinOrCreate("game_room");
        console.log("Connected to room:", joinedRoom.id);

        setRoom(joinedRoom);
        setConnected(true);
        setClientId(joinedRoom.sessionId);

        // Handle disconnection
        joinedRoom.onLeave((code) => {
          console.log("Left room", code);
          setConnected(false);
          setRoom(null);
        });
      } catch (error) {
        console.error("Could not connect to server:", error);
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

  return (
    <MultiplayerContext.Provider
      value={{
        connected,
        room,
        clientId,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};
