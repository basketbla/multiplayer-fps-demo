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

export class Planet extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type(Vector3) position = new Vector3();
  @type("number") radius = 0;
  @type("string") color = "";

  constructor(id: string, name: string, position: Vector3, radius: number, color: string) {
    super();
    this.id = id;
    this.name = name;
    this.position = position;
    this.radius = radius;
    this.color = color;
  }
}

export class Player extends Schema {
  @type("string") id = "";
  @type(Vector3) position = new Vector3();
  @type(Vector3) rotation = new Vector3();
  @type("string") planetId = "";
  @type("boolean") onPlanet = false;
  @type("number") angle = 0; // Angle for walking around the planet

  constructor(id: string, position = new Vector3(), rotation = new Vector3()) {
    super();
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.planetId = "";
    this.onPlanet = false;
    this.angle = 0;
  }
}

export class GameRoomState extends Schema {
  @type({ array: Planet }) planets = new ArraySchema<Planet>();
  @type({ map: Player }) players = new MapSchema<Player>();

  constructor() {
    super();
    
    // Add default planets
    this.planets.push(
      new Planet(
        "planet1", 
        "Earth", 
        new Vector3(0, 0, 0), 
        5, 
        "#2233ff"
      )
    );
    
    this.planets.push(
      new Planet(
        "planet2", 
        "Mars", 
        new Vector3(15, 0, 15), 
        3, 
        "#ff3300"
      )
    );
    
    this.planets.push(
      new Planet(
        "planet3", 
        "Venus", 
        new Vector3(-15, 0, -15), 
        4, 
        "#ffcc00"
      )
    );
  }
}
