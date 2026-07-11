"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDivisionLossPenalty = getDivisionLossPenalty;
exports.randomWinPoints = randomWinPoints;
exports.calculateMatchRewards = calculateMatchRewards;
exports.outcomeForRole = outcomeForRole;
const constants_1 = require("../../config/constants");
function getDivisionLossPenalty(currentPoints) {
    const tier = constants_1.DIVISION_TIERS.find((t) => currentPoints >= t.min && currentPoints <= t.max);
    return tier?.lossPenalty ?? constants_1.DIVISION_TIERS[0].lossPenalty;
}
function randomWinPoints() {
    return Math.floor(Math.random() * 5) + 26;
}
function calculateMatchRewards(outcome, currentPoints, hasEnergy, winPoints) {
    const exp = outcome === "win"
        ? constants_1.MATCH.REWARDS.WIN_EXP
        : outcome === "draw"
            ? constants_1.MATCH.REWARDS.DRAW_EXP
            : constants_1.MATCH.REWARDS.LOSS_EXP;
    let points;
    if (outcome === "win") {
        points = winPoints ?? randomWinPoints();
    }
    else if (outcome === "draw") {
        points = 0;
    }
    else {
        points = -getDivisionLossPenalty(currentPoints);
    }
    let coins = 0;
    if (hasEnergy) {
        coins =
            outcome === "win"
                ? constants_1.MATCH.REWARDS.WIN_COINS
                : outcome === "draw"
                    ? constants_1.MATCH.REWARDS.DRAW_COINS
                    : constants_1.MATCH.REWARDS.LOSS_COINS;
    }
    return { points, coins, exp };
}
function outcomeForRole(role, winner) {
    if (winner === "draw")
        return "draw";
    return winner === role ? "win" : "loss";
}
