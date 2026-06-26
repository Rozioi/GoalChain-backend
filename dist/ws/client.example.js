"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMatchSocket = connectMatchSocket;
/**
 * Client WebSocket integration example (Telegram Mini App / React)
 *
 * npm install socket.io-client
 */
const socket_io_client_1 = require("socket.io-client");
const types_1 = require("./types");
function connectMatchSocket(jwtToken, apiUrl) {
    const socket = (0, socket_io_client_1.io)(apiUrl, {
        auth: { token: jwtToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
    });
    socket.on(types_1.ServerEvent.CONNECTED, ({ userId }) => {
        console.log("WS connected as", userId);
    });
    socket.on(types_1.ServerEvent.INVITE_RECEIVED, (payload) => {
        // Show invite modal to user
        console.log("New invite:", payload);
    });
    socket.on(types_1.ServerEvent.INVITE_ACCEPTED, ({ matchId }) => {
        // Navigate to match lobby, then signal ready
        socket.emit(types_1.ClientEvent.MATCH_READY, { matchId });
    });
    socket.on(types_1.ServerEvent.MATCHMAKING_STARTED, () => {
        // Show "searching for opponent" UI — NO setInterval polling
    });
    socket.on(types_1.ServerEvent.MATCH_FOUND, ({ matchId, opponent, isBot }) => {
        if (!isBot) {
            socket.emit(types_1.ClientEvent.MATCH_READY, { matchId });
        }
    });
    socket.on(types_1.ServerEvent.MATCH_STARTED, ({ matchId }) => {
        // Start match UI, listen for events
    });
    socket.on(types_1.ServerEvent.MATCH_EVENT, (event) => {
        // Append event to timeline at event.minute
        console.log(`[${event.minute}'] ${event.description}`);
    });
    socket.on(types_1.ServerEvent.MATCH_FINISHED, ({ homeScore, awayScore, rewards }) => {
        // Show results screen
        console.log(`Final: ${homeScore}-${awayScore}, +${rewards.coins} coins`);
    });
    socket.on(types_1.ServerEvent.PLAYER_DISCONNECTED, ({ userId }) => {
        console.warn("Opponent disconnected:", userId);
    });
    socket.on(types_1.ServerEvent.ERROR, ({ message }) => {
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
