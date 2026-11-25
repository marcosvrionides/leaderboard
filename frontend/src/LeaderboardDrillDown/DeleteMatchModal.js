import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch } from "../api";
import { formatDate } from "../stats";
import useBoardPassword from "../useBoardPassword";

const DeleteMatchModal = ({ board, match, onClose, onDeleted }) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const [password, setPassword] = useState(savedPassword);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState(null);

	const summary = [...match.participants]
		.sort((a, b) => b.gamesWon - a.gamesWon)
		.map((p) => `${p.playerName} ${p.gamesWon}`)
		.join(" · ");

	const handleDelete = async () => {
		if (!password) {
			setError("Enter the leaderboard password to delete this match.");
			return;
		}
		setError(null);
		setDeleting(true);
		try {
			await apiFetch(`/api/matches/${match.id}`, {
				method: "DELETE",
				password,
			});
			remember(password);
			onDeleted();
		} catch (e) {
			if (e.status === 403) forget();
			if (e.status === 404) {
				// Someone else already deleted it: just refresh.
				onDeleted();
				return;
			}
			setError(e.message);
			setDeleting(false);
		}
	};

	return (
		<Modal title="Delete Match" onClose={onClose}>
			<div className="modal-body">
				<div className="modal-summary">
					<div className="modal-summary-date">
						{formatDate(match.timestamp)}
					</div>
					<div className="modal-summary-text">{summary}</div>
					{match.note && (
						<div className="modal-summary-note">{match.note}</div>
					)}
				</div>
				<p className="modal-text">
					This permanently removes the match. Everyone's Elo ratings
					are recalculated as if it was never played.
				</p>
				<PasswordField value={password} onChange={setPassword} />
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className="modal-submit danger"
				onClick={handleDelete}
				disabled={deleting}
			>
				{deleting ? "Deleting…" : "Delete Match"}
			</button>
		</Modal>
	);
};

export default DeleteMatchModal;
