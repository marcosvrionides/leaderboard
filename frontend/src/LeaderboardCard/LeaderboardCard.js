import React from "react";
import { useNavigate } from "react-router-dom";
import "./LeaderboardCard.css";

export const LeaderboardCard = ({ data, index }) => {
	const navigate = useNavigate();

	return (
		<div
			className="leaderboard-card-container"
			style={{ animationDelay: `${index * 0.07}s` }}
			onClick={() => navigate(`/leaderboard/${data.name}`)}
		>
			<div className="leaderboard-card-left">
				<span className="leaderboard-card-index">{index + 1}</span>
				<span className="leaderboard-name">{data.name}</span>
			</div>
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
	);
};
