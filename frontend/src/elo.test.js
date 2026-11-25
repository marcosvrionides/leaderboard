import {
	computeEloRatings,
	expectedScore,
	formatEloChange,
	K_FACTOR,
	STARTING_RATING,
} from "./elo";

const match = (id, timestamp, scores) => ({
	id,
	timestamp,
	participants: Object.entries(scores).map(([playerName, gamesWon]) => ({
		playerName,
		gamesWon,
	})),
});

test("equal players: winner gains and loser loses half of K", () => {
	const { ratings, changesByMatchId } = computeEloRatings([
		match(1, 100, { Alice: 3, Bob: 1 }),
	]);

	expect(ratings.get("Alice")).toBeCloseTo(STARTING_RATING + K_FACTOR / 2);
	expect(ratings.get("Bob")).toBeCloseTo(STARTING_RATING - K_FACTOR / 2);
	expect(changesByMatchId.get(1).get("Alice")).toBeCloseTo(K_FACTOR / 2);
});

test("a draw between equal players changes nothing", () => {
	const { ratings } = computeEloRatings([
		match(1, 100, { Alice: 2, Bob: 2 }),
	]);

	expect(ratings.get("Alice")).toBeCloseTo(STARTING_RATING);
	expect(ratings.get("Bob")).toBeCloseTo(STARTING_RATING);
});

test("two-player matches are zero-sum", () => {
	const { ratings } = computeEloRatings([
		match(1, 100, { Alice: 3, Bob: 1 }),
		match(2, 200, { Bob: 3, Carol: 0 }),
		match(3, 300, { Carol: 2, Alice: 1 }),
	]);

	const total = [...ratings.values()].reduce((a, b) => a + b, 0);
	expect(total).toBeCloseTo(STARTING_RATING * 3);
});

test("beating a stronger player is worth more than beating a weaker one", () => {
	const history = [
		match(1, 100, { Alice: 3, Bob: 0 }),
		match(2, 200, { Alice: 3, Bob: 0 }),
	];
	const { changesByMatchId: upset } = computeEloRatings([
		...history,
		match(3, 300, { Bob: 3, Alice: 0 }),
	]);
	const { changesByMatchId: expected } = computeEloRatings([
		...history,
		match(3, 300, { Alice: 3, Bob: 0 }),
	]);

	expect(upset.get(3).get("Bob")).toBeGreaterThan(
		expected.get(3).get("Alice"),
	);
});

test("matches are replayed in the order they were played, not the order given", () => {
	const ordered = computeEloRatings([
		match(1, 100, { Alice: 3, Bob: 0 }),
		match(2, 200, { Bob: 3, Alice: 0 }),
	]);
	const shuffled = computeEloRatings([
		match(2, 200, { Bob: 3, Alice: 0 }),
		match(1, 100, { Alice: 3, Bob: 0 }),
	]);

	expect(shuffled.ratings.get("Alice")).toBeCloseTo(
		ordered.ratings.get("Alice"),
	);
	// Bob won the second match while rated lower, so he ends up ahead.
	expect(ordered.ratings.get("Bob")).toBeGreaterThan(
		ordered.ratings.get("Alice"),
	);
});

test("multi-player match: first beats everyone, last loses to everyone", () => {
	const { ratings } = computeEloRatings([
		match(1, 100, { Alice: 5, Bob: 3, Carol: 1 }),
	]);

	// Alice wins both pairings: (K/2) * 2 pairings / 2 opponents = K/2.
	expect(ratings.get("Alice")).toBeCloseTo(STARTING_RATING + K_FACTOR / 2);
	expect(ratings.get("Bob")).toBeCloseTo(STARTING_RATING);
	expect(ratings.get("Carol")).toBeCloseTo(STARTING_RATING - K_FACTOR / 2);
});

test("player order within a match doesn't affect the result", () => {
	const a = computeEloRatings([
		match(1, 100, { Alice: 3, Bob: 1 }),
		match(2, 200, { Alice: 2, Bob: 1, Carol: 2 }),
	]);
	const b = computeEloRatings([
		match(1, 100, { Bob: 1, Alice: 3 }),
		match(2, 200, { Carol: 2, Bob: 1, Alice: 2 }),
	]);

	["Alice", "Bob", "Carol"].forEach((name) =>
		expect(b.ratings.get(name)).toBeCloseTo(a.ratings.get(name)),
	);
});

test("expectedScore is symmetric and 0.5 for equal ratings", () => {
	expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
	expect(expectedScore(1200, 1000) + expectedScore(1000, 1200)).toBeCloseTo(
		1,
	);
});

test("handles no matches", () => {
	expect(computeEloRatings([]).ratings.size).toBe(0);
	expect(computeEloRatings(null).ratings.size).toBe(0);
});

test("formatEloChange uses a sign and rounds", () => {
	expect(formatEloChange(15.6)).toBe("+16");
	expect(formatEloChange(-11.52)).toBe("−12");
	expect(formatEloChange(0.3)).toBe("±0");
	expect(formatEloChange(-0.4)).toBe("±0");
});
