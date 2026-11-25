import {
	computePlayerProfile,
	computeStandings,
	headToHead,
	playerResult,
	getMatchWinnerNames,
	normaliseMatches,
	playerKey,
	plural,
} from "./stats";

const match = (id, timestamp, scores) => ({
	id,
	timestamp,
	participants: Object.entries(scores).map(([playerName, gamesWon]) => ({
		playerName,
		gamesWon,
	})),
});

test("playerKey ignores capitals and spacing", () => {
	expect(playerKey("  Marcos  V ")).toBe("marcos v");
	expect(playerKey("marcos v")).toBe(playerKey("MARCOS   V"));
});

test("normaliseMatches merges spellings into the most used one", () => {
	const matches = normaliseMatches([
		match(1, 100, { Marcos: 3, Sam: 1 }),
		match(2, 200, { "marcos ": 3, sam: 1 }),
		match(3, 300, { Marcos: 2, Sam: 3 }),
	]);
	const names = new Set(
		matches.flatMap((m) => m.participants.map((p) => p.playerName)),
	);
	expect([...names].sort()).toEqual(["Marcos", "Sam"]);
});

test("normaliseMatches breaks ties with the most recent spelling", () => {
	const matches = normaliseMatches([
		match(1, 100, { jo: 3, Sam: 1 }),
		match(2, 200, { Jo: 3, Sam: 1 }),
	]);
	expect(matches[0].participants[0].playerName).toBe("Jo");
});

test("normaliseMatches doesn't modify its input", () => {
	const input = [match(1, 100, { "sam ": 3, Sam: 1 })];
	normaliseMatches(input);
	expect(input[0].participants[0].playerName).toBe("sam ");
});

test("standings treat differently-typed names as one player", () => {
	const { rankings } = computeStandings(
		normaliseMatches([
			match(1, 100, { Marcos: 3, Sam: 1 }),
			match(2, 200, { marcos: 3, Sam: 1 }),
			match(3, 300, { Marcos: 3, Sam: 1 }),
		]),
	);
	expect(rankings).toHaveLength(2);
	expect(rankings[0]).toMatchObject({
		player: "Marcos",
		matchWins: 3,
		played: 3,
	});
});

test("match winner needs an outright top score", () => {
	expect(
		getMatchWinnerNames(match(1, 1, { A: 3, B: 1 }).participants),
	).toEqual(["A"]);
	expect(
		getMatchWinnerNames(match(1, 1, { A: 2, B: 2 }).participants),
	).toEqual([]);
});

test("plural", () => {
	expect(plural(1, "match", "matches")).toBe("1 match");
	expect(plural(0, "match", "matches")).toBe("0 matches");
	expect(plural(3, "game")).toBe("3 games");
});

describe("player profile", () => {
	const matches = [
		match(1, 100, { Alice: 3, Bob: 1 }),
		match(2, 200, { Alice: 3, Bob: 0 }),
		match(3, 300, { Alice: 2, Bob: 2 }),
		match(4, 400, { Bob: 3, Alice: 1, Cat: 0 }),
		match(5, 500, { Alice: 3, Cat: 1 }),
		match(6, 600, { Alice: 3, Cat: 2 }),
	];
	const { elo } = computeStandings(matches);
	const profile = computePlayerProfile(matches, "Alice", elo);

	test("counts results", () => {
		expect(profile).toMatchObject({
			played: 6,
			wins: 4,
			draws: 1,
			losses: 1,
		});
		expect(profile.winRate).toBeCloseTo(4 / 6);
	});

	test("form is the last five results, oldest first", () => {
		expect(profile.form).toEqual(["W", "D", "L", "W", "W"]);
	});

	test("streaks", () => {
		expect(profile.streak).toEqual({ result: "W", count: 2 });
		expect(profile.longestWinStreak).toBe(2);
	});

	test("rating history and peak", () => {
		expect(profile.history).toHaveLength(6);
		expect(profile.peakRating).toBeGreaterThanOrEqual(profile.rating);
		expect(profile.matches[0].id).toBe(6);
	});

	test("head-to-head counts every match both played, including 3-player ones", () => {
		const bob = profile.rivals.find((r) => r.opponent === "Bob");
		expect(bob).toMatchObject({ played: 4, wins: 2, draws: 1, losses: 1 });
		// In match 4 Alice (1) beat Cat (0) head-to-head even though Bob won.
		expect(headToHead(matches, "Alice", "Cat")).toMatchObject({
			wins: 3,
			losses: 0,
		});
	});

	test("unknown player has no profile", () => {
		expect(computePlayerProfile(matches, "Zed", elo)).toBeNull();
	});
});

test("playerResult", () => {
	const m = match(1, 1, { A: 3, B: 3, C: 1 });
	expect(playerResult(m, "A")).toBe("D");
	expect(playerResult(m, "C")).toBe("L");
	expect(playerResult(match(1, 1, { A: 3, B: 1 }), "A")).toBe("W");
});
