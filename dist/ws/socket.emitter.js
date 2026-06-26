"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocketServer = setSocketServer;
exports.getSocketServer = getSocketServer;
exports.userRoom = userRoom;
exports.matchRoom = matchRoom;
exports.emitToUser = emitToUser;
exports.emitToMatch = emitToMatch;
exports.emitToUsers = emitToUsers;
let ioInstance = null;
function setSocketServer(io) {
    ioInstance = io;
}
function getSocketServer() {
    if (!ioInstance)
        throw new Error("Socket.IO not initialized");
    return ioInstance;
}
function userRoom(userId) {
    return `user:${userId}`;
}
function matchRoom(matchId) {
    return `match:${matchId}`;
}
function emitToUser(userId, event, payload) {
    if (!ioInstance)
        return;
    ioInstance.to(userRoom(userId)).emit(event, payload);
}
function emitToMatch(matchId, event, payload) {
    if (!ioInstance)
        return;
    ioInstance.to(matchRoom(matchId)).emit(event, payload);
}
function emitToUsers(userIds, event, payload) {
    if (!ioInstance)
        return;
    for (const userId of userIds) {
        ioInstance.to(userRoom(userId)).emit(event, payload);
    }
}
