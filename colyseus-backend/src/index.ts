import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
// import { PokerTableRoom } from "./PokerTableRoom";

const port = Number(process.env.PORT) || 3002;
const app = express();
const server = createServer(app);
const gameServer = new Server({ server });

// gameServer.define("poker_table", PokerTableRoom);

gameServer.listen(port);
console.log(`Colyseus server listening on ws://localhost:${port}`); 