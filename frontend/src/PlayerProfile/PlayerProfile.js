import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatEloChange } from "../elo";
import {
	computePlayerProfile,
	computeStandings,
	formatDate,
	playerKey,
	playerResult,
	plural,
} from "../stats";
import { boardPath, playerPath } from "../paths";
import useBoardMatches from "../useBoardMatches";
import useBoard from "../useBoard";
import { filterBySeason, seasonLabel, useSeasonSelection } from "../seasons";
import { SeasonPicker } from "../LeaderboardDrillDown/Seasons";
import MatchCard from "../LeaderboardDrillDown/MatchCard";
import RenamePlayerModal from "../LeaderboardDrillDown/RenamePlayerModal";
import EloChart from "./EloChart";
import "../LeaderboardDrillDown/LeaderboardDrillDown.css";
import "./PlayerProfile.css";

const RESULT_WORDS = {
	W: ["win", "wins"],
	D: ["draw", "draws"],
	L: ["loss", "losses"],
};
const RESULT_VERB = { W: "Won", D: "Drew", L: "Lost" };
const RECENT_LIMIT = 10;

// One W/D/L result as a chip. Identity is the letter, not just the colour.
export const ResultChip = ({ result, title }) => (
	<span className={`result-chip result-${result}`} title={title}>
		{result}
	</span>
);

// Proportional win/draw/loss bar with a 2px gap between segments.
export const RecordBar = ({ wins, draws, losses }) => {
	const total = wins + draws + losses;
	if (total === 0) return null;
	return (
		<span className="record-bar" aria-hidden="true">
			{[
				["W", wins],
				["D", draws],
				["L", losses],
			]
				.filter(([, n]) => n > 0)
				.map(([r, n]) => (
					<span
						key={r}
						className={`record-bar-segment result-${r}`}
						style={{ flexGrow: n }}
					/>
				))}
		</span>
	);
};

const describeMatch = (match, player) => {
	const me = match.participants.find((p) => p.playerName === player);
	const others = match.participants.filter((p) => p.playerName !== player);
	const result = playerResult(match, player);
	const scores =
		others.length === 1
			? `${me.gamesWon}–${others[0].gamesWon} vs ${others[0].playerName}`
			: `${me.gamesWon} vs ${others.map((o) => `${o.playerName} ${o.gamesWon}`).join(", ")}`;
	return `${RESULT_VERB[result]} ${scores}`;
};

