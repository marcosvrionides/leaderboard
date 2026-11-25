import { useCallback, useState } from "react";

// Remembers a board's password for the rest of the browser session (not
// across sessions), so people don't have to retype it for every action.
const key = (board) => `board-password:${board}`;

const read = (board) => {
	try {
		return sessionStorage.getItem(key(board)) || "";
	} catch (e) {
		return "";
	}
};

const useBoardPassword = (board) => {
	const [saved, setSaved] = useState(() => read(board));

	const remember = useCallback(
		(password) => {
			try {
				sessionStorage.setItem(key(board), password);
			} catch (e) {
				// Storage unavailable (e.g. private mode): just don't remember.
			}
			setSaved(password);
		},
		[board],
	);

	const forget = useCallback(() => {
		try {
			sessionStorage.removeItem(key(board));
		} catch (e) {}
		setSaved("");
	}, [board]);

	return { savedPassword: saved, remember, forget };
};

export default useBoardPassword;
