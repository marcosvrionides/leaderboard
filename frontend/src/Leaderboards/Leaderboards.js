import React from "react";
import { useState, useEffect } from "react";
import "./Leaderboards.css";
import { LeaderboardCard } from "../LeaderboardCard/LeaderboardCard";

// searchTerm is passed in from App.js
const Leaderboards = ({ searchTerm = "" }) => {
	const [leaderboards, setLeaderboards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		setLoading(true);
		setError(null);

		fetch(`${process.env.REACT_APP_API_URL}/api/leaderboards`)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed (${res.status})`);
				return res.json();
			})
			.then((data) => setLeaderboards(data))
			.catch((err) => {
				console.error(err);
				setError("Couldn't load leaderboards. Please try again.");
			})
			.finally(() => setLoading(false));
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
			{error && <div className="leaderboards-empty">{error}</div>}
			{!error && loading && (
				<div className="leaderboards-empty">Loading…</div>
			)}
			{!error && !loading && filtered.length === 0 && (
				<div className="leaderboards-empty">
					{searchTerm
						? "No leaderboards match your search"
						: "No leaderboards yet"}
				</div>
			)}
			{!error &&
				!loading &&
				filtered.map((data, i) => (
					<LeaderboardCard key={data.name} data={data} index={i} />
				))}
		</div>
	);
};

export default Leaderboards;
