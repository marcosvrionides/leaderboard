import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch, seg } from "../api";
import { plural } from "../stats";
import { seasonLabel } from "../seasons";
import useBoardPassword from "../useBoardPassword";

const shortDate = (ts) =>
	new Date(ts).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

export const SeasonPicker = ({ currentSeason, selected, onSelect }) => {
	const options = [];
	for (let s = currentSeason; s >= 1; s--) options.push(s);
	return (
		<label className="season-picker">
			<span className="visually-hidden">Season</span>
			<select
				value={String(selected)}
				onChange={(e) =>
					onSelect(
						e.target.value === "all"
							? "all"
							: Number(e.target.value),
					)
				}
			>
				{options.map((s) => (
					<option key={s} value={s}>
						{seasonLabel(s)}
						{s === currentSeason ? " (current)" : ""}
					</option>
				))}
				<option value="all">All time</option>
			</select>
		</label>
	);
};

export const PastChampions = ({ champions, onSelect }) => (
	<div className="champions-list">
		{champions.map((c) => (
			<button
				type="button"
				key={c.season}
				className="champion-row"
				onClick={() => onSelect(c.season)}
				title={`See the final Season ${c.season} standings`}
			>
				<span className="champion-trophy" aria-hidden="true">
					🏆
				</span>
				<span className="champion-text">
					<span className="champion-name">{c.champion}</span>
					<span className="champion-meta">
						{seasonLabel(c.season)} · {shortDate(c.from)} –{" "}
						{shortDate(c.to)}
					</span>
				</span>
				<span className="champion-stats">
					<strong>{Math.round(c.rating)}</strong>
					<span>{plural(c.matchCount, "match", "matches")}</span>
				</span>
			</button>
		))}
	</div>
);

export const StartSeasonModal = ({
	board,
	currentSeason,
	leader,
	onClose,
	onStarted,
}) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const [password, setPassword] = useState(savedPassword);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const next = currentSeason + 1;

	const start = async () => {
		if (!password) {
			setError("Enter the leaderboard password.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await apiFetch(`/api/leaderboards/${seg(board)}/seasons`, {
				method: "POST",
				password,
			});
			remember(password);
			onStarted(next);
		} catch (e) {
			if (e.status === 403) forget();
			setError(e.message);
			setSaving(false);
		}
	};

	return (
		<Modal title={`Start Season ${next}`} onClose={onClose}>
			<div className="modal-body">
				{leader && (
					<div className="modal-summary">
						<div className="modal-summary-date">
							Season {currentSeason} champion
						</div>
						<div className="modal-summary-text">
							🏆 {leader.player} · {Math.round(leader.elo)} Elo
						</div>
					</div>
				)}
				<p className="modal-text">
					Season {currentSeason} ends now. Season {next} starts with
					everyone back at 1000 Elo.
				</p>
				<p className="modal-text">
					Nothing is deleted: past seasons keep their matches and
					final standings, and you can look back at them (or at
					all-time ratings) any time.
				</p>
				<PasswordField value={password} onChange={setPassword} />
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className="modal-submit"
				onClick={start}
				disabled={saving}
			>
				{saving ? "Starting…" : `Start Season ${next}`}
			</button>
		</Modal>
	);
};
