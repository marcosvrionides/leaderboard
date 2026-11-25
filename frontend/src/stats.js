import { computeEloRatings, STARTING_RATING } from "./elo";

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
