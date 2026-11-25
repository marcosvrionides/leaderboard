import { computeEloRatings, STARTING_RATING } from "./elo";

// Two names refer to the same player if they only differ in capitals or
// spacing ("Marcos", "marcos", "Marcos "). Mirrors PlayerNames on the backend.
export const cleanName = (name) => (name || "").trim().replace(/\s+/g, " ");
export const playerKey = (name) => cleanName(name).toLowerCase();

/**
 * Rewrites every player name to one consistent spelling per player: the
 * most used spelling, ties going to the most recent. Old data entered
 * before names were matched automatically then shows as a single player.
 */
export const normaliseMatches = (matches) => {
	if (!matches) return matches;
	const usage = new Map(); // key -> Map(spelling -> { count, last })
	matches.forEach((m) =>
		m.participants.forEach((p) => {
			const spelling = cleanName(p.playerName);
			const key = playerKey(spelling);
			if (!usage.has(key)) usage.set(key, new Map());
			const u = usage.get(key).get(spelling) || {
				count: 0,
				last: -Infinity,
			};
			usage.get(key).set(spelling, {
				count: u.count + 1,
				last: Math.max(u.last, m.timestamp),
			});
		}),
	);
	const canonical = new Map();
	usage.forEach((spellings, key) => {
		const [best] = [...spellings.entries()].sort(
			([, a], [, b]) => b.count - a.count || b.last - a.last,
		)[0];
		canonical.set(key, best);
	});
	return matches.map((m) => ({
		...m,
		participants: m.participants.map((p) => ({
			...p,
			playerName: canonical.get(playerKey(p.playerName)),
		})),
	}));
};

// A match win is only credited when there's a single, outright top score.
// A tie for the top score means nobody gets credited for that match.
export const getMatchWinnerNames = (participants) => {
	if (!participants || participants.length === 0) return [];
	const maxScore = Math.max(...participants.map((p) => p.gamesWon));
	const topScorers = participants.filter((p) => p.gamesWon === maxScore);
	return topScorers.length === 1 ? [topScorers[0].playerName] : [];
};

export const newestFirst = (matches) =>
	[...(matches || [])].sort(
		(a, b) => b.timestamp - a.timestamp || (b.id ?? 0) - (a.id ?? 0),
	);

/**
 * Standings for a list of matches, ranked by Elo (match wins break ties).
 * Returns { rankings, elo } where elo is the full computeEloRatings result.
 */
export const computeStandings = (matches) => {
	const elo = computeEloRatings(matches);
	const stats = new Map();

	(matches || []).forEach((match) => {
		const winners = getMatchWinnerNames(match.participants);
		match.participants.forEach((p) => {
			const s = stats.get(p.playerName) || {
				matchWins: 0,
				gameWins: 0,
				played: 0,
			};
			s.gameWins += p.gamesWon;
			s.played += 1;
			if (winners.includes(p.playerName)) s.matchWins += 1;
			stats.set(p.playerName, s);
		});
	});

	const rankings = [...stats.entries()]
		.map(([player, s]) => ({
			player,
			...s,
			elo: elo.ratings.get(player) ?? STARTING_RATING,
		}))
		.sort(
			(a, b) =>
				Math.round(b.elo) - Math.round(a.elo) ||
				b.matchWins - a.matchWins ||
				a.player.localeCompare(b.player),
		);

	return { rankings, elo };
};

export const plural = (count, singular, pluralForm = `${singular}s`) =>
	`${count} ${count === 1 ? singular : pluralForm}`;

export const formatDate = (ts) =>
	new Date(ts).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

// A player's result in one match: "W" for an outright top score, "D" for a
// share of the top score, "L" otherwise.
export const playerResult = (match, player) => {
	const me = match.participants.find((p) => p.playerName === player);
	if (!me) return null;
	const top = Math.max(...match.participants.map((p) => p.gamesWon));
	if (me.gamesWon < top) return "L";
	return match.participants.filter((p) => p.gamesWon === top).length === 1
		? "W"
		: "D";
};

// Head-to-head result between two players in a match they both played:
// whoever won more games, regardless of anyone else in the match.
const pairResult = (match, player, opponent) => {
	const me = match.participants.find((p) => p.playerName === player);
	const them = match.participants.find((p) => p.playerName === opponent);
	if (!me || !them) return null;
	return me.gamesWon > them.gamesWon
		? "W"
		: me.gamesWon === them.gamesWon
			? "D"
			: "L";
};

/** Head-to-head record of `player` against `opponent` across all matches. */
export const headToHead = (matches, player, opponent) => {
	const record = { played: 0, wins: 0, draws: 0, losses: 0 };
	(matches || []).forEach((m) => {
		const r = pairResult(m, player, opponent);
		if (!r) return;
		record.played += 1;
		if (r === "W") record.wins += 1;
		else if (r === "D") record.draws += 1;
		else record.losses += 1;
	});
	return record;
};

// The run of identical results ending at the most recent match.
const currentStreak = (results) => {
	if (results.length === 0) return null;
	const latest = results[results.length - 1];
	let count = 0;
	for (let i = results.length - 1; i >= 0 && results[i] === latest; i--) {
		count += 1;
	}
	return { result: latest, count };
};

const longestWinStreak = (results) => {
	let best = 0;
	let run = 0;
	results.forEach((r) => {
		run = r === "W" ? run + 1 : 0;
		best = Math.max(best, run);
	});
	return best;
};

/**
 * Everything shown on a player's profile. `elo` is the computeEloRatings
 * result for the same matches. Returns null if the player has no matches.
 */
export const computePlayerProfile = (matches, player, elo) => {
	const played = (matches || [])
		.filter((m) => m.participants.some((p) => p.playerName === player))
		.sort((a, b) => a.timestamp - b.timestamp || (a.id ?? 0) - (b.id ?? 0));
	if (played.length === 0) return null;

	const results = played.map((m) => playerResult(m, player));
	const count = (r) => results.filter((x) => x === r).length;
	const history = elo.history.get(player) || [];
	const rating = elo.ratings.get(player) ?? STARTING_RATING;

	const opponents = new Set();
	played.forEach((m) =>
		m.participants.forEach((p) => {
			if (p.playerName !== player) opponents.add(p.playerName);
		}),
	);
	const rivals = [...opponents]
		.map((opponent) => ({
			opponent,
			opponentRating: elo.ratings.get(opponent) ?? STARTING_RATING,
			...headToHead(played, player, opponent),
		}))
		.sort(
			(a, b) =>
				b.played - a.played || a.opponent.localeCompare(b.opponent),
		);

	return {
		player,
		rating,
		peakRating: Math.max(STARTING_RATING, ...history.map((h) => h.rating)),
		played: played.length,
		wins: count("W"),
		draws: count("D"),
		losses: count("L"),
		winRate: count("W") / played.length,
		form: results.slice(-5),
		streak: currentStreak(results),
		longestWinStreak: longestWinStreak(results),
		history,
		rivals,
		matches: [...played].reverse(),
	};
};
