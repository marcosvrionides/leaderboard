import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./LeaderboardDrillDown.css";

export const LeaderboardDrillDown = () => {
	const { name } = useParams();
	const [leaderboardData, setLeaderboardData] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({
		player1Name: "",
		player2Name: "",
		player1GamesWon: "",
		player2GamesWon: "",
		note: "",
		password: "",
	});
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState(null);

	const emptyForm = {
		player1Name: "",
		player2Name: "",
		player1GamesWon: "",
		player2GamesWon: "",
		note: "",
		password: "",
	};

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

	const handleFormChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = () => {
		if (
			!form.player1Name.trim() ||
			!form.player2Name.trim() ||
			form.player1GamesWon === "" ||
			form.player2GamesWon === "" ||
			!form.password
		) {
			setSubmitError(
				"Player names, scores, and the leaderboard password are required.",
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
				player1Name: form.player1Name.trim(),
				player2Name: form.player2Name.trim(),
				player1GamesWon: parseInt(form.player1GamesWon, 10),
				player2GamesWon: parseInt(form.player2GamesWon, 10),
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
				setForm(emptyForm);
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
		setForm(emptyForm);
	};

	const playerStats = {};
	if (leaderboardData) {
		leaderboardData.forEach((match) => {
			const p1 = match.player1Name;
			const p2 = match.player2Name;
			if (!playerStats[p1])
				playerStats[p1] = { matchWins: 0, gameWins: 0 };
			if (!playerStats[p2])
				playerStats[p2] = { matchWins: 0, gameWins: 0 };
			playerStats[p1].gameWins += match.player1GamesWon;
			playerStats[p2].gameWins += match.player2GamesWon;
			if (match.player1GamesWon > match.player2GamesWon) {
				playerStats[p1].matchWins += 1;
			} else if (match.player2GamesWon > match.player1GamesWon) {
				playerStats[p2].matchWins += 1;
			}
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
					leaderboardData.flatMap((m) => [
						m.player1Name,
						m.player2Name,
					]),
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
						{sortedMatches.map((match, i) => (
							<div
								className="match-card"
								key={match.id}
								style={{ animationDelay: `${i * 0.06}s` }}
							>
								<div className="match-date">
									{formatDate(match.timestamp)}
								</div>
								<div className="match-players">
									<div
										className={`match-player ${match.player1GamesWon > match.player2GamesWon ? "winner" : ""}`}
									>
										<span className="player-name">
											{match.player1Name}
										</span>
										<span className="player-score">
											{match.player1GamesWon}
										</span>
									</div>
									<div className="match-vs">vs</div>
									<div
										className={`match-player right ${match.player2GamesWon > match.player1GamesWon ? "winner" : ""}`}
									>
										<span className="player-score">
											{match.player2GamesWon}
										</span>
										<span className="player-name">
											{match.player2Name}
										</span>
									</div>
								</div>
								{match.note && (
									<div className="match-note">
										{match.note}
									</div>
								)}
							</div>
						))}
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
							<div className="modal-players-row">
								<div className="modal-player-col">
									<div className="form-field">
										<label>Player 1</label>
										<input
											type="text"
											name="player1Name"
											placeholder="Name"
											autoComplete="off"
											list="known-player-names"
											value={form.player1Name}
											onChange={handleFormChange}
										/>
									</div>
									<div className="form-field">
										<label>Games Won</label>
										<input
											type="number"
											name="player1GamesWon"
											placeholder="0"
											min="0"
											value={form.player1GamesWon}
											onChange={handleFormChange}
										/>
									</div>
								</div>
								<div className="modal-vs">VS</div>
								<div className="modal-player-col">
									<div className="form-field">
										<label>Player 2</label>
										<input
											type="text"
											name="player2Name"
											placeholder="Name"
											autoComplete="off"
											list="known-player-names"
											value={form.player2Name}
											onChange={handleFormChange}
										/>
									</div>
									<div className="form-field">
										<label>Games Won</label>
										<input
											type="number"
											name="player2GamesWon"
											placeholder="0"
											min="0"
											value={form.player2GamesWon}
											onChange={handleFormChange}
										/>
									</div>
								</div>
							</div>

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
									onChange={handleFormChange}
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
									onChange={handleFormChange}
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
