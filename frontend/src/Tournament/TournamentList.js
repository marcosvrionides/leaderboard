import React from "react";
import { Link } from "react-router-dom";
import { boardPath } from "../paths";

// Tournaments on a board, newest first, for the board page.
const TournamentList = ({ board, tournaments }) => (
	<div className="champions-list">
		{tournaments.map((t) => (
			<Link
				key={t.id}
				className="champion-row tournament-row"
				to={`${boardPath(board)}/tournament/${t.id}`}
			>
				<span className="champion-trophy" aria-hidden="true">
					{t.champion ? "🏆" : "⚔️"}
				</span>
				<span className="champion-text">
					<span className="champion-name">{t.name}</span>
					<span className="champion-meta">
						{t.champion
							? `Won by ${t.champion}`
							: `In progress · ${t.played} of ${t.total} games played`}
					</span>
				</span>
				<span className="champion-stats">
					<span>{t.playerCount} players</span>
				</span>
			</Link>
		))}
	</div>
);

export default TournamentList;
