import React from "react";
import { Link } from "react-router-dom";
import { STARTING_RATING } from "../elo";
import { playerPath } from "../paths";

const RESULT_TITLES = { W: "Won", D: "Drew", L: "Lost" };

// "▲2" / "▼1" / "NEW" since last week; nothing when unchanged or unknown.
const Movement = ({ movement }) => {
	if (!movement) return null;
	if (movement.isNew) {
		return (
			<span className="movement new" title="New this week">
				NEW
			</span>
		);
	}
	if (movement.change === 0) return null;
	const up = movement.change > 0;
	const places = Math.abs(movement.change);
	return (
		<span
			className={`movement ${up ? "up" : "down"}`}
			title={`${up ? "Up" : "Down"} ${places} ${places === 1 ? "place" : "places"} since last week`}
		>
			<span aria-hidden="true">{up ? "▲" : "▼"}</span>
			<span className="visually-hidden">{up ? "up" : "down"}</span>
			{places}
		</span>
	);
};

const Streak = ({ streak }) =>
	streak && streak.result === "W" && streak.count >= 3 ? (
		<span className="streak" title={`Won the last ${streak.count} matches`}>
			<span aria-hidden="true">🔥</span>
			{streak.count}
		</span>
	) : null;

const MiniForm = ({ form }) => (
	<span
		className="mini-form"
		aria-label={`Last ${form.length}: ${form.join(" ")}`}
	>
		{form.map((r, i) => (
			<span
				key={i}
				className={`mini-chip result-${r}`}
				title={RESULT_TITLES[r]}
			>
				{r}
			</span>
		))}
	</span>
);

const Standings = ({ board, rankings, trends }) => {
	const maxMatchWins = Math.max(0, ...rankings.map((r) => r.matchWins));
	const maxGameWins = Math.max(0, ...rankings.map((r) => r.gameWins));

	return (
		<div className="standings-list">
			{rankings.map((r, i) => {
				const t = trends.get(r.player) || {};
				return (
					<Link
						className="standing-row"
						key={r.player}
						to={playerPath(board, r.player)}
						title={`See ${r.player}'s profile`}
						style={{ animationDelay: `${i * 0.07}s` }}
					>
						<span className={`rank-badge rank-${i + 1}`}>
							{i + 1}
						</span>
						<span className="standing-player">
							<span className="standing-name-line">
								<span className="standing-name">
									{r.player}
								</span>
								<Movement movement={t.movement} />
								<Streak streak={t.streak} />
							</span>
							{t.form && t.form.length > 0 && (
								<MiniForm form={t.form} />
							)}
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
								<strong>{r.matchWins}</strong>{" "}
								{r.matchWins === 1 ? "match" : "matches"}
							</span>
							<span className="stat">
								<strong>{r.gameWins}</strong>{" "}
								{r.gameWins === 1 ? "game" : "games"}
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
					</Link>
				);
			})}
		</div>
	);
};

export default Standings;
