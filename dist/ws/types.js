"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerEvent = exports.ClientEvent = void 0;
/** Client → Server events */
var ClientEvent;
(function (ClientEvent) {
    ClientEvent["MATCH_READY"] = "match:ready";
    ClientEvent["MATCHMAKING_START"] = "matchmaking:start";
    ClientEvent["MATCHMAKING_CANCEL"] = "matchmaking:cancel";
    ClientEvent["TACTICS_UPDATE"] = "match:tactics";
    ClientEvent["PING"] = "ping";
})(ClientEvent || (exports.ClientEvent = ClientEvent = {}));
/** Server → Client events */
var ServerEvent;
(function (ServerEvent) {
    // Invites
    ServerEvent["INVITE_RECEIVED"] = "invite:received";
    ServerEvent["INVITE_SENT"] = "invite:sent";
    ServerEvent["INVITE_ACCEPTED"] = "invite:accepted";
    ServerEvent["INVITE_DECLINED"] = "invite:declined";
    ServerEvent["INVITE_EXPIRED"] = "invite:expired";
    ServerEvent["INVITE_CANCELLED"] = "invite:cancelled";
    // Matchmaking
    ServerEvent["MATCHMAKING_STARTED"] = "matchmaking:started";
    ServerEvent["MATCH_FOUND"] = "matchmaking:found";
    ServerEvent["MATCHMAKING_CANCELLED"] = "matchmaking:cancelled";
    ServerEvent["MATCHMAKING_EXPIRED"] = "matchmaking:expired";
    // Match lifecycle
    ServerEvent["MATCH_READY"] = "match:ready";
    ServerEvent["MATCH_STARTED"] = "match:started";
    ServerEvent["MATCH_EVENT"] = "match:event";
    ServerEvent["TACTICS_UPDATED"] = "match:tactics_updated";
    ServerEvent["MATCH_FINISHED"] = "match:finished";
    ServerEvent["PLAYER_DISCONNECTED"] = "match:player_disconnected";
    ServerEvent["PLAYER_RECONNECTED"] = "match:player_reconnected";
    // System
    ServerEvent["CONNECTED"] = "connected";
    ServerEvent["ERROR"] = "error";
    ServerEvent["PONG"] = "pong";
})(ServerEvent || (exports.ServerEvent = ServerEvent = {}));
