// URL builders, so names with spaces or symbols are always encoded the same way.
export const boardPath = (board) => `/leaderboard/${encodeURIComponent(board)}`;

export const playerPath = (board, player) =>
	`${boardPath(board)}/player/${encodeURIComponent(player)}`;
