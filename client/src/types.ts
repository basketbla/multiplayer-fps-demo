export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Planet {
  id: string;
  name: string;
  position: Vector3;
  radius: number;
  color: string;
}

export interface Player {
  id: string;
  position: Vector3;
  rotation: Vector3;
  isJumping: boolean;
  jumpTime: number;
}

export interface GameState {
  players: Record<string, Player>;
}

export enum SocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_GAME = 'join_game',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_MOVE = 'player_move',
  GAME_STATE = 'game_state',
}
