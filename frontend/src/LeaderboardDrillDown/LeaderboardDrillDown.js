import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./LeaderboardDrillDown.css";

const emptyParticipant = () => ({ name: "", gamesWon: "" });
const emptyForm = () => ({
	participants: [emptyParticipant(), emptyParticipant()],
	note: "",
	password: "",
});

export const LeaderboardDrillDown = () => {
	const { name } = useParams();
	const [leaderboardData, setLeaderboardData] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState(emptyForm());
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState(null);

	const fetchMatches = () => {
		setLoadError(null);
		fetch(
			`${process.env.REACT_APP_API_URL}/api/matches/leaderboard/${name}`,
		)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed (${res.status})`);
				return res.json();
			})
			.then((data) => setLeaderboardData(data))
			.catch((err) => {
				console.error(err);
				setLoadError(
					"Couldn't load this leaderboard. Please try again.",
				);
			});
	};

	useEffect(() => {
		fetchMatches();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [name]);

	const handleParticipantChange = (index, field, value) => {
		setForm((prev) => {
			const participants = [...prev.participants];
			participants[index] = { ...participants[index], [field]: value };
			return { ...prev, participants };
		});
	};

	const handleAddParticipant = () => {
		setForm((prev) => ({
			...prev,
			participants: [...prev.participants, emptyParticipant()],
		}));
	};

	const handleRemoveParticipant = (index) => {
		setForm((prev) => ({
			...prev,
			participants: prev.participants.filter((_, i) => i !== index),
		}));
	};

	const handleFieldChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = () => {
		const trimmedParticipants = form.participants.map((p) => ({
			name: p.name.trim(),
			gamesWon: p.gamesWon,
		}));

		const hasEmptyField = trimmedParticipants.some(
			(p) => !p.name || p.gamesWon === "",
		);

		if (
			trimmedParticipants.length < 2 ||
			hasEmptyField ||
			!form.password
		) {
			setSubmitError(
				"All player names, scores, and the leaderboard password are required.",
			);
			return;
		}

		setSubmitError(null);
		setSubmitting(true);

		fetch(`${process.env.REACT_APP_API_URL}/api/matches`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Leaderboard-Password": form.password,
			},
			body: JSON.stringify({
				participants: trimmedParticipants.map((p) => ({
					playerName: p.name,
					gamesWon: parseInt(p.gamesWon, 10),
				})),
				note: form.note.trim() || null,
				timestamp: Date.now(),
				leaderboard: { name },
			}),
		})
			.then(async (res) => {
				if (res.status === 403)
					throw new Error("Incorrect leaderboard password.");
				if (res.status === 404)
					throw new Error("This leaderboard no longer exists.");
				if (!res.ok)
					throw new Error(
						"Couldn't save the game. Please try again.",
					);
				return res.json();
			})
			.then(() => {
				setModalOpen(false);
				setForm(emptyForm());
				fetchMatches();
			})
			.catch((err) => {
				console.error(err);
				setSubmitError(err.message);
			})
			.finally(() => setSubmitting(false));
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setSubmitError(null);
		setForm(emptyForm());
	};

	// A match win is only credited when there's a single, outright top score.
	// A tie for the top score means nobody gets credited for that match.
	const getMatchWinnerNames = (participants) => {
		const maxScore = Math.max(...participants.map((p) => p.gamesWon));
		const topScorers = participants.filter((p) => p.gamesWon === maxScore);
		return topScorers.length === 1 ? [topScorers[0].playerName] : [];
	};

	const playerStats = {};
	if (leaderboardData) {
		leaderboardData.forEach((match) => {
			const winnerNames = getMatchWinnerNames(match.participants);
			match.participants.forEach((p) => {
				if (!playerStats[p.playerName]) {
					playerStats[p.playerName] = { matchWins: 0, gameWins: 0 };
				}
				playerStats[p.playerName].gameWins += p.gamesWon;
				if (winnerNames.includes(p.playerName)) {
					playerStats[p.playerName].matchWins += 1;
				}
			});
		});
	}

	const rankings = Object.entries(playerStats)
		.map(([player, stats]) => ({ player, ...stats }))
		.sort((a, b) => b.matchWins - a.matchWins);

	const sortedMatches = leaderboardData
		? [...leaderboardData].sort((a, b) => b.timestamp - a.timestamp)
		: [];

	const knownPlayerNames = leaderboardData
		? Array.from(
				new Set(
					leaderboardData.flatMap((m) =>
						m.participants.map((p) => p.playerName),
					),
				),
			).sort((a, b) => a.localeCompare(b))
		: [];

	const formatDate = (ts) =>
		new Date(ts).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});

	return (
		<div className="drill-container">
			<div className="drill-header">
				<div className="drill-header-top">
					<div
						className="drill-back"
						onClick={() => window.history.back()}
					>
						← Back
					</div>
				</div>
				<h1 className="drill-title">{name}</h1>
				<p className="drill-subtitle">
					{leaderboardData
						? `${leaderboardData.length} matches played`
						: loadError
							? " "
							: "Loading..."}
				</p>
			</div>

			{loadError && (
				<div className="empty-state">
					<div className="empty-icon">⚠️</div>
					<h2 className="empty-title">Something went wrong</h2>
					<p className="empty-subtitle">{loadError}</p>
				</div>
			)}

			{!loadError && leaderboardData && leaderboardData.length === 0 && (
				<div className="empty-state">
					<div className="empty-icon">🏆</div>
					<h2 className="empty-title">No games yet</h2>
					<p className="empty-subtitle">
						Hit the <span className="empty-highlight">+</span>{" "}
						button to record your first game.
					</p>
				</div>
			)}

			{rankings.length > 0 && (
				<section className="standings-section">
					<h2 className="section-label">Standings</h2>
					<div className="standings-list">
						{rankings.map((r, i) => (
							<div
								className="standing-row"
								key={r.player}
								style={{ animationDelay: `${i * 0.07}s` }}
							>
								<span className={`rank-badge rank-${i + 1}`}>
									{i + 1}
								</span>
								<span className="standing-name">
									{r.player}
								</span>
								<div className="standing-stats">
									<span className="stat">
										<strong>{r.matchWins}</strong> matches
									</span>
									<span className="stat">
										<strong>{r.gameWins}</strong> games
									</span>
								</div>
								<div className="win-bars">
									<div className="win-bar-row">
										<span className="win-bar-label">M</span>
										<div className="win-bar-track">
											<div
												className="win-bar-fill"
												style={{
													width: `${rankings[0].matchWins > 0 ? (r.matchWins / rankings[0].matchWins) * 100 : 0}%`,
												}}
											/>
										</div>
									</div>
									<div className="win-bar-row">
										<span className="win-bar-label">G</span>
										<div className="win-bar-track">
											<div
												className="win-bar-fill games"
												style={{
													width: `${rankings[0].gameWins > 0 ? (r.gameWins / rankings[0].gameWins) * 100 : 0}%`,
												}}
											/>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			{leaderboardData && leaderboardData.length > 0 && (
				<section className="matches-section">
					<h2 className="section-label">Match History</h2>
					<div className="matches-list">
						{sortedMatches.map((match, i) => {
							const winnerNames = getMatchWinnerNames(
								match.participants,
							);
							const sortedParticipants = [
								...match.participants,
							].sort((a, b) => b.gamesWon - a.gamesWon);

							return (
								<div
									className="match-card"
									key={match.id}
									style={{ animationDelay: `${i * 0.06}s` }}
								>
									<div className="match-date">
										{formatDate(match.timestamp)}
									</div>
									<div className="match-participants">
										{sortedParticipants.map((p, pi) => (
											<div
												className={`match-participant-row ${winnerNames.includes(p.playerName) ? "winner" : ""}`}
												key={pi}
											>
												<span className="participant-name">
													{p.playerName}
												</span>
												<span className="participant-score">
													{p.gamesWon}
												</span>
											</div>
										))}
									</div>
									{match.note && (
										<div className="match-note">
											{match.note}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</section>
			)}

			{!leaderboardData && !loadError && (
				<div className="loading-state">
					<div className="spinner" />
					<p>Loading matches…</p>
				</div>
			)}

			<button
				className="fab"
				onClick={() => setModalOpen(true)}
				title="Add Game"
			>
				+
			</button>

			{modalOpen && (
				<div className="modal-backdrop" onClick={handleCloseModal}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="modal-title">Add Game</h2>
							<button
								className="modal-close"
								onClick={handleCloseModal}
							>
								✕
							</button>
						</div>

						<div className="modal-body">
							<div className="modal-participants-list">
								{form.participants.map((p, index) => (
									<div
										className="modal-participant-row"
										key={index}
									>
										<div className="form-field participant-name-field">
											<label>
												Player {index + 1}
											</label>
											<input
												type="text"
												placeholder="Name"
												autoComplete="off"
												list="known-player-names"
												value={p.name}
												onChange={(e) =>
													handleParticipantChange(
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
													handleParticipantChange(
														index,
														"gamesWon",
														e.target.value,
													)
												}
											/>
										</div>
										{form.participants.length > 2 && (
											<button
												type="button"
												className="remove-participant-button"
												onClick={() =>
													handleRemoveParticipant(
														index,
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
								onClick={handleAddParticipant}
							>
								+ Add Player
							</button>

							<datalist id="known-player-names">
								{knownPlayerNames.map((playerName) => (
									<option
										key={playerName}
										value={playerName}
									/>
								))}
							</datalist>

							<div className="form-field">
								<label>Note (optional)</label>
								<input
									type="text"
									name="note"
									placeholder="e.g. Final of the season"
									autoComplete="off"
									value={form.note}
									onChange={handleFieldChange}
								/>
							</div>

							<div className="form-field">
								<label>Leaderboard Password</label>
								<input
									type="password"
									name="password"
									placeholder="Enter the leaderboard password"
									autoComplete="current-password"
									value={form.password}
									onChange={handleFieldChange}
								/>
							</div>

							{submitError && (
								<div className="modal-error">{submitError}</div>
							)}
						</div>

						<button
							className="modal-submit"
							onClick={handleSubmit}
							disabled={submitting}
						>
							{submitting ? "Saving…" : "Save Game"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
