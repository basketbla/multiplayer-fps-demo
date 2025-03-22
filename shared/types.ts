export enum PlayerAnimation {
  IDLE = "idle",
  WALKING = "walking",
  GREETING = "greeting",
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PlayerInput {
  position: Vector3;
  rotation: Quaternion;
  animation: PlayerAnimation;
}

export interface ProjectileInput {
  position: Vector3;
  direction: Vector3;
  color: string;
}