const PlayerProfile = () => {
	const { name, player: playerParam } = useParams();
	const navigate = useNavigate();
	const { matches: allMatches, error, reload } = useBoardMatches(name);
	const { board } = useBoard(name);
	const currentSeason = board.currentSeason;
	const hasSeasons = currentSeason > 1;
	const season = useSeasonSelection(currentSeason);
	const matches = useMemo(
		() => filterBySeason(allMatches, season.selected),
		[allMatches, season.selected],
	);
	// Does this player exist in any season? (For "no games this season".)
	const everPlayed = useMemo(
		() =>
			(allMatches || []).some((m) =>
				m.participants.some(
					(p) => playerKey(p.playerName) === playerKey(playerParam),
				),
			),
		[allMatches, playerParam],
	);
	const [renameOpen, setRenameOpen] = useState(false);
	const [showAll, setShowAll] = useState(false);
	const closeRename = useCallback(() => setRenameOpen(false), []);

	const { rankings, elo } = useMemo(
		() => computeStandings(matches),
		[matches],
	);
	const allPlayers = useMemo(
		() => computeStandings(allMatches).rankings,
		[allMatches],
	);
	// Match the URL to a player ignoring capitals/spacing, then use their real spelling.
	const ranking = rankings.find(
		(r) => playerKey(r.player) === playerKey(playerParam),
	);
	const player = ranking?.player;
	const profile = useMemo(
		() => (player ? computePlayerProfile(matches, player, elo) : null),
		[matches, player, elo],
	);
	const matchesById = useMemo(
		() => new Map((matches || []).map((m) => [m.id, m])),
		[matches],
	);

	const header = (
		<div className="drill-header">
			<div className="drill-header-top">
				<Link
					className="drill-back"
					to={boardPath(name) + season.query}
				>
					← {name}
				</Link>
				{profile && (
					<button
						type="button"
						className="drill-manage"
						onClick={() => setRenameOpen(true)}
					>
						Rename
					</button>
				)}
			</div>
			<h1 className="drill-title">{player || playerParam}</h1>
			<div className="drill-subtitle-row">
				{hasSeasons && (
					<SeasonPicker
						currentSeason={currentSeason}
						selected={season.selected}
						onSelect={season.select}
					/>
				)}
				<p className="drill-subtitle">
					{profile
						? `#${rankings.indexOf(ranking) + 1} of ${rankings.length} · ${name}`
						: matches || error
							? " "
							: "Loading..."}
				</p>
			</div>
		</div>
	);

	if (error || (matches && !profile)) {
		return (
			<div className="drill-container">
				{header}
				<div className="empty-state">
					<div className="empty-icon">
						{error ? "⚠️" : everPlayed ? "🗓️" : "🔍"}
					</div>
					<h2 className="empty-title">
						{error
							? "Something went wrong"
							: everPlayed
								? `No games in ${seasonLabel(season.selected)}`
								: "Player not found"}
					</h2>
					<p className="empty-subtitle">
						{error ||
							(everPlayed
								? `${playerParam} hasn't played in ${seasonLabel(season.selected)} yet.`
								: `There's no player called "${playerParam}" on ${name}.`)}
					</p>
					{!error && everPlayed && (
						<button
							type="button"
							className="show-all-button narrow"
							onClick={() => season.select("all")}
						>
							See all-time stats
						</button>
					)}
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="drill-container">
				{header}
				<div className="loading-state">
					<div className="spinner" />
					<p>Loading player…</p>
				</div>
			</div>
		);
	}

	const streakText = profile.streak
		? `${profile.streak.count} ${RESULT_WORDS[profile.streak.result][profile.streak.count === 1 ? 0 : 1]}`
		: "–";
	const recent = showAll
		? profile.matches
		: profile.matches.slice(0, RECENT_LIMIT);
	const goToPlayer = (p) => navigate(playerPath(name, p) + season.query);

	return (
		<div className="drill-container">
			{header}

			<section className="profile-section">
				<div className="profile-tiles">
					<div className="profile-tile">
						<span className="profile-tile-label">Elo</span>
						<span className="profile-tile-value">
							{Math.round(profile.rating)}
						</span>
						<span className="profile-tile-sub">
							Peak {Math.round(profile.peakRating)}
						</span>
					</div>
					<div className="profile-tile">
						<span className="profile-tile-label">Played</span>
						<span className="profile-tile-value">
							{profile.played}
						</span>
						<span className="profile-tile-sub">
							{profile.wins}W · {profile.draws}D ·{" "}
							{profile.losses}L
						</span>
					</div>
					<div className="profile-tile">
						<span className="profile-tile-label">Win rate</span>
						<span className="profile-tile-value">
							{Math.round(profile.winRate * 100)}%
						</span>
						<span className="profile-tile-sub">
							{plural(profile.wins, "match", "matches")} won
						</span>
					</div>
					<div className="profile-tile">
						<span className="profile-tile-label">Streak</span>
						<span className="profile-tile-value profile-tile-value-small">
							{streakText}
						</span>
						<span className="profile-tile-sub">
							Best run {plural(profile.longestWinStreak, "win")}
						</span>
					</div>
				</div>

				<div className="profile-form">
					<span className="profile-form-label">Form</span>
					<span className="profile-form-chips">
						{profile.form.map((r, i) => {
							const m =
								profile.matches[profile.form.length - 1 - i];
							return (
								<ResultChip
									key={i}
									result={r}
									title={`${describeMatch(m, player)} · ${formatDate(m.timestamp)}`}
								/>
							);
						})}
					</span>
					<span className="profile-form-hint">latest →</span>
				</div>
			</section>

			<section className="profile-section">
				<h2 className="section-label">Rating over time</h2>
				<div className="profile-card">
					<EloChart
						history={profile.history}
						summary={`Elo rating over ${plural(profile.played, "match", "matches")}: started at 1000, now ${Math.round(profile.rating)}, peak ${Math.round(profile.peakRating)}.`}
						describe={(point) => {
							const m = matchesById.get(point.matchId);
							return {
								title: `${formatEloChange(point.change)} · ${formatDate(point.timestamp)}`,
								detail: m ? describeMatch(m, player) : null,
							};
						}}
					/>
				</div>
			</section>

			<section className="profile-section">
				<h2 className="section-label">Head to head</h2>
				<div className="h2h-list">
					{profile.rivals.map((r) => (
						<button
							type="button"
							key={r.opponent}
							className="h2h-row"
							onClick={() => goToPlayer(r.opponent)}
						>
							<span className="h2h-name">{r.opponent}</span>
							<RecordBar
								wins={r.wins}
								draws={r.draws}
								losses={r.losses}
							/>
							<span className="h2h-record">
								<strong>
									{r.wins}–{r.draws}–{r.losses}
								</strong>
								<span className="h2h-played">
									{plural(r.played, "match", "matches")}
								</span>
							</span>
						</button>
					))}
				</div>
				<p className="h2h-key">
					Wins–draws–losses against each opponent, counting every
					match you both played (in bigger matches, whoever won more
					games).
				</p>
			</section>

			<section className="profile-section">
				<h2 className="section-label">Matches</h2>
				<div className="matches-list">
					{recent.map((m, i) => (
						<MatchCard
							key={m.id}
							match={m}
							index={i}
							eloChanges={elo.changesByMatchId.get(m.id)}
							onPlayerClick={(p) => p !== player && goToPlayer(p)}
						/>
					))}
				</div>
				{!showAll && profile.matches.length > RECENT_LIMIT && (
					<button
						type="button"
						className="show-all-button"
						onClick={() => setShowAll(true)}
					>
						Show all {profile.matches.length} matches
					</button>
				)}
			</section>

			{renameOpen && (
				<RenamePlayerModal
					board={name}
					players={allPlayers}
					initialPlayer={player}
					onClose={closeRename}
					onRenamed={(newName) => {
						setRenameOpen(false);
						reload();
						navigate(playerPath(name, newName) + season.query, {
							replace: true,
						});
					}}
				/>
			)}
		</div>
	);
};

export default PlayerProfile;
