import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, seg } from "./api";
import { normaliseMatches } from "./stats";

/**
 * Loads a board's matches. `matches` has one consistent spelling per player
 * (see normaliseMatches); it's null while loading.
 */
const useBoardMatches = (board) => {
	const [raw, setRaw] = useState(null);
	const [error, setError] = useState(null);

	const reload = useCallback(() => {
		setError(null);
		return apiFetch(`/api/matches/leaderboard/${seg(board)}`)
			.then((data) => setRaw(data))
			.catch((err) => {
				console.error(err);
				setError("Couldn't load this leaderboard. Please try again.");
			});
	}, [board]);

	useEffect(() => {
		setRaw(null);
		reload();
	}, [reload]);

	const matches = useMemo(() => normaliseMatches(raw), [raw]);
	return { matches, error, reload };
};

export default useBoardMatches;
