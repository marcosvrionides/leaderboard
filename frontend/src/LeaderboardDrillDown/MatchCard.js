import React from "react";
import { formatEloChange } from "../elo";
import { formatDate, getMatchWinnerNames } from "../stats";

// Shows a match's rating change as "+16", "−16" or "±0".
export const EloChange = ({ change }) => {
	if (change === undefined) return null;
	const rounded = Math.round(change);
	const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "";
	return (
		<span
			className={`elo-change ${direction}`}
			title="Elo rating change from this match"
		>
			{formatEloChange(change)}
		</span>
	);
};

const MatchCard = ({
	match,
	eloChanges,
	onDelete,
	onPlayerClick,
	index = 0,
}) => {
	const winnerNames = getMatchWinnerNames(match.participants);
	const sortedParticipants = [...match.participants].sort(
		(a, b) => b.gamesWon - a.gamesWon,
	);

	return (
		<div
			className="match-card"
			style={{ animationDelay: `${Math.min(index, 12) * 0.05}s` }}
		>
			<div className="match-card-top">
				<div className="match-date">{formatDate(match.timestamp)}</div>
				{onDelete && (
					<button
						type="button"
						className="match-delete"
						onClick={() => onDelete(match)}
						title="Delete this match"
					>
						Delete
					</button>
				)}
			</div>
			<div className="match-participants">
				{sortedParticipants.map((p, pi) => (
					<div
						className={`match-participant-row ${winnerNames.includes(p.playerName) ? "winner" : ""}`}
						key={pi}
					>
						{onPlayerClick ? (
							<button
								type="button"
								className="participant-name participant-link"
								onClick={() => onPlayerClick(p.playerName)}
							>
								{p.playerName}
							</button>
						) : (
							<span className="participant-name">
								{p.playerName}
							</span>
						)}
						<span className="participant-result">
							<EloChange change={eloChanges?.get(p.playerName)} />
							<span className="participant-score">
								{p.gamesWon}
							</span>
						</span>
					</div>
				))}
			</div>
			{match.note && <div className="match-note">{match.note}</div>}
		</div>
	);
};

export default MatchCard;
