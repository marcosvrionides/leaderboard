import React from "react";
import { useState, useEffect } from "react";
import "./Leaderboards.css";
import { LeaderboardCard } from "../LeaderboardCard/LeaderboardCard";

// searchTerm is passed in from App.js
const Leaderboards = ({ searchTerm = "" }) => {
	const [leaderboards, setLeaderboards] = useState([]);

	useEffect(() => {
		fetch("http://localhost:8080/api/leaderboards")
			.then((res) => res.json())
			.then((data) => setLeaderboards(data));
	}, []);

	// Filter client-side — case-insensitive match on leaderboard name
	const filtered = leaderboards.filter((lb) =>
		lb.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="leaderboards-container">
			<p className="leaderboards-section-label">
				{/* Update label to reflect search state */}
				{searchTerm
					? `Results for "${searchTerm}"`
					: "All Leaderboards"}
			</p>
			{filtered.length === 0 && (
				<div className="leaderboards-empty">
					{searchTerm
						? "No leaderboards match your search"
						: "No leaderboards yet"}
				</div>
			)}
			{filtered.map((data, i) => (
				<LeaderboardCard key={data.name} data={data} index={i} />
			))}
		</div>
	);
};

export default Leaderboards;
