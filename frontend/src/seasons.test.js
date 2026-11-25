import {
	filterBySeason,
	matchSeason,
	pastChampions,
	seasonLabel,
} from "./seasons";

const match = (id, timestamp, scores, season) => ({
	id,
	timestamp,
	season,
	participants: Object.entries(scores).map(([playerName, gamesWon]) => ({
		playerName,
		gamesWon,
	})),
});

const matches = [
	match(1, 100, { A: 3, B: 1 }), // saved before seasons existed
	match(2, 200, { A: 3, B: 2 }, 1),
	match(3, 300, { B: 3, A: 0 }, 2),
	match(4, 400, { C: 3, B: 0 }, 3),
];

test("matches without a season belong to season 1", () => {
	expect(matchSeason(matches[0])).toBe(1);
	expect(filterBySeason(matches, 1).map((m) => m.id)).toEqual([1, 2]);
	expect(filterBySeason(matches, 3).map((m) => m.id)).toEqual([4]);
	expect(filterBySeason(matches, "all")).toHaveLength(4);
});

test("past champions are the winners of each finished season, newest first", () => {
	const champions = pastChampions(matches, 3);
	expect(champions.map((c) => [c.season, c.champion, c.matchCount])).toEqual([
		[2, "B", 1],
		[1, "A", 2],
	]);
	expect(champions[1]).toMatchObject({ from: 100, to: 200 });
});

test("seasons with no games are skipped", () => {
	expect(pastChampions([match(1, 1, { A: 1, B: 0 }, 2)], 3)).toHaveLength(1);
	expect(pastChampions(matches, 1)).toEqual([]);
});

test("labels", () => {
	expect(seasonLabel(2)).toBe("Season 2");
	expect(seasonLabel("all")).toBe("All time");
});
