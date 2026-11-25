import React, { useEffect, useState } from "react";
import { apiUrl, seg } from "../api";

// The share link goes through the backend so chat apps can build a preview
// (board name + leader); people who open it land on the board itself.
export const shareLink = (board) =>
	apiUrl(
		`/share/${seg(board)}?from=${encodeURIComponent(window.location.origin)}`,
	);

const ShareButton = ({ board, text }) => {
	const [toast, setToast] = useState(null);

	useEffect(() => {
		if (!toast) return undefined;
		const timer = setTimeout(() => setToast(null), 2500);
		return () => clearTimeout(timer);
	}, [toast]);

	const share = async () => {
		const url = shareLink(board);
		if (navigator.share) {
			try {
				await navigator.share({
					title: `${board} · Leaderboard`,
					text,
					url,
				});
				return;
			} catch (e) {
				if (e.name === "AbortError") return; // closed the share sheet
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			setToast("Link copied");
		} catch (e) {
			window.prompt("Copy this link to share the leaderboard:", url);
		}
	};

	return (
		<>
			<button type="button" className="drill-manage" onClick={share}>
				Share
			</button>
			{toast && (
				<div className="toast" role="status">
					{toast}
				</div>
			)}
		</>
	);
};

export default ShareButton;
