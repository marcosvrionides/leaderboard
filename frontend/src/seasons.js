import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { computeStandings } from "./stats";

// Matches saved before seasons existed have no season: they're season 1.
export const matchSeason = (match) => match.season ?? 1;

// selection: a season number, or "all" for every season combined.
export const filterBySeason = (matches, selection) =>
	!matches || selection === "all"
		? matches
		: matches.filter((m) => matchSeason(m) === selection);

export const seasonLabel = (selection) =>
	selection === "all" ? "All time" : `Season ${selection}`;

/**
 * Winners of every finished season (those before `currentSeason` that had
 * games), newest first: [{ season, champion, rating, matchCount, from, to }].
 */
export const pastChampions = (matches, currentSeason) => {
	const result = [];
	for (let season = currentSeason - 1; season >= 1; season--) {
		const seasonMatches = filterBySeason(matches || [], season);
		if (seasonMatches.length === 0) continue;
		const { rankings } = computeStandings(seasonMatches);
		const times = seasonMatches.map((m) => m.timestamp);
		result.push({
			season,
			champion: rankings[0].player,
			rating: rankings[0].elo,
			matchCount: seasonMatches.length,
			from: Math.min(...times),
			to: Math.max(...times),
		});
	}
	return result;
};

/**
 * The season being viewed, kept in the URL (?season=2 or ?season=all) so it
 * survives reloads and links. No parameter means the current season.
 */
export const useSeasonSelection = (currentSeason) => {
	const [params, setParams] = useSearchParams();
	const raw = params.get("season");
	const n = Number(raw);
	const selected =
		raw === "all"
			? "all"
			: Number.isInteger(n) && n >= 1 && n <= currentSeason
				? n
				: currentSeason;

	const select = useCallback(
		(value) =>
			setParams(
				value === currentSeason ? {} : { season: String(value) },
				{
					replace: true,
				},
			),
		[setParams, currentSeason],
	);

	return {
		selected,
		select,
		isCurrent: selected === currentSeason,
		// Append to links so other pages show the same season.
		query: selected === currentSeason ? "" : `?season=${selected}`,
	};
};
