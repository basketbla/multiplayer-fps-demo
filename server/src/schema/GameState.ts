import { Schema, MapSchema, type } from "@colyseus/schema";

export class Vector3 extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

export class Quaternion extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") w: number = 1;
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type(Vector3) position = new Vector3();
  @type(Quaternion) quaternion = new Quaternion();
  @type("boolean") grounded: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
