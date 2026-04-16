import seedrandom from "seedrandom";

export interface PlayerStats {
  id: string;
  name: string;
  ovr: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
  form: number;
  fatigue: number;
  position: string;
  role: string;
  style: string;
}

export type PressingType = "SOFT" | "MEDIUM" | "INTENSIVE";

export interface Substitution {
  minute: number;
  team: "home" | "away";
  outId: string;
  inId: string;
}

export interface PressingChange {
  minute: number;
  team: "home" | "away";
  type: PressingType;
}

export interface TeamInput {
  rating: number;
  formation: string;
  starters: PlayerStats[];
  bench: PlayerStats[];
  pressingType: PressingType;
}

export interface MatchEvent {
  minute: number;
  type:
    | "goal"
    | "save"
    | "chance"
    | "foul"
    | "injury"
    | "redCard"
    | "yellowCard"
    | "substitution";
  team: "home" | "away";
  playerId?: string;
  playerName?: string;
  description: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "draw";
  seed: string;
  events: MatchEvent[];
  homeStats: { possession: number; shots: number; shotsOnTarget: number };
  awayStats: { possession: number; shots: number; shotsOnTarget: number };
  overtime: boolean;
}

function getLineStrength(
  players: PlayerStats[],
  roles: string[],
  weights: Record<string, number>,
  pressingType: PressingType,
): number {
  const linePlayers = players.filter((p) => roles.includes(p.role));
  if (linePlayers.length === 0) return 30;

  let pressingMult = 1.0;
  if (pressingType === "INTENSIVE") pressingMult = 1.4;
  if (pressingType === "SOFT") pressingMult = 0.75;

  return (
    linePlayers.reduce((sum, p) => {
      let val = 0;
      for (const [stat, weight] of Object.entries(weights)) {
        val += (p as any)[stat] * weight;
      }
      const fatigueFactor = pressingType === "INTENSIVE" ? 2.5 : 1.0;
      val *= (p.form / 100) * (1 - (p.fatigue * fatigueFactor) / 200);
      return sum + val * pressingMult;
    }, 0) / linePlayers.length
  );
}

