import { useCallback, useEffect, useState } from "react";
import { apiFetch, seg } from "./api";

/**
 * A board's settings (current season, ...). While loading, or if the
 * server is too old to provide them, `board` falls back to defaults so the
 * page still works. `notFound` is true when the board doesn't exist.
 */
const useBoard = (name) => {
	const [board, setBoard] = useState(null);
	const [notFound, setNotFound] = useState(false);

	const reload = useCallback(
		() =>
			apiFetch(`/api/leaderboards/${seg(name)}`)
				.then((data) => {
					setBoard(data);
					setNotFound(false);
				})
				.catch((e) => {
					if (e.status === 404) setNotFound(true);
					setBoard(null);
				}),
		[name],
	);

	useEffect(() => {
		reload();
	}, [reload]);

	return {
		board: board || { name, currentSeason: 1 },
		loaded: board !== null || notFound,
		notFound,
		reload,
	};
};

export default useBoard;
