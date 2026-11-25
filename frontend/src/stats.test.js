import {
	computeStandings,
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
