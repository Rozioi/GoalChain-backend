/**
 * Client WebSocket integration example (Telegram Mini App / React)
 *
 * npm install socket.io-client
 */
import { io, Socket } from "socket.io-client";
import { ServerEvent, ClientEvent } from "./types";

export function connectMatchSocket(jwtToken: string, apiUrl: string): Socket {
  const socket = io(apiUrl, {
    auth: { token: jwtToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on(ServerEvent.CONNECTED, ({ userId }) => {
    console.log("WS connected as", userId);
  });

  socket.on(ServerEvent.INVITE_RECEIVED, (payload) => {
    // Show invite modal to user
    console.log("New invite:", payload);
  });

  socket.on(ServerEvent.INVITE_ACCEPTED, ({ matchId }) => {
    // Navigate to match lobby, then signal ready
    socket.emit(ClientEvent.MATCH_READY, { matchId });
  });

  socket.on(ServerEvent.MATCHMAKING_STARTED, () => {
    // Show "searching for opponent" UI — NO setInterval polling
  });

  socket.on(ServerEvent.MATCH_FOUND, ({ matchId, opponent, isBot }) => {
    if (!isBot) {
      socket.emit(ClientEvent.MATCH_READY, { matchId });
    }
  });

  socket.on(ServerEvent.MATCH_STARTED, ({ matchId }) => {
    // Start match UI, listen for events
  });

  socket.on(ServerEvent.MATCH_EVENT, (event) => {
    // Append event to timeline at event.minute
    console.log(`[${event.minute}'] ${event.description}`);
  });

  socket.on(ServerEvent.MATCH_FINISHED, ({ homeScore, awayScore, rewards }) => {
    // Show results screen
    console.log(`Final: ${homeScore}-${awayScore}, +${rewards.coins} coins`);
  });

  socket.on(ServerEvent.PLAYER_DISCONNECTED, ({ userId }) => {
    console.warn("Opponent disconnected:", userId);
  });

  socket.on(ServerEvent.ERROR, ({ message }) => {
    console.error("WS error:", message);
  });

  return socket;
}

// REST + WS flow (friend invite):
//
// 1. POST /api/v1/match/invite/:friendId  → { inviteId }
// 2. Friend receives invite:received via WS (or GET /match/invites/pending on reconnect)
// 3. POST /api/v1/match/accept/:inviteId  → { matchId }
// 4. Both clients: socket.emit('match:ready', { matchId })
// 5. Both receive match:started → match:event stream → match:finished
