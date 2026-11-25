import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { computeStandings, computeTrends, newestFirst, plural } from "../stats";
import { boardPath, playerPath } from "../paths";
import {
	filterBySeason,
	matchSeason,
	pastChampions,
	seasonLabel,
	useSeasonSelection,
} from "../seasons";
import useBoard from "../useBoard";
import useBoardMatches from "../useBoardMatches";
import { useFavourites } from "../useFavourites";
import EloInfoModal from "./EloInfoModal";
import AddMatchModal from "./AddMatchModal";
import DeleteMatchModal from "./DeleteMatchModal";
import MatchCard from "./MatchCard";
import Standings from "./Standings";
import Predictor from "./Predictor";
import ShareButton from "./ShareButton";
import ManageBoardModal from "./ManageBoardModal";
import RenamePlayerModal from "./RenamePlayerModal";
import { PastChampions, SeasonPicker, StartSeasonModal } from "./Seasons";
import VisibilityModal from "./VisibilityModal";
import DeleteBoardModal from "./DeleteBoardModal";
import CreateTournamentModal from "../Tournament/CreateTournamentModal";
import TournamentList from "../Tournament/TournamentList";
import "../Tournament/Tournament.css";
import { apiFetch, seg } from "../api";
import "./LeaderboardDrillDown.css";

