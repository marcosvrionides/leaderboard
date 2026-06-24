import React from "react";
import { useNavigate } from "react-router-dom";
import "./LeaderboardCard.css";

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
			onClick={() => navigate(`/leaderboard/${data.name}`)}
		>
			<div className="leaderboard-card-left">
				{!hideIndex && (
					<span className="leaderboard-card-index">{index + 1}</span>
				)}
				<span className="leaderboard-name">{data.name}</span>
			</div>
			<div className="leaderboard-card-actions">
				<button
					className={`favourite-button${isFavourite ? " is-favourite" : ""}`}
					onClick={(e) => {
						e.stopPropagation();
						onToggleFavourite(data.name);
					}}
					title={isFavourite ? "Remove from favourites" : "Add to favourites"}
					aria-label={
						isFavourite ? "Remove from favourites" : "Add to favourites"
					}
				>
					{isFavourite ? "★" : "☆"}
				</button>
				<button
					className="open-leaderboard-button"
					onClick={(e) => {
						e.stopPropagation();
						navigate(`/leaderboard/${data.name}`);
					}}
				>
					Open →
				</button>
			</div>
		</div>
	);
};
