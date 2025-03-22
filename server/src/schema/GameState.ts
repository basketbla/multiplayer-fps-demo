import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Vector3 extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;

  constructor(x = 0, y = 0, z = 0) {
    super();
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class Player extends Schema {
  @type("string") id = "";
  @type(Vector3) position = new Vector3();
  @type(Vector3) rotation = new Vector3();
  @type("boolean") isJumping = false;
  @type("number") jumpTime = 0;

  constructor(id: string, position = new Vector3(), rotation = new Vector3()) {
    super();
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.isJumping = false;
    this.jumpTime = 0;
  }
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();

  constructor() {
    super();
    // No planets needed for flat plane
  }
}