export const LeaderboardDrillDown = () => {
	const { name } = useParams();
	const navigate = useNavigate();
	const {
		matches: allMatches,
		error: loadError,
		reload: fetchMatches,
	} = useBoardMatches(name);
	const { board, notFound, reload: reloadBoard } = useBoard(name);
	const currentSeason = board.currentSeason;
	const season = useSeasonSelection(currentSeason);
	const { isFavourite, toggleFavourite } = useFavourites();
	const starred = isFavourite(name);
	const [addOpen, setAddOpen] = useState(false);
	const [matchToDelete, setMatchToDelete] = useState(null);
	const [eloInfoOpen, setEloInfoOpen] = useState(false);
	const closeEloInfo = useCallback(() => setEloInfoOpen(false), []);
	const closeAdd = useCallback(() => setAddOpen(false), []);
	const closeDelete = useCallback(() => setMatchToDelete(null), []);
	// Owner dialogs: null, "manage" (the menu) or one of its actions.
	const [manageDialog, setManageDialog] = useState(null);
	const closeManage = useCallback(() => setManageDialog(null), []);
	const [tournaments, setTournaments] = useState([]);
	const loadTournaments = useCallback(
		() =>
			apiFetch(`/api/leaderboards/${seg(name)}/tournaments`)
				.then(setTournaments)
				.catch(() => setTournaments([])),
		[name],
	);
	useEffect(() => {
		loadTournaments();
	}, [loadTournaments]);

	// Everything below the header is for the selected season.
	const matches = useMemo(
		() => filterBySeason(allMatches, season.selected),
		[allMatches, season.selected],
	);
	const { rankings, elo } = useMemo(
		() => computeStandings(matches),
		[matches],
	);
	const trends = useMemo(
		() => computeTrends(matches, rankings),
		[matches, rankings],
	);
	// Players from every season, for renaming and name suggestions.
	const allPlayers = useMemo(
		() => computeStandings(allMatches).rankings,
		[allMatches],
	);
	const currentSeasonMatches = useMemo(
		() => filterBySeason(allMatches, currentSeason) || [],
		[allMatches, currentSeason],
	);
	const currentSeasonStandings = useMemo(
		() => computeStandings(currentSeasonMatches).rankings,
		[currentSeasonMatches],
	);
	const currentLeader = currentSeasonStandings[0];
	const champions = useMemo(
		() => pastChampions(allMatches, currentSeason),
		[allMatches, currentSeason],
	);
	const sortedMatches = newestFirst(matches);
	const knownPlayerNames = allPlayers
		.map((r) => r.player)
		.sort((a, b) => a.localeCompare(b));
	const hasSeasons = currentSeason > 1;
	const viewingPast = !season.isCurrent && season.selected !== "all";
	const toPlayer = (p) => playerPath(name, p) + season.query;

	if (notFound) {
		return (
			<div className="drill-container">
				<div className="drill-header">
					<div className="drill-header-top">
						<Link className="drill-back" to="/">
							← All leaderboards
						</Link>
					</div>
					<h1 className="drill-title">{name}</h1>
				</div>
				<div className="empty-state">
					<div className="empty-icon">🔍</div>
					<h2 className="empty-title">Leaderboard not found</h2>
					<p className="empty-subtitle">
						There's no leaderboard called "{name}". It may have been
						deleted or renamed.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="drill-container">
			<div className="drill-header">
				<div className="drill-header-top">
					<Link className="drill-back" to="/">
						← All leaderboards
					</Link>
					<div className="drill-actions">
						<button
							type="button"
							className={`drill-manage drill-star${starred ? " starred" : ""}`}
							onClick={() => toggleFavourite(name)}
							aria-pressed={starred}
							title={
								starred
									? "Remove from favourites"
									: "Add to favourites (pins it on the home page)"
							}
						>
							{starred ? "★" : "☆"}
						</button>
						<ShareButton
							board={name}
							text={
								currentLeader
									? `${currentLeader.player} leads ${name} with ${Math.round(currentLeader.elo)} Elo`
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
				<div className="drill-subtitle-row">
					{hasSeasons && (
						<SeasonPicker
							currentSeason={currentSeason}
							selected={season.selected}
							onSelect={season.select}
						/>
					)}
					{board.unlisted && (
						<span
							className="unlisted-badge"
							title="Hidden from the home page. Anyone with the link can view it."
						>
							Unlisted
						</span>
					)}
					<p className="drill-subtitle">
						{matches
							? `${plural(matches.length, "match", "matches")} played`
							: loadError
								? " "
								: "Loading..."}
					</p>
				</div>
			</div>

			{viewingPast && (
				<div className="season-banner">
					<span>
						{seasonLabel(season.selected)} is finished. These are
						its final standings.
					</span>
					<button
						type="button"
						onClick={() => season.select(currentSeason)}
					>
						Back to {seasonLabel(currentSeason)}
					</button>
				</div>
			)}
			{season.selected === "all" && (
				<div className="season-banner">
					<span>
						All-time ratings run across every season without
						resetting.
					</span>
					<button
						type="button"
						onClick={() => season.select(currentSeason)}
					>
						Back to {seasonLabel(currentSeason)}
					</button>
				</div>
			)}

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
					<h2 className="empty-title">
						{hasSeasons && season.isCurrent
							? `${seasonLabel(currentSeason)} has begun`
							: "No games yet"}
					</h2>
					<p className="empty-subtitle">
						Hit the <span className="empty-highlight">+</span>{" "}
						button to record the first game
						{hasSeasons && season.isCurrent ? " of the season" : ""}
						.
					</p>
				</div>
			)}

			{rankings.length > 0 && (
				<section className="standings-section">
					<div className="section-header">
						<h2 className="section-label">
							{viewingPast ? "Final standings" : "Standings"}
						</h2>
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
						trends={viewingPast ? new Map() : trends}
						query={season.query}
					/>
				</section>
			)}

			{rankings.length >= 2 && !viewingPast && (
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

			{tournaments.length > 0 && (
				<section className="predictor-section">
					<h2 className="section-label">Tournaments</h2>
					<TournamentList board={name} tournaments={tournaments} />
				</section>
			)}

			{champions.length > 0 && !viewingPast && (
				<section className="predictor-section">
					<h2 className="section-label">Past champions</h2>
					<PastChampions
						champions={champions}
						onSelect={season.select}
					/>
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
								onPlayerClick={(p) => navigate(toPlayer(p))}
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

			{!viewingPast && (
				<button
					className="fab"
					onClick={() => setAddOpen(true)}
					title="Add Game"
				>
					+
				</button>
			)}

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
							id: "tv",
							title: "TV display",
							description:
								"Full-screen standings and latest results for a big screen. Refreshes automatically.",
							onSelect: () => navigate(`${boardPath(name)}/tv`),
						},
						{
							id: "tournament",
							title: "Start a tournament",
							description:
								"A knockout bracket for any group of players. Games count towards Elo.",
							onSelect: () => setManageDialog("tournament"),
						},
						{
							id: "rename",
							title: "Rename or merge a player",
							description:
								allPlayers.length > 0
									? "Fix a typo, or combine two names for the same person."
									: "Available once games have been played.",
							disabled: allPlayers.length === 0,
							onSelect: () => setManageDialog("rename"),
						},
						{
							id: "visibility",
							title: board.unlisted
								? "Visibility: Unlisted"
								: "Visibility: Listed",
							description: board.unlisted
								? "Hidden from the home page; anyone with the link can view it."
								: "Shown on the home page. Make it unlisted to hide it.",
							onSelect: () => setManageDialog("visibility"),
						},
						{
							id: "season",
							title: `Start Season ${currentSeason + 1}`,
							description:
								currentSeasonMatches.length > 0
									? `End ${seasonLabel(currentSeason)}, crown its champion and reset ratings to 1000. Past seasons are kept.`
									: `${seasonLabel(currentSeason)} needs at least one game first.`,
							disabled: currentSeasonMatches.length === 0,
							onSelect: () => setManageDialog("season"),
						},
						{
							id: "delete",
							title: "Delete leaderboard",
							description:
								"Permanently delete this board with all its games and tournaments.",
							danger: true,
							onSelect: () => setManageDialog("delete"),
						},
					]}
				/>
			)}

			{manageDialog === "rename" && (
				<RenamePlayerModal
					board={name}
					players={allPlayers}
					onClose={closeManage}
					onRenamed={() => {
						setManageDialog(null);
						fetchMatches();
					}}
				/>
			)}

			{manageDialog === "tournament" && (
				<CreateTournamentModal
					board={name}
					players={[
						...currentSeasonStandings.map((r) => r.player),
						...knownPlayerNames.filter(
							(p) =>
								!currentSeasonStandings.some(
									(r) => r.player === p,
								),
						),
					]}
					onClose={closeManage}
					onCreated={(t) =>
						navigate(`${boardPath(name)}/tournament/${t.id}`)
					}
				/>
			)}

			{manageDialog === "visibility" && (
				<VisibilityModal
					board={name}
					unlisted={board.unlisted}
					onClose={closeManage}
					onSaved={() => {
						setManageDialog(null);
						reloadBoard();
					}}
				/>
			)}

			{manageDialog === "delete" && (
				<DeleteBoardModal
					board={name}
					matchCount={(allMatches || []).length}
					seasonCount={
						new Set((allMatches || []).map(matchSeason)).size
					}
					tournamentCount={tournaments.length}
					onClose={closeManage}
					onDeleted={() => {
						if (starred) toggleFavourite(name);
						navigate("/", { replace: true });
					}}
				/>
			)}

			{manageDialog === "season" && (
				<StartSeasonModal
					board={name}
					currentSeason={currentSeason}
					leader={currentLeader}
					onClose={closeManage}
					onStarted={() => {
						setManageDialog(null);
						// Back to "current", which becomes the new season once reloaded.
						season.select(currentSeason);
						reloadBoard();
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
						loadTournaments();
					}}
				/>
			)}
		</div>
	);
};
