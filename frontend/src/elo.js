// Elo ratings, replayed from a leaderboard's full match history.
//
// Ratings aren't stored anywhere: they're recomputed from scratch every time,
// in the order the matches were played. That means existing leaderboards get
// ratings immediately, and deleting a match automatically corrects everyone's
// rating as if that match never happened.
//
// Matches with more than two players are scored as a set of head-to-head
// results: every participant is compared with every other participant (more
// games won = win, equal = draw). Each player's change is the average of those
// pairwise results, scaled by K, so a two-player match is exactly classic Elo
// and a bigger match doesn't swing ratings harder just for having more people.

export const STARTING_RATING = 1000;
export const K_FACTOR = 32;

// Probability that a player rated `rating` beats one rated `opponentRating`.
export const expectedScore = (rating, opponentRating) =>
	1 / (1 + Math.pow(10, (opponentRating - rating) / 400));

// A rating change as "+16", "−16" (true minus sign) or "±0".
export const formatEloChange = (change) => {
	const rounded = Math.round(change);
	if (rounded === 0) return "±0";
	return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
};

const byPlayOrder = (a, b) =>
	a.timestamp - b.timestamp || (a.id ?? 0) - (b.id ?? 0);

/**
 * Replays `matches` oldest-first and returns:
 *  - ratings:      Map of playerName -> current rating
 *  - changesByMatchId: Map of match id -> Map of playerName -> rating change
 *    from that match (useful for showing "+16" next to a result)
 *  - history:      Map of playerName -> [{ matchId, timestamp, rating, change }]
 *    in play order, where rating is the rating *after* that match
 */
export const computeEloRatings = (matches) => {
	const ratings = new Map();
	const changesByMatchId = new Map();
	const history = new Map();
	const ratingOf = (name) => ratings.get(name) ?? STARTING_RATING;

	[...(matches || [])].sort(byPlayOrder).forEach((match) => {
		const participants = match.participants || [];
		const changes = new Map();

		// Every participant is scored against the ratings from *before* this
		// match, so the order players are listed in doesn't matter.
		participants.forEach((player) => {
			const opponents = participants.filter(
				(other) => other.playerName !== player.playerName,
			);
			if (opponents.length === 0) return;

			const total = opponents.reduce((sum, opponent) => {
				const actual =
					player.gamesWon > opponent.gamesWon
						? 1
						: player.gamesWon === opponent.gamesWon
							? 0.5
							: 0;
				const expected = expectedScore(
					ratingOf(player.playerName),
					ratingOf(opponent.playerName),
				);
				return sum + (actual - expected);
			}, 0);

			changes.set(
				player.playerName,
				(changes.get(player.playerName) ?? 0) +
					(K_FACTOR * total) / opponents.length,
			);
		});

		changes.forEach((change, name) => {
			const rating = ratingOf(name) + change;
			ratings.set(name, rating);
			if (!history.has(name)) history.set(name, []);
			history.get(name).push({
				matchId: match.id,
				timestamp: match.timestamp,
				rating,
				change,
			});
		});
		if (match.id != null) changesByMatchId.set(match.id, changes);
	});

	return { ratings, changesByMatchId, history };
};
