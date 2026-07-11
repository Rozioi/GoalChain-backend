export declare const DRAFT: {
    STARTER_GK_OPTIONS: number;
    STARTER_DEF_OPTIONS: number;
    STARTER_MID_OPTIONS: number;
    STARTER_FWD_OPTIONS: number;
    STARTER_GK_PICKS: number;
    STARTER_DEF_PICKS: number;
    STARTER_MID_PICKS: number;
    STARTER_FWD_PICKS: number;
    RESERVE_GK: number;
    RESERVE_DEF: number;
    RESERVE_MID: number;
    RESERVE_FWD: number;
    STARTER_OVR_MIN: number;
    STARTER_OVR_MAX: number;
    RESERVE_OVR_MIN: number;
    RESERVE_OVR_MAX: number;
};
export declare const ENERGY: {
    MAX: number;
    REGEN_INTERVAL_MS: number;
};
export declare const DIVISION_TIERS: readonly [{
    readonly name: "Bronze";
    readonly min: 0;
    readonly max: 1499;
    readonly lossPenalty: 5;
}, {
    readonly name: "Silver";
    readonly min: 1500;
    readonly max: 2999;
    readonly lossPenalty: 15;
}, {
    readonly name: "Gold";
    readonly min: 3000;
    readonly max: 4499;
    readonly lossPenalty: 22;
}, {
    readonly name: "Diamond";
    readonly min: 4500;
    readonly max: 5999;
    readonly lossPenalty: 28;
}, {
    readonly name: "Master";
    readonly min: 6000;
    readonly max: number;
    readonly lossPenalty: 30;
}];
export declare const MATCH: {
    MATCHMAKING_RATING_RANGE: number;
    MATCHMAKING_POINTS_RANGE: number;
    MATCHMAKING_TIMEOUT_MS: number;
    DAILY_FRIENDLY_LIMIT: number;
    MATCH_ITERATIONS: number;
    OVERTIME_ITERATIONS: number;
    LIVE_MS_PER_MINUTE: number;
    REWARDS: {
        WIN_COINS: number;
        DRAW_COINS: number;
        LOSS_COINS: number;
        WIN_EXP: number;
        DRAW_EXP: number;
        LOSS_EXP: number;
        DIMINISHING_FACTOR: number;
    };
};
export declare const INVITE: {
    FRIEND_TTL_MS: number;
    OPEN_TTL_MS: number;
    EXPIRY_CHECK_INTERVAL_MS: number;
};
export declare const TRAINING: {
    BASE_COST: number;
    COST_MULTIPLIER: number;
    COOLDOWN_MS: number;
    BOOST: number;
    XP_PER_TRAINING: number;
    XP_PER_LEVEL: number;
    MAX_TRAINING_LEVEL: number;
};
export declare const NFT: {
    MAX_OVR: number;
    MIN_OVR_FOR_MINT: number;
    MIN_MATCHES_FOR_MINT: number;
    COLLECTION_ADDRESS: string;
    MINT_LOCK_DURATION_MS: number;
};
export declare const SCOUTING: {
    MAX_ACTIVE_SCOUTS: number;
    DURATION_MS: number;
    REGIONS: string[];
    TIERS: {
        COMMON: {
            COST: number;
            CURRENCY: string;
            OVR_RANGE: number[];
            CHANCE: {
                min: number;
                max: number;
            };
        };
        PRO: {
            COST: number;
            CURRENCY: string;
            OVR_RANGE: number[];
            CHANCE: {
                min: number;
                max: number;
            };
        };
        MASTER: {
            COST: number;
            CURRENCY: string;
            OVR_RANGE: number[];
            CHANCE: {
                min: number;
                max: number;
            };
        };
    };
};
export declare const SEASON: {
    DURATION_WEEKS: number;
    DIVISIONS: number;
    PROMOTION_SLOTS: number;
    RELEGATION_SLOTS: number;
    REWARDS: {
        FIRST_PLACE: number;
        SECOND_PLACE: number;
        THIRD_PLACE: number;
    };
};
export declare const REFERRAL: {
    INVITER_REWARD: number;
    INVITEE_REWARD: number;
};
export declare const RENT: {
    COMMISSION_RATE: number;
};
export declare const PLAYER_FIRST_NAMES: string[];
export declare const PLAYER_LAST_NAMES: string[];
export declare const PLAYER_NATIONALITIES: readonly ["FR", "DE", "GB", "ES", "IT", "NL", "PT", "BE", "HR", "NO", "DK", "SE", "CH", "AT", "PL", "UA", "TR", "GR", "IE", "CZ", "SK", "HU", "RS", "SI", "GE", "BY", "LT", "LV", "EE", "FI", "BR", "AR", "UY", "CO", "CL", "EC", "PY", "PE", "BO", "VE", "SN", "EG", "MA", "NG", "DZ", "CM", "CI", "GH", "TN", "ML", "JP", "KR", "SA", "IR", "AU", "AE", "QA", "UZ", "CN", "US", "MX", "CA", "CR", "JM", "PA"];
export type NationalityCode = (typeof PLAYER_NATIONALITIES)[number];
export declare const PLAYER_CLUBS: string[];
