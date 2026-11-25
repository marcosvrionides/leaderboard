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
