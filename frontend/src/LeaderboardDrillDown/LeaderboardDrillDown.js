import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { STARTING_RATING } from "../elo";
import { apiFetch, seg } from "../api";
import { computeStandings, newestFirst } from "../stats";
import EloInfoModal from "./EloInfoModal";
import AddMatchModal from "./AddMatchModal";
import DeleteMatchModal from "./DeleteMatchModal";
import MatchCard from "./MatchCard";
import "./LeaderboardDrillDown.css";

export const LeaderboardDrillDown = () => {
	const { name } = useParams();
	const [leaderboardData, setLeaderboardData] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [matchToDelete, setMatchToDelete] = useState(null);
	const [eloInfoOpen, setEloInfoOpen] = useState(false);
	const closeEloInfo = useCallback(() => setEloInfoOpen(false), []);
	const closeAdd = useCallback(() => setAddOpen(false), []);
	const closeDelete = useCallback(() => setMatchToDelete(null), []);

	const fetchMatches = useCallback(() => {
		setLoadError(null);
		apiFetch(`/api/matches/leaderboard/${seg(name)}`)
			.then((data) => setLeaderboardData(data))
			.catch((err) => {
				console.error(err);
				setLoadError(
					"Couldn't load this leaderboard. Please try again.",
				);
			});
	}, [name]);

	useEffect(() => {
		fetchMatches();
	}, [fetchMatches]);

	const { rankings, elo } = computeStandings(leaderboardData);
	const maxMatchWins = Math.max(0, ...rankings.map((r) => r.matchWins));
	const maxGameWins = Math.max(0, ...rankings.map((r) => r.gameWins));
	const sortedMatches = newestFirst(leaderboardData);
	const knownPlayerNames = rankings
		.map((r) => r.player)
		.sort((a, b) => a.localeCompare(b));

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
					<div className="section-header">
						<h2 className="section-label">Standings</h2>
						<button
							type="button"
							className="info-link"
							onClick={() => setEloInfoOpen(true)}
						>
							How Elo works <span aria-hidden="true">ⓘ</span>
						</button>
					</div>
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
								<div
									className="standing-elo"
									title={`Elo rating (everyone starts at ${STARTING_RATING})`}
								>
									<span className="elo-value">
										{Math.round(r.elo)}
									</span>
									<span className="elo-label">Elo</span>
								</div>
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
													width: `${maxMatchWins > 0 ? (r.matchWins / maxMatchWins) * 100 : 0}%`,
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
													width: `${maxGameWins > 0 ? (r.gameWins / maxGameWins) * 100 : 0}%`,
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

			{sortedMatches.length > 0 && (
				<section className="matches-section">
					<h2 className="section-label">Match History</h2>
					<div className="matches-list">
						{sortedMatches.map((match, i) => (
							<MatchCard
								key={match.id}
								match={match}
								index={i}
								eloChanges={elo.changesByMatchId.get(match.id)}
								onDelete={setMatchToDelete}
							/>
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
				onClick={() => setAddOpen(true)}
				title="Add Game"
			>
				+
			</button>

			{eloInfoOpen && <EloInfoModal onClose={closeEloInfo} />}

			{addOpen && (
				<AddMatchModal
					board={name}
					knownPlayerNames={knownPlayerNames}
					onClose={closeAdd}
					onSaved={() => {
						setAddOpen(false);
						fetchMatches();
					}}
				/>
			)}

			{matchToDelete && (
				<DeleteMatchModal
					board={name}
					match={matchToDelete}
					onClose={closeDelete}
					onDeleted={() => {
						setMatchToDelete(null);
						fetchMatches();
					}}
				/>
			)}
		</div>
	);
};
