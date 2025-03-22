import { Schema, MapSchema, type } from "@colyseus/schema";

class Vector3 extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

class Quaternion extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") w: number = 1;
}

export class Player extends Schema {
  @type("string") id: string;
  @type(Vector3) position = new Vector3();
  @type(Quaternion) rotation = new Quaternion();
  @type("string") animation: string = "idle";

  constructor(id: string) {
    super();
    this.id = id;
  }
}

export class Projectile extends Schema {
  @type("string") id: string;
  @type(Vector3) position = new Vector3();
  @type(Vector3) direction = new Vector3();
  @type("string") color: string;
  @type("string") ownerId: string;
  @type("number") timestamp: number;

  constructor(id: string, ownerId: string) {
    super();
    this.id = id;
    this.ownerId = ownerId;
    this.timestamp = Date.now();
  }
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
}
