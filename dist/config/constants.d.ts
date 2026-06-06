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
export declare const MATCH: {
    MATCHMAKING_RATING_RANGE: number;
    MATCHMAKING_TIMEOUT_MS: number;
    DAILY_FRIENDLY_LIMIT: number;
    MATCH_ITERATIONS: number;
    OVERTIME_ITERATIONS: number;
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
export declare const TRAINING: {
    BASE_COST: number;
    COST_MULTIPLIER: number;
    COOLDOWN_MS: number;
    BOOST_NORMAL: number;
    BOOST_NFT: number;
    MAX_OVR_NORMAL: number;
    MAX_OVR_NFT: number;
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
            NFT_CHANCE: number;
        };
        PRO: {
            COST: number;
            CURRENCY: string;
            OVR_RANGE: number[];
            NFT_CHANCE: number;
        };
        MASTER: {
            COST: number;
            CURRENCY: string;
            OVR_RANGE: number[];
            NFT_CHANCE: number;
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
