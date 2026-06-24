import { useState, useCallback } from "react";

const STORAGE_KEY = "lb_favourites";

const loadFavourites = () => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
};

export const useFavourites = () => {
	const [favourites, setFavourites] = useState(loadFavourites);

	const toggleFavourite = useCallback((name) => {
		setFavourites((prev) => {
			const next = prev.includes(name)
				? prev.filter((n) => n !== name)
				: [...prev, name];
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			return next;
		});
	}, []);

	const isFavourite = useCallback(
		(name) => favourites.includes(name),
		[favourites],
	);

	return { favourites, toggleFavourite, isFavourite };
};
