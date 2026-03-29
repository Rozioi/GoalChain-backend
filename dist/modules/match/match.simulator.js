"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateMatch = simulateMatch;
exports.calculateRiskRating = calculateRiskRating;
const seedrandom_1 = __importDefault(require("seedrandom"));
function getLineStrength(players, roles, weights, pressingType) {
    const linePlayers = players.filter((p) => roles.includes(p.role));
    if (linePlayers.length === 0)
        return 30;
    // Pressing multipliers
    let pressingMult = 1.0;
    if (pressingType === "INTENSIVE")
        pressingMult = 1.15;
    if (pressingType === "SOFT")
        pressingMult = 0.9;
    return (linePlayers.reduce((sum, p) => {
        let val = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            val += p[stat] * weight;
        }
        // Apply form & fatigue (fatigue impact increases with intensive pressing)
        const fatigueFactor = pressingType === "INTENSIVE" ? 1.5 : 1.0;
        val *= (p.form / 100) * (1 - (p.fatigue * fatigueFactor) / 200);
        return sum + val * pressingMult;
    }, 0) / linePlayers.length);
}
function simulateMatch(home, away, seed, options = {}) {
    const { forceOvertime = false, manualSubstitutions = [], pressingChanges = [], lockedEvents = [], skipUntilMinute = 0 } = options;
    const rng = (0, seedrandom_1.default)(seed);
    const events = [];
    const homeActive = [...home.starters];
    const awayActive = [...away.starters];
    const homeBench = [...home.bench];
    const awayBench = [...away.bench];
    let currentHomePressing = home.pressingType;
    let currentAwayPressing = away.pressingType;
    const homeYellowCards = {};
    const awayYellowCards = {};
    let homeScore = 0;
    let awayScore = 0;
    let homeShots = 0;
    let awayShots = 0;
    let homeShotsOnTarget = 0;
    let awayShotsOnTarget = 0;
    const totalMinutes = 90;
    const getTeamStrengths = (activeStarters, rating, pressing) => {
        const attack = getLineStrength(activeStarters, ["FORWARD", "MIDFIELDER"], {
            shooting: 0.35,
            pace: 0.2,
            dribbling: 0.2,
            passing: 0.15,
            physical: 0.1,
        }, pressing);
        const defense = getLineStrength(activeStarters, ["DEFENDER", "GOALKEEPER"], {
            defending: 0.35,
            physical: 0.2,
            pace: 0.15,
            goalkeeping: 0.2,
            passing: 0.1,
        }, pressing);
        const shortagePenalty = activeStarters.length < 11 ? (activeStarters.length / 11) : 1;
        return {
            attack: attack * shortagePenalty,
            defense: defense * shortagePenalty,
            power: (attack * 0.6 + defense * 0.4 + rating * 0.1) * shortagePenalty
        };
    };
    for (let minute = 1; minute <= totalMinutes; minute++) {
        // 1. Apply scheduled changes for this minute
        const currentSubs = manualSubstitutions.filter(s => s.minute === minute);
        for (const sub of currentSubs) {
            const active = sub.team === "home" ? homeActive : awayActive;
            const bench = sub.team === "home" ? homeBench : awayBench;
            const playerIdx = active.findIndex(p => p.id === sub.outId);
            const benchIdx = bench.findIndex(p => p.id === sub.inId);
            if (playerIdx !== -1 && benchIdx !== -1) {
                const outPlayer = active[playerIdx];
                const inPlayer = bench.splice(benchIdx, 1)[0];
                active[playerIdx] = inPlayer;
                events.push({
                    minute,
                    type: "substitution",
                    team: sub.team,
                    playerId: inPlayer.id,
                    playerName: inPlayer.name,
                    description: `Substitution: ${inPlayer.name} replaces ${outPlayer.name}.`,
                });
            }
        }
        const currentTactics = pressingChanges.filter(c => c.minute === minute);
        for (const tactic of currentTactics) {
            if (tactic.team === "home")
                currentHomePressing = tactic.type;
            else
                currentAwayPressing = tactic.type;
            events.push({
                minute,
                type: "substitution", // Using substitution type for now as tactical change
                team: tactic.team,
                description: `Tactical change: Team switched to ${tactic.type} pressing.`,
            });
        }
        // 2. Check for locked events
        const lockedThisMinute = lockedEvents.filter(e => e.minute === minute);
        if (lockedThisMinute.length > 0) {
            for (const e of lockedThisMinute) {
                // Apply side effects of locked events (cards, injuries)
                const teamActive = e.team === "home" ? homeActive : awayActive;
                const teamBench = e.team === "home" ? homeBench : awayBench;
                const teamCards = e.team === "home" ? homeYellowCards : awayYellowCards;
                if (e.type === "goal") {
                    if (e.team === "home")
                        homeScore++;
                    else
                        awayScore++;
                }
                else if (e.type === "yellowCard" && e.playerId) {
                    teamCards[e.playerId] = (teamCards[e.playerId] || 0) + 1;
                }
                else if (e.type === "redCard" && e.playerId) {
                    const idx = teamActive.findIndex(p => p.id === e.playerId);
                    if (idx !== -1)
                        teamActive.splice(idx, 1);
                }
                else if (e.type === "injury" && e.playerId) {
                    const idx = teamActive.findIndex(p => p.id === e.playerId);
                    if (idx !== -1) {
                        const injured = teamActive.splice(idx, 1)[0];
                        if (teamBench.length > 0) {
                            const sub = teamBench.shift();
                            teamActive.push(sub);
                        }
                    }
                }
                events.push(e);
            }
            // Advance RNG anyway to keep it consistent if possible, but actually 
            // it's better to just skip RNG rolls for this minute to avoid side effects.
            // Note: We don't advance RNG here because we want the "future" to be 
            // deterministic based on the seed from this point forward.
            continue;
        }
        // 3. Roll for events (Skip if we are in historical/locked minutes)
        if (minute < skipUntilMinute)
            continue;
        const roll = rng();
        if (roll > 0.25)
            continue;
        const homeS = getTeamStrengths(homeActive, home.rating, currentHomePressing);
        const awayS = getTeamStrengths(awayActive, away.rating, currentAwayPressing);
        const homeChance = homeS.power / (homeS.power + awayS.power);
        const actionRoll = rng();
        const isHomeAction = rng() < homeChance;
        const team = isHomeAction ? "home" : "away";
        const active = isHomeAction ? homeActive : awayActive;
        const bench = isHomeAction ? homeBench : awayBench;
        const yellowCards = isHomeAction ? homeYellowCards : awayYellowCards;
        const pressing = isHomeAction ? currentHomePressing : currentAwayPressing;
        if (active.length === 0)
            continue;
        const cardMult = currentHomePressing === "INTENSIVE" ? 1.6 : currentHomePressing === "SOFT" ? 0.7 : 1.0;
        const awayCardMult = currentAwayPressing === "INTENSIVE" ? 1.6 : currentAwayPressing === "SOFT" ? 0.7 : 1.0;
        if (actionRoll < 0.03) {
            // Injury (slightly higher chance with intensive pressing)
            const injuryChance = pressing === "INTENSIVE" ? 0.04 : 0.03;
            if (rng() < (injuryChance / 0.03) * actionRoll) {
                const playerIdx = Math.floor(rng() * active.length);
                const player = active[playerIdx];
                events.push({
                    minute,
                    type: "injury",
                    team,
                    playerId: player.id,
                    playerName: player.name,
                    description: `${player.name} is injured and must leave the pitch!`,
                });
                active.splice(playerIdx, 1);
                if (bench.length > 0) {
                    const sub = bench.shift();
                    active.push(sub);
                    events.push({
                        minute,
                        type: "substitution",
                        team,
                        playerId: sub.id,
                        playerName: sub.name,
                        description: `Substitution: ${sub.name} comes on for injured ${player.name}.`,
                    });
                }
            }
        }
        else if (actionRoll < 0.05) {
            // Red card
            const cardRollMult = team === "home" ? cardMult : awayCardMult;
            if (rng() < cardRollMult) {
                const playerIdx = Math.floor(rng() * active.length);
                const player = active[playerIdx];
                events.push({
                    minute,
                    type: "redCard",
                    team,
                    playerId: player.id,
                    playerName: player.name,
                    description: `RED CARD! ${player.name} is sent off!`,
                });
                active.splice(playerIdx, 1);
            }
        }
        else if (actionRoll < 0.12) {
            // Yellow card (higher chance with intensive pressing)
            const cardRollMult = team === "home" ? cardMult : awayCardMult;
            if (rng() < cardRollMult) {
                const playerIdx = Math.floor(rng() * active.length);
                const player = active[playerIdx];
                yellowCards[player.id] = (yellowCards[player.id] || 0) + 1;
                if (yellowCards[player.id] >= 2) {
                    events.push({
                        minute,
                        type: "redCard",
                        team,
                        playerId: player.id,
                        playerName: player.name,
                        description: `Second yellow card! ${player.name} is sent off!`,
                    });
                    active.splice(playerIdx, 1);
                }
                else {
                    events.push({
                        minute,
                        type: "yellowCard",
                        team,
                        playerId: player.id,
                        playerName: player.name,
                        description: `Yellow card for ${player.name}.`,
                    });
                }
            }
        }
        else if (actionRoll < 0.20) {
            // Foul
            events.push({
                minute,
                type: "foul",
                team: team === "home" ? "away" : "home",
                description: `Foul by ${team === "home" ? "away" : "home"} player.`,
            });
        }
        else if (actionRoll < 0.60) {
            // Shot
            if (isHomeAction)
                homeShots++;
            else
                awayShots++;
            const shotQuality = rng();
            const attackPower = isHomeAction ? homeS.attack : awayS.attack;
            const defPower = isHomeAction ? awayS.defense : homeS.defense;
            const goalChance = (attackPower / (attackPower + defPower)) * 0.45;
            const playerIdx = Math.floor(rng() * active.length);
            const player = active[playerIdx];
            if (shotQuality < goalChance) {
                if (isHomeAction) {
                    homeScore++;
                    homeShotsOnTarget++;
                }
                else {
                    awayScore++;
                    awayShotsOnTarget++;
                }
                events.push({
                    minute,
                    type: "goal",
                    team,
                    playerId: player.id,
                    playerName: player.name,
                    description: `GOAL! ${player.name} scores for ${team}!`,
                });
            }
            else if (shotQuality < goalChance + 0.25) {
                if (isHomeAction)
                    homeShotsOnTarget++;
                else
                    awayShotsOnTarget++;
                events.push({
                    minute,
                    type: "save",
                    team: team === "home" ? "away" : "home",
                    description: `Great save by ${team === "home" ? "away" : "home"} goalkeeper.`,
                });
            }
            else {
                events.push({
                    minute,
                    type: "chance",
                    team,
                    description: `${player.name} takes a shot but it goes wide.`,
                });
            }
        }
    }
    // Overtime if needed
    let overtime = false;
    if (forceOvertime && homeScore === awayScore) {
        overtime = true;
        for (let minute = 91; minute <= 100; minute++) {
            const homeS = getTeamStrengths(homeActive, home.rating, currentHomePressing);
            const awayS = getTeamStrengths(awayActive, away.rating, currentAwayPressing);
            const homeChance = homeS.power / (homeS.power + awayS.power);
            if (rng() > 0.3)
                continue;
            const isHomeAction = rng() < homeChance;
            const shotQuality = rng();
            const active = isHomeAction ? homeActive : awayActive;
            if (active.length === 0)
                continue;
            if (shotQuality < 0.15) {
                const player = active[Math.floor(rng() * active.length)];
                if (isHomeAction) {
                    homeScore++;
                    homeShots++;
                    homeShotsOnTarget++;
                }
                else {
                    awayScore++;
                    awayShots++;
                    awayShotsOnTarget++;
                }
                events.push({
                    minute,
                    type: "goal",
                    team: isHomeAction ? "home" : "away",
                    playerId: player.id,
                    playerName: player.name,
                    description: `OVERTIME GOAL! ${player.name} scores!`,
                });
            }
        }
    }
    const lastHomeS = getTeamStrengths(homeActive, home.rating, currentHomePressing);
    const lastAwayS = getTeamStrengths(awayActive, away.rating, currentAwayPressing);
    let winner = "draw";
    if (homeScore > awayScore)
        winner = "home";
    if (awayScore > homeScore)
        winner = "away";
    return {
        homeScore,
        awayScore,
        winner,
        seed,
        events,
        homeStats: {
            possession: Math.round((lastHomeS.power / (lastHomeS.power + lastAwayS.power) || 0.5) * 100),
            shots: homeShots,
            shotsOnTarget: homeShotsOnTarget,
        },
        awayStats: {
            possession: Math.round((lastAwayS.power / (lastHomeS.power + lastAwayS.power) || 0.5) * 100),
            shots: awayShots,
            shotsOnTarget: awayShotsOnTarget,
        },
        overtime,
    };
}
/**
 * Calculates a risk rating (0-100) for a team based on their pressing and current cards.
 */
function calculateRiskRating(pressing, activePlayers, yellowCards) {
    let risk = 0;
    // Base risk from pressing
    if (pressing === "INTENSIVE")
        risk += 40;
    else if (pressing === "MEDIUM")
        risk += 20;
    else
        risk += 10;
    // Additional risk from players with yellow cards
    const playersOnYellow = activePlayers.filter(p => (yellowCards[p.id] || 0) > 0);
    risk += playersOnYellow.length * 15;
    // Cap at 100
    return Math.min(risk, 100);
}
