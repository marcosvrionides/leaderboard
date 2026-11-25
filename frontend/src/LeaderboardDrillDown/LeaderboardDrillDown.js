import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { computeStandings, computeTrends, newestFirst, plural } from "../stats";
import { playerPath } from "../paths";
import useBoardMatches from "../useBoardMatches";
import EloInfoModal from "./EloInfoModal";
import AddMatchModal from "./AddMatchModal";
import DeleteMatchModal from "./DeleteMatchModal";
import MatchCard from "./MatchCard";
import Standings from "./Standings";
import Predictor from "./Predictor";
import ShareButton from "./ShareButton";
import ManageBoardModal from "./ManageBoardModal";
import RenamePlayerModal from "./RenamePlayerModal";
import "./LeaderboardDrillDown.css";

export const LeaderboardDrillDown = () => {
	const { name } = useParams();
	const navigate = useNavigate();
	const {
		matches,
		error: loadError,
		reload: fetchMatches,
	} = useBoardMatches(name);
	const [addOpen, setAddOpen] = useState(false);
	const [matchToDelete, setMatchToDelete] = useState(null);
	const [eloInfoOpen, setEloInfoOpen] = useState(false);
	const closeEloInfo = useCallback(() => setEloInfoOpen(false), []);
	const closeAdd = useCallback(() => setAddOpen(false), []);
	const closeDelete = useCallback(() => setMatchToDelete(null), []);
	// Owner dialogs: null, "manage" (the menu) or one of its actions.
	const [manageDialog, setManageDialog] = useState(null);
	const closeManage = useCallback(() => setManageDialog(null), []);

	const { rankings, elo } = useMemo(
		() => computeStandings(matches),
		[matches],
	);
	const trends = useMemo(
		() => computeTrends(matches, rankings),
		[matches, rankings],
	);
	const sortedMatches = newestFirst(matches);
	const knownPlayerNames = rankings
		.map((r) => r.player)
		.sort((a, b) => a.localeCompare(b));

	return (
		<div className="drill-container">
			<div className="drill-header">
				<div className="drill-header-top">
					<Link className="drill-back" to="/">
						← All leaderboards
					</Link>
					<div className="drill-actions">
						<ShareButton
							board={name}
							text={
								rankings.length > 0
									? `${rankings[0].player} leads ${name} with ${Math.round(rankings[0].elo)} Elo`
									: `Join ${name} and get on the board`
							}
						/>
						<button
							type="button"
							className="drill-manage"
							onClick={() => setManageDialog("manage")}
						>
							Manage
						</button>
					</div>
				</div>
				<h1 className="drill-title">{name}</h1>
				<p className="drill-subtitle">
					{matches
						? `${plural(matches.length, "match", "matches")} played`
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

			{!loadError && matches && matches.length === 0 && (
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
					<Standings
						board={name}
						rankings={rankings}
						trends={trends}
					/>
				</section>
			)}

			{rankings.length >= 2 && (
				<section className="predictor-section">
					<div className="section-header">
						<h2 className="section-label">Who'd win?</h2>
						<span className="section-hint">
							Based on current Elo
						</span>
					</div>
					<Predictor rankings={rankings} matches={matches} />
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
								onPlayerClick={(p) =>
									navigate(playerPath(name, p))
								}
							/>
						))}
					</div>
				</section>
			)}

			{!matches && !loadError && (
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

			{manageDialog === "manage" && (
				<ManageBoardModal
					onClose={closeManage}
					actions={[
						{
							id: "rename",
							title: "Rename or merge a player",
							description:
								rankings.length > 0
									? "Fix a typo, or combine two names for the same person."
									: "Available once games have been played.",
							disabled: rankings.length === 0,
							onSelect: () => setManageDialog("rename"),
						},
					]}
				/>
			)}

			{manageDialog === "rename" && (
				<RenamePlayerModal
					board={name}
					players={rankings}
					onClose={closeManage}
					onRenamed={() => {
						setManageDialog(null);
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
