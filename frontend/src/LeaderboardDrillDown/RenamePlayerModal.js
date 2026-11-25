import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch, seg } from "../api";
import { cleanName, playerKey, plural } from "../stats";
import useBoardPassword from "../useBoardPassword";

// players: [{ player, played }] for everyone on the board.
const RenamePlayerModal = ({
	board,
	players,
	initialPlayer,
	onClose,
	onRenamed,
}) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const sorted = [...players].sort((a, b) =>
		a.player.localeCompare(b.player),
	);
	const [from, setFrom] = useState(initialPlayer || sorted[0]?.player || "");
	const [to, setTo] = useState("");
	const [password, setPassword] = useState(savedPassword);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const source = players.find((p) => p.player === from);
	const newName = cleanName(to);
	const target =
		newName && playerKey(newName) !== playerKey(from)
			? players.find((p) => playerKey(p.player) === playerKey(newName))
			: null;
	const unchanged = newName === from;

	let preview = null;
	if (source && newName && !unchanged) {
		preview = target ? (
			<div className="modal-warning">
				<strong>{from}</strong> (
				{plural(source.played, "match", "matches")}) will be merged into{" "}
				<strong>{target.player}</strong> (
				{plural(target.played, "match", "matches")}). Their results are
				combined under <strong>{target.player}</strong>. This can't be
				undone.
			</div>
		) : (
			<p className="modal-text">
				<strong>{from}</strong> will be renamed to{" "}
				<strong>{newName}</strong> in{" "}
				{source.played === 1
					? "their match"
					: `all ${source.played} of their matches`}
				.
			</p>
		);
	}

	const handleSave = async () => {
		if (!from || !newName) {
			setError("Choose a player and enter their new name.");
			return;
		}
		if (unchanged) {
			setError(`That's already ${from}'s name.`);
			return;
		}
		if (!password) {
			setError("Enter the leaderboard password.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const result = await apiFetch(
				`/api/leaderboards/${seg(board)}/players/rename`,
				{
					method: "POST",
					password,
					body: { from, to: newName },
				},
			);
			remember(password);
			onRenamed(result.name);
		} catch (e) {
			if (e.status === 403) forget();
			setError(e.message);
			setSaving(false);
		}
	};

	return (
		<Modal
			title={target ? "Merge Players" : "Rename Player"}
			onClose={onClose}
		>
			<div className="modal-body">
				<p className="modal-text">
					Fix a typo, or combine two names that are really the same
					person. Every match they've played is updated.
				</p>
				<div className="form-field">
					<label>Player</label>
					<select
						value={from}
						onChange={(e) => setFrom(e.target.value)}
					>
						{sorted.map((p) => (
							<option key={p.player} value={p.player}>
								{p.player} (
								{plural(p.played, "match", "matches")})
							</option>
						))}
					</select>
				</div>
				<div className="form-field">
					<label>New name</label>
					<input
						type="text"
						placeholder="New name, or an existing player to merge into"
						autoComplete="off"
						list="rename-player-names"
						maxLength={50}
						value={to}
						onChange={(e) => setTo(e.target.value)}
					/>
					<datalist id="rename-player-names">
						{sorted
							.filter((p) => p.player !== from)
							.map((p) => (
								<option key={p.player} value={p.player} />
							))}
					</datalist>
				</div>
				{preview}
				<PasswordField value={password} onChange={setPassword} />
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className={`modal-submit${target ? " danger" : ""}`}
				onClick={handleSave}
				disabled={saving}
			>
				{saving
					? "Saving…"
					: target
						? "Merge Players"
						: "Rename Player"}
			</button>
		</Modal>
	);
};

export default RenamePlayerModal;
