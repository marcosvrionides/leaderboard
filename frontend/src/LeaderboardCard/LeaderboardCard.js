import React from "react";
import { useNavigate } from "react-router-dom";
import { boardPath } from "../paths";
import { plural, timeAgo } from "../stats";
import "./LeaderboardCard.css";

// "👑 Priya 1095 · 46 matches · 2 days ago", or "No games yet". Older
// backends don't send these fields, in which case nothing is shown.
const BoardMeta = ({ data }) => {
	if (data.matchCount === undefined) return null;
	const season = data.season > 1 ? `Season ${data.season}` : null;
	const unlisted = data.unlisted && (
		<span
			className="leaderboard-meta-unlisted"
			title="Only people with the link can find this board"
		>
			Unlisted
		</span>
	);
	if (!data.matchCount) {
		return (
			<span className="leaderboard-meta">
				{unlisted}
				<span>
					{season ? `${season} just started` : "No games yet"}
				</span>
			</span>
		);
	}
	return (
		<span className="leaderboard-meta">
			{unlisted}
			{season && <span>{season}</span>}
			{data.leader && (
				<span
					className="leaderboard-meta-leader"
					title="Current leader"
				>
					<span aria-hidden="true">👑 </span>
					<span className="visually-hidden">Leader: </span>
					{data.leader}
					{data.leaderRating != null && (
						<span className="leaderboard-meta-rating">
							{" "}
							{data.leaderRating}
						</span>
					)}
				</span>
			)}
			<span>{plural(data.matchCount, "match", "matches")}</span>
			{data.lastPlayed && <span>{timeAgo(data.lastPlayed)}</span>}
		</span>
	);
};

export const LeaderboardCard = ({
	data,
	index,
	isFavourite,
	onToggleFavourite,
	hideIndex = false,
}) => {
	const navigate = useNavigate();

	return (
		<div
			className="leaderboard-card-container"
			style={{ animationDelay: `${index * 0.07}s` }}
			onClick={() => navigate(boardPath(data.name))}
		>
			<div className="leaderboard-card-left">
				{!hideIndex && (
					<span className="leaderboard-card-index">{index + 1}</span>
				)}
				<span className="leaderboard-card-text">
					<span className="leaderboard-name">{data.name}</span>
					<BoardMeta data={data} />
				</span>
			</div>
			<div className="leaderboard-card-actions">
				<button
					className={`favourite-button${isFavourite ? " is-favourite" : ""}`}
					onClick={(e) => {
						e.stopPropagation();
						onToggleFavourite(data.name);
					}}
					title={
						isFavourite
							? "Remove from favourites"
							: "Add to favourites"
					}
					aria-label={
						isFavourite
							? "Remove from favourites"
							: "Add to favourites"
					}
				>
					{isFavourite ? "★" : "☆"}
				</button>
				<button
					className="open-leaderboard-button"
					aria-label={`Open ${data.name}`}
					onClick={(e) => {
						e.stopPropagation();
						navigate(boardPath(data.name));
					}}
				>
					<span className="open-label">Open </span>→
				</button>
			</div>
		</div>
	);
};
