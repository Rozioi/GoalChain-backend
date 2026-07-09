export declare enum ClientEvent {
    MATCH_READY = "match:ready",
    MATCHMAKING_START = "matchmaking:start",
    MATCHMAKING_CANCEL = "matchmaking:cancel",
    TACTICS_UPDATE = "match:tactics",
    PING = "ping",
}
/** Server → Client events */
export declare enum ServerEvent {
    INVITE_RECEIVED = "invite:received",
    INVITE_SENT = "invite:sent",
    INVITE_ACCEPTED = "invite:accepted",
    INVITE_DECLINED = "invite:declined",
    INVITE_EXPIRED = "invite:expired",
    INVITE_CANCELLED = "invite:cancelled",
    MATCHMAKING_STARTED = "matchmaking:started",
    MATCH_FOUND = "matchmaking:found",
    MATCHMAKING_CANCELLED = "matchmaking:cancelled",
    MATCHMAKING_EXPIRED = "matchmaking:expired",
    MATCH_READY = "match:ready",
    MATCH_STARTED = "match:started",
    MATCH_EVENT = "match:event",
    TACTICS_UPDATED = "match:tactics_updated",
    MATCH_FINISHED = "match:finished",
    PLAYER_DISCONNECTED = "match:player_disconnected",
    PLAYER_RECONNECTED = "match:player_reconnected",
    CONNECTED = "connected",
    ERROR = "error",
    PONG = "pong",
}
export interface InvitePayload {
    inviteId: string;
    type: "FRIEND" | "OPEN";
    sender: {
        id: string;
        clubName: string | null;
        points: number;
    };
    expiresAt: string;
    inviteLink?: string;
}
export interface MatchFoundPayload {
    matchId: string;
    opponent: {
        id: string;
        clubName: string | null;
        points: number;
    };
    isBot: boolean;
}
export interface MatchEventPayload {
    matchId: string;
    minute: number;
    type: string;
    team: string;
    playerId?: string | null;
    playerName?: string | null;
    description: string;
}
export interface MatchFinishedPayload {
    matchId: string;
    homeScore: number;
    awayScore: number;
    winner: "home" | "away" | "draw";
    rewards: {
        coins: number;
        exp: number;
    };
}
export interface JwtSocketPayload {
    userId: string;
    telegramId: string;
}
export interface SocketUserState {
    userId: string;
    connectedAt: Date;
    matchId?: string;
    inviteIds: Set<string>;
}