export function simulateMatch(
  home: TeamInput,
  away: TeamInput,
  seed: string,
  options: {
    forceOvertime?: boolean;
    manualSubstitutions?: Substitution[];
    pressingChanges?: PressingChange[];
    lockedEvents?: MatchEvent[];
    skipUntilMinute?: number;
  } = {},
): MatchResult {
  const {
    forceOvertime = false,
    manualSubstitutions = [],
    pressingChanges = [],
    lockedEvents = [],
    skipUntilMinute = 0,
  } = options;
  const rng = seedrandom(seed);
  const events: MatchEvent[] = [];

  const homeActive = [...home.starters];
  const awayActive = [...away.starters];
  const homeBench = [...home.bench];
  const awayBench = [...away.bench];

  let currentHomePressing = home.pressingType;
  let currentAwayPressing = away.pressingType;

  const homeYellowCards: Record<string, number> = {};
  const awayYellowCards: Record<string, number> = {};

  let homeScore = 0;
  let awayScore = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;

  const totalMinutes = 90;

  const getTeamStrengths = (
    activeStarters: PlayerStats[],
    rating: number,
    pressing: PressingType,
  ) => {
    const attackPlayers = activeStarters.filter((p) =>
      ["FORWARD", "MIDFIELDER"].includes(p.role),
    );
    const defensePlayers = activeStarters.filter((p) =>
      ["DEFENDER", "GOALKEEPER"].includes(p.role),
    );

    const attack = getLineStrength(
      activeStarters,
      ["FORWARD", "MIDFIELDER"],
      {
        shooting: 0.35,
        pace: 0.2,
        dribbling: 0.2,
        passing: 0.15,
        physical: 0.1,
      },
      pressing,
    );

    const defense = getLineStrength(
      activeStarters,
      ["DEFENDER", "GOALKEEPER"],
      {
        defending: 0.35,
        physical: 0.2,
        pace: 0.15,
        goalkeeping: 0.5,
        passing: 0.1,
      },
      pressing,
    );

    let tacticalBonus = 0;
    activeStarters.forEach((p) => {
      if (p.position === "CDM") tacticalBonus += p.defending * 0.05;
      if (p.position === "CAM") tacticalBonus += p.passing * 0.05;
      if (["LW", "RW"].includes(p.position)) tacticalBonus += p.pace * 0.03;
    });

    const shortagePenalty =
      activeStarters.length < 11 ? activeStarters.length / 11 : 1;

    return {
      attack: (attack + tacticalBonus * 0.6) * shortagePenalty,
      defense: (defense + tacticalBonus * 0.4) * shortagePenalty,
      power:
        (attack * 0.6 + defense * 0.4 + rating * 0.1 + tacticalBonus) *
        shortagePenalty,
    };
  };

  for (let minute = 1; minute <= totalMinutes; minute++) {
    const currentSubs = manualSubstitutions.filter((s) => s.minute === minute);
    for (const sub of currentSubs) {
      const active = sub.team === "home" ? homeActive : awayActive;
      const bench = sub.team === "home" ? homeBench : awayBench;
      const playerIdx = active.findIndex((p) => p.id === sub.outId);
      const benchIdx = bench.findIndex((p) => p.id === sub.inId);

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

    const currentTactics = pressingChanges.filter((c) => c.minute === minute);
    for (const tactic of currentTactics) {
      if (tactic.team === "home") currentHomePressing = tactic.type;
      else currentAwayPressing = tactic.type;

      events.push({
        minute,
        type: "substitution",
        team: tactic.team,
        description: `Tactical change: Team switched to ${tactic.type} pressing.`,
      });
    }

    const lockedThisMinute = lockedEvents.filter((e) => e.minute === minute);
    if (lockedThisMinute.length > 0) {
      for (const e of lockedThisMinute) {
        const teamActive = e.team === "home" ? homeActive : awayActive;
        const teamBench = e.team === "home" ? homeBench : awayBench;
        const teamCards = e.team === "home" ? homeYellowCards : awayYellowCards;

        if (e.type === "goal") {
          if (e.team === "home") homeScore++;
          else awayScore++;
        } else if (e.type === "yellowCard" && e.playerId) {
          teamCards[e.playerId] = (teamCards[e.playerId] || 0) + 1;
        } else if (e.type === "redCard" && e.playerId) {
          const idx = teamActive.findIndex((p) => p.id === e.playerId);
          if (idx !== -1) teamActive.splice(idx, 1);
        } else if (e.type === "injury" && e.playerId) {
          const idx = teamActive.findIndex((p) => p.id === e.playerId);
          if (idx !== -1) {
            const injured = teamActive.splice(idx, 1)[0];
            if (teamBench.length > 0) {
              const sub = teamBench.shift()!;
              teamActive.push(sub);
            }
          }
        }
        events.push(e);
      }

      continue;
    }

    if (minute < skipUntilMinute) continue;

    const roll = rng();
    if (roll > 0.25) continue;

    const homeS = getTeamStrengths(
      homeActive,
      home.rating,
      currentHomePressing,
    );
    const awayS = getTeamStrengths(
      awayActive,
      away.rating,
      currentAwayPressing,
    );
    const homeChance = homeS.power / (homeS.power + awayS.power);

    const actionRoll = rng();
    const isHomeAction = rng() < homeChance;
    const team = isHomeAction ? "home" : "away";
    const active = isHomeAction ? homeActive : awayActive;
    const bench = isHomeAction ? homeBench : awayBench;
    const yellowCards = isHomeAction ? homeYellowCards : awayYellowCards;
    const pressing = isHomeAction ? currentHomePressing : currentAwayPressing;

    if (active.length === 0) continue;

    const cardMult =
      currentHomePressing === "INTENSIVE"
        ? 2.0
        : currentHomePressing === "SOFT"
          ? 0.6
          : 1.0;
    const awayCardMult =
      currentAwayPressing === "INTENSIVE"
        ? 2.0
        : currentAwayPressing === "SOFT"
          ? 0.6
          : 1.0;

    if (actionRoll < 0.03) {
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
          const sub = bench.shift()!;
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
    } else if (actionRoll < 0.05) {
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
    } else if (actionRoll < 0.12) {
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
        } else {
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
    } else if (actionRoll < 0.2) {
      events.push({
        minute,
        type: "foul",
        team: team === "home" ? "away" : "home",
        description: `Foul by ${team === "home" ? "away" : "home"} player.`,
      });
    } else if (actionRoll < 0.6) {
      if (isHomeAction) homeShots++;
      else awayShots++;

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
        } else {
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
      } else if (shotQuality < goalChance + 0.25) {
        if (isHomeAction) homeShotsOnTarget++;
        else awayShotsOnTarget++;
        events.push({
          minute,
          type: "save",
          team: team === "home" ? "away" : "home",
          description: `Great save by ${team === "home" ? "away" : "home"} goalkeeper.`,
        });
      } else {
        events.push({
          minute,
          type: "chance",
          team,
          description: `${player.name} takes a shot but it goes wide.`,
        });
      }
    }
  }

  let overtime = false;
  if (forceOvertime && homeScore === awayScore) {
    overtime = true;
    for (let minute = 91; minute <= 100; minute++) {
      const homeS = getTeamStrengths(
        homeActive,
        home.rating,
        currentHomePressing,
      );
      const awayS = getTeamStrengths(
        awayActive,
        away.rating,
        currentAwayPressing,
      );
      const homeChance = homeS.power / (homeS.power + awayS.power);

      if (rng() > 0.3) continue;

      const isHomeAction = rng() < homeChance;
      const shotQuality = rng();
      const active = isHomeAction ? homeActive : awayActive;
      if (active.length === 0) continue;

      if (shotQuality < 0.15) {
        const player = active[Math.floor(rng() * active.length)];
        if (isHomeAction) {
          homeScore++;
          homeShots++;
          homeShotsOnTarget++;
        } else {
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

  const lastHomeS = getTeamStrengths(
    homeActive,
    home.rating,
    currentHomePressing,
  );
  const lastAwayS = getTeamStrengths(
    awayActive,
    away.rating,
    currentAwayPressing,
  );

  let winner: "home" | "away" | "draw" = "draw";
  if (homeScore > awayScore) winner = "home";
  if (awayScore > homeScore) winner = "away";

  return {
    homeScore,
    awayScore,
    winner,
    seed,
    events,
    homeStats: {
      possession: Math.round(
        (lastHomeS.power / (lastHomeS.power + lastAwayS.power) || 0.5) * 100,
      ),
      shots: homeShots,
      shotsOnTarget: homeShotsOnTarget,
    },
    awayStats: {
      possession: Math.round(
        (lastAwayS.power / (lastHomeS.power + lastAwayS.power) || 0.5) * 100,
      ),
      shots: awayShots,
      shotsOnTarget: awayShotsOnTarget,
    },
    overtime,
  };
}

export function calculateRiskRating(
  pressing: PressingType,
  activePlayers: PlayerStats[],
  yellowCards: Record<string, number>,
): number {
  let risk = 0;

  if (pressing === "INTENSIVE") risk += 40;
  else if (pressing === "MEDIUM") risk += 20;
  else risk += 10;

  const playersOnYellow = activePlayers.filter(
    (p) => (yellowCards[p.id] || 0) > 0,
  );
  risk += playersOnYellow.length * 15;

  return Math.min(risk, 100);
}
