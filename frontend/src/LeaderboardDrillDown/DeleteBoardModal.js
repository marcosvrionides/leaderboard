import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch, seg } from "../api";
import { plural } from "../stats";
import useBoardPassword from "../useBoardPassword";

// Permanently deletes a board. Needs the password and the board's name
// typed exactly, and spells out what will be lost first.
const DeleteBoardModal = ({
	board,
	matchCount,
	seasonCount,
	tournamentCount,
	onClose,
	onDeleted,
}) => {
	const { savedPassword, forget } = useBoardPassword(board);
	const [typed, setTyped] = useState("");
	const [password, setPassword] = useState(savedPassword);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState(null);
	const confirmed = typed === board;

	const lost = [
		matchCount > 0 &&
			`${plural(matchCount, "game", "games")}${seasonCount > 1 ? ` across ${seasonCount} seasons` : ""}`,
		tournamentCount > 0 && plural(tournamentCount, "tournament"),
	].filter(Boolean);

	const remove = async () => {
		if (!confirmed) return;
		if (!password) {
			setError("Enter the leaderboard password.");
			return;
		}
		setError(null);
		setDeleting(true);
		try {
			await apiFetch(`/api/leaderboards/${seg(board)}`, {
				method: "DELETE",
				password,
			});
			forget();
			onDeleted();
		} catch (e) {
			if (e.status === 403) forget();
			setError(e.message);
			setDeleting(false);
		}
	};

	return (
		<Modal title="Delete Leaderboard" onClose={onClose}>
			<div className="modal-body">
				<div className="modal-warning">
					This permanently deletes <strong>{board}</strong>
					{lost.length > 0 ? (
						<>
							{" "}
							and everything on it:{" "}
							<strong>{lost.join(" and ")}</strong>. Player
							ratings, profiles and history go with it.
						</>
					) : (
						". It has no games yet."
					)}{" "}
					This can't be undone.
				</div>
				<div className="form-field">
					<label>Type the board name to confirm</label>
					<input
						type="text"
						placeholder={board}
						autoComplete="off"
						spellCheck={false}
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
					/>
				</div>
				<PasswordField value={password} onChange={setPassword} />
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className="modal-submit danger"
				onClick={remove}
				disabled={!confirmed || deleting}
			>
				{deleting ? "Deleting…" : "Delete Leaderboard"}
			</button>
		</Modal>
	);
};

export default DeleteBoardModal;
