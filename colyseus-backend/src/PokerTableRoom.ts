import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

class Player extends Schema {
  @type("string") name = "";
  @type("number") seat = 0;
  @type("number") chips = 0;
}

class PokerTableState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase = "waiting";
}

export class PokerTableRoom extends Room<PokerTableState> {
  maxClients = 9;

  onCreate(options: any) {
    this.setState(new PokerTableState());
    this.onMessage("sit", (client, message) => {
      const { name, seat, chips } = message;
      const player = new Player();
      player.name = name;
      player.seat = seat;
      player.chips = chips;
      this.state.players.set(client.sessionId, player);
    });
    this.onMessage("leave", (client) => {
      this.state.players.delete(client.sessionId);
    });
  }

  onJoin(client: Client, options: any) {
    // Optionally auto-seat or just add to lobby
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
} 