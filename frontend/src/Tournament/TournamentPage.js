import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch, seg } from "../api";
import { boardPath, playerPath } from "../paths";
import { formatDate, plural } from "../stats";
import useBoardPassword from "../useBoardPassword";
import "../LeaderboardDrillDown/LeaderboardDrillDown.css";
import "./Tournament.css";

const roundHeading = (round) =>
	round.slots.length > 1 &&
	round.name !== "Final" &&
	!round.name.startsWith("Round")
		? `${round.name}s`
		: round.name;

const Side = ({ name, seed, score, isWinner, board }) => (
	<div
		className={`bracket-side${isWinner ? " winner" : ""}${name ? "" : " tbd"}`}
	>
		<span className="bracket-seed">{seed ?? ""}</span>
		{name ? (
			<Link className="bracket-name" to={playerPath(board, name)}>
				{name}
			</Link>
		) : (
			<span className="bracket-name">TBD</span>
		)}
		<span className="bracket-score">{score ?? ""}</span>
	</div>
);

const SlotCard = ({ slot, board, onRecord, onUndo }) => {
	if (slot.state === "bye") {
		const name = slot.a || slot.b;
		const seed = slot.a ? slot.seedA : slot.seedB;
		return (
			<div className="bracket-slot bye">
				<Side name={name} seed={seed} board={board} isWinner />
				<div className="bracket-bye-note">Bye</div>
			</div>
		);
	}
	return (
		<div className={`bracket-slot ${slot.state}`}>
			<Side
				name={slot.a}
				seed={slot.seedA}
				score={slot.scoreA}
				isWinner={slot.winner && slot.winner === slot.a}
				board={board}
			/>
			<Side
				name={slot.b}
				seed={slot.seedB}
				score={slot.scoreB}
				isWinner={slot.winner && slot.winner === slot.b}
				board={board}
			/>
			{slot.state === "ready" && (
				<button
					type="button"
					className="bracket-action"
					onClick={() => onRecord(slot)}
				>
					Record result
				</button>
			)}
			{slot.canUndo && (
				<button
					type="button"
					className="bracket-undo"
					onClick={() => onUndo(slot)}
				>
					Undo
				</button>
			)}
		</div>
	);
};

// Records or undoes a result, or deletes the tournament: all need the password.
const PasswordAction = ({
	board,
	title,
	children,
	submitLabel,
	danger,
	validate,
	run,
	onClose,
	onDone,
}) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const [password, setPassword] = useState(savedPassword);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const submit = async () => {
		const problem = validate ? validate() : null;
		if (problem) {
			setError(problem);
			return;
		}
		if (!password) {
			setError("Enter the leaderboard password.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const result = await run(password);
			remember(password);
			onDone(result);
		} catch (e) {
			if (e.status === 403) forget();
			setError(e.message);
			setSaving(false);
		}
	};

	return (
		<Modal title={title} onClose={onClose}>
			<div className="modal-body">
				{children}
				<PasswordField value={password} onChange={setPassword} />
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className={`modal-submit${danger ? " danger" : ""}`}
				onClick={submit}
				disabled={saving}
			>
				{saving ? "Saving…" : submitLabel}
			</button>
		</Modal>
	);
};

