import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch } from "../api";
import useBoardPassword from "../useBoardPassword";
import { cleanName, playerKey } from "../stats";

const emptyParticipant = () => ({ name: "", gamesWon: "" });

const AddMatchModal = ({ board, knownPlayerNames, onClose, onSaved }) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const [participants, setParticipants] = useState([
		emptyParticipant(),
		emptyParticipant(),
	]);
	const [note, setNote] = useState("");
	const [password, setPassword] = useState(savedPassword);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);

	const updateParticipant = (index, field, value) =>
		setParticipants((prev) =>
			prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
		);

	const handleSubmit = async () => {
		// Use an existing player's spelling when the name matches them
		// ignoring capitals and spacing, so "marcos " joins "Marcos".
		const known = new Map(knownPlayerNames.map((n) => [playerKey(n), n]));
		const trimmed = participants.map((p) => ({
			name: known.get(playerKey(p.name)) || cleanName(p.name),
			gamesWon: p.gamesWon,
		}));

		if (
			trimmed.length < 2 ||
			trimmed.some((p) => !p.name || p.gamesWon === "") ||
			!password
		) {
			setError(
				"All player names, scores, and the leaderboard password are required.",
			);
			return;
		}
		const keys = trimmed.map((p) => playerKey(p.name));
		if (new Set(keys).size !== keys.length) {
			setError("Each player can only appear once in a match.");
			return;
		}

		setError(null);
		setSubmitting(true);
		try {
			await apiFetch("/api/matches", {
				method: "POST",
				password,
				body: {
					participants: trimmed.map((p) => ({
						playerName: p.name,
						gamesWon: parseInt(p.gamesWon, 10),
					})),
					note: note.trim() || null,
					timestamp: Date.now(),
					leaderboard: { name: board },
				},
			});
			remember(password);
			onSaved();
		} catch (e) {
			if (e.status === 403) forget();
			setError(
				e.status === 404
					? "This leaderboard no longer exists."
					: e.message,
			);
			setSubmitting(false);
		}
	};

	return (
		<Modal title="Add Game" onClose={onClose}>
			<div className="modal-body">
				<div className="modal-participants-list">
					{participants.map((p, index) => (
						<div className="modal-participant-row" key={index}>
							<div className="form-field participant-name-field">
								<label>Player {index + 1}</label>
								<input
									type="text"
									placeholder="Name"
									autoComplete="off"
									list="known-player-names"
									value={p.name}
									onChange={(e) =>
										updateParticipant(
											index,
											"name",
											e.target.value,
										)
									}
								/>
							</div>
							<div className="form-field participant-score-field">
								<label>Games Won</label>
								<input
									type="number"
									placeholder="0"
									min="0"
									value={p.gamesWon}
									onChange={(e) =>
										updateParticipant(
											index,
											"gamesWon",
											e.target.value,
										)
									}
								/>
							</div>
							{participants.length > 2 && (
								<button
									type="button"
									className="remove-participant-button"
									onClick={() =>
										setParticipants((prev) =>
											prev.filter((_, i) => i !== index),
										)
									}
									title="Remove player"
									aria-label="Remove player"
								>
									✕
								</button>
							)}
						</div>
					))}
				</div>

				<button
					type="button"
					className="add-participant-button"
					onClick={() =>
						setParticipants((prev) => [...prev, emptyParticipant()])
					}
				>
					+ Add Player
				</button>

				<datalist id="known-player-names">
					{knownPlayerNames.map((playerName) => (
						<option key={playerName} value={playerName} />
					))}
				</datalist>

				<div className="form-field">
					<label>Note (optional)</label>
					<input
						type="text"
						placeholder="e.g. Final of the season"
						autoComplete="off"
						value={note}
						onChange={(e) => setNote(e.target.value)}
					/>
				</div>

				<PasswordField value={password} onChange={setPassword} />

				{error && <div className="modal-error">{error}</div>}
			</div>

			<button
				className="modal-submit"
				onClick={handleSubmit}
				disabled={submitting}
			>
				{submitting ? "Saving…" : "Save Game"}
			</button>
		</Modal>
	);
};

export default AddMatchModal;