const TournamentPage = () => {
	const { name, id } = useParams();
	const navigate = useNavigate();
	const [t, setT] = useState(null);
	const [error, setError] = useState(null);
	const [recording, setRecording] = useState(null);
	const [undoing, setUndoing] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const [scores, setScores] = useState({ a: "", b: "" });
	const close = useCallback(() => {
		setRecording(null);
		setUndoing(null);
		setDeleting(false);
	}, []);
	const base = `/api/leaderboards/${seg(name)}/tournaments/${seg(id)}`;

	const load = useCallback(
		() =>
			apiFetch(base)
				.then(setT)
				.catch((e) =>
					setError(
						e.status === 404
							? "This tournament doesn't exist."
							: e.message,
					),
				),
		[base],
	);
	useEffect(() => {
		load();
	}, [load]);

	const header = (
		<div className="drill-header">
			<div className="drill-header-top">
				<Link className="drill-back" to={boardPath(name)}>
					← {name}
				</Link>
				{t && (
					<button
						type="button"
						className="drill-manage"
						onClick={() => setDeleting(true)}
					>
						Delete
					</button>
				)}
			</div>
			<h1 className="drill-title">{t ? t.name : "Tournament"}</h1>
			<p className="drill-subtitle">
				{t
					? `${plural(t.players.length, "player")} · seeded ${t.seeding === "random" ? "at random" : "by Elo"} · ${formatDate(t.createdAt)}`
					: error
						? " "
						: "Loading..."}
			</p>
		</div>
	);

	if (!t) {
		return (
			<div className="drill-container">
				{header}
				{error ? (
					<div className="empty-state">
						<div className="empty-icon">🔍</div>
						<h2 className="empty-title">Not found</h2>
						<p className="empty-subtitle">{error}</p>
					</div>
				) : (
					<div className="loading-state">
						<div className="spinner" />
					</div>
				)}
			</div>
		);
	}

	const roundName = (r) => t.rounds[r - 1].name;

	return (
		<div className="drill-container">
			{header}

			{t.champion && (
				<div className="tournament-champion">
					<span className="tournament-trophy" aria-hidden="true">
						🏆
					</span>
					<span>
						<span className="tournament-champion-label">
							Champion
						</span>
						<Link
							className="tournament-champion-name"
							to={playerPath(name, t.champion)}
						>
							{t.champion}
						</Link>
					</span>
				</div>
			)}

			<div className="bracket-scroll">
				<div
					className="bracket"
					style={{ "--rounds": t.rounds.length }}
				>
					{t.rounds.map((round) => (
						<div className="bracket-round" key={round.round}>
							<h2 className="bracket-round-name">
								{roundHeading(round)}
							</h2>
							<div className="bracket-slots">
								{round.slots.map((slot) => (
									<SlotCard
										key={slot.slot}
										slot={slot}
										board={name}
										onRecord={(s) => {
											setScores({ a: "", b: "" });
											setRecording(s);
										}}
										onUndo={setUndoing}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
			<p className="bracket-hint">
				Results are saved as normal games, so they count towards Elo and
				appear in the match history.
			</p>

			{recording && (
				<PasswordAction
					board={name}
					title={roundName(recording.round)}
					submitLabel="Save Result"
					onClose={close}
					validate={() => {
						if (scores.a === "" || scores.b === "")
							return "Enter both scores.";
						if (Number(scores.a) === Number(scores.b))
							return "It's a knockout: someone has to win.";
						return null;
					}}
					run={(password) =>
						apiFetch(
							`${base}/rounds/${recording.round}/slots/${recording.slot}`,
							{
								method: "POST",
								password,
								body: {
									scoreA: Number(scores.a),
									scoreB: Number(scores.b),
								},
							},
						)
					}
					onDone={(updated) => {
						close();
						setT(updated);
					}}
				>
					{[
						["a", recording.a],
						["b", recording.b],
					].map(([side, player]) => (
						<div className="modal-participant-row" key={side}>
							<div className="form-field participant-name-field">
								<label>Player</label>
								<input
									type="text"
									value={player}
									readOnly
									tabIndex={-1}
								/>
							</div>
							<div className="form-field participant-score-field">
								<label>Games Won</label>
								<input
									type="number"
									min="0"
									placeholder="0"
									value={scores[side]}
									onChange={(e) =>
										setScores((s) => ({
											...s,
											[side]: e.target.value,
										}))
									}
								/>
							</div>
						</div>
					))}
				</PasswordAction>
			)}

			{undoing && (
				<PasswordAction
					board={name}
					title="Undo Result"
					submitLabel="Undo Result"
					danger
					onClose={close}
					run={(password) =>
						apiFetch(`/api/matches/${undoing.matchId}`, {
							method: "DELETE",
							password,
						})
					}
					onDone={() => {
						close();
						load();
					}}
				>
					<div className="modal-summary">
						<div className="modal-summary-date">
							{roundName(undoing.round)}
						</div>
						<div className="modal-summary-text">
							{undoing.a} {undoing.scoreA} · {undoing.b}{" "}
							{undoing.scoreB}
						</div>
					</div>
					<p className="modal-text">
						The game is deleted from the match history and the match
						goes back to being unplayed.
					</p>
				</PasswordAction>
			)}

			{deleting && (
				<PasswordAction
					board={name}
					title="Delete Tournament"
					submitLabel="Delete Tournament"
					danger
					onClose={close}
					run={(password) =>
						apiFetch(base, { method: "DELETE", password })
					}
					onDone={() => navigate(boardPath(name))}
				>
					<p className="modal-text">
						This removes the {t.name} bracket. Games already played
						stay in the match history and still count towards Elo.
					</p>
				</PasswordAction>
			)}
		</div>
	);
};

export default TournamentPage;
