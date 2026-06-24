import React from "react";
import { useState, useEffect } from "react";
import "./Leaderboards.css";
import { LeaderboardCard } from "../LeaderboardCard/LeaderboardCard";
import { useFavourites } from "../useFavourites";

const Leaderboards = ({ searchTerm = "" }) => {
	const [leaderboards, setLeaderboards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { toggleFavourite, isFavourite } = useFavourites();

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

	const filtered = leaderboards.filter((lb) =>
		lb.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const favouriteCards = leaderboards.filter((lb) => isFavourite(lb.name));
	const otherCards = filtered.filter((lb) => !isFavourite(lb.name));

	const cardProps = (lb) => ({
		key: lb.name,
		data: lb,
		isFavourite: isFavourite(lb.name),
		onToggleFavourite: toggleFavourite,
	});

	// While searching, collapse to a single full-width results list
	if (searchTerm) {
		return (
			<div className="leaderboards-search-results">
				<p className="leaderboards-section-label">
					Results for "{searchTerm}"
				</p>
				{filtered.length === 0 ? (
					<div className="leaderboards-empty">
						No leaderboards match your search
					</div>
				) : (
					<div className="leaderboards-list">
						{filtered.map((lb, i) => (
							<LeaderboardCard {...cardProps(lb)} index={i} />
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className={`leaderboards-layout${favouriteCards.length === 0 ? " no-favourites" : ""}`}
		>
			{/* ── Main pane: Favourites ── */}
			<div className="leaderboards-main">
				<p className="leaderboards-section-label">Favourites</p>
				{error && <div className="leaderboards-empty">{error}</div>}
				{!error && loading && (
					<div className="leaderboards-empty">Loading…</div>
				)}
				{!error && !loading && favouriteCards.length === 0 && (
					<div className="leaderboards-no-favourites">
						<span className="leaderboards-no-favourites-icon">
							☆
						</span>
						<p>No favourites yet</p>
						<p className="leaderboards-no-favourites-hint">
							Star a leaderboard to pin it here for quick access
						</p>
					</div>
				)}
				{!error && !loading && favouriteCards.length > 0 && (
					<div className="leaderboards-list">
						{favouriteCards.map((lb, i) => (
							<LeaderboardCard
								{...cardProps(lb)}
								index={i}
								hideIndex={true}
							/>
						))}
					</div>
				)}
			</div>

			{/* ── Sidebar: All Leaderboards ── */}
			<div className="leaderboards-sidebar">
				<div className="leaderboards-sidebar-inner">
					<p className="leaderboards-section-label">
						All Leaderboards
					</p>
					{error && <div className="leaderboards-empty">{error}</div>}
					{!error && loading && (
						<div className="leaderboards-empty">Loading…</div>
					)}
					{!error && !loading && otherCards.length === 0 && (
						<div className="leaderboards-empty">
							{leaderboards.length === 0
								? "No leaderboards yet"
								: "All leaderboards are favourited"}
						</div>
					)}
					{!error && !loading && otherCards.length > 0 && (
						<div className="leaderboards-list">
							{otherCards.map((lb, i) => (
								<LeaderboardCard {...cardProps(lb)} index={i} />
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Leaderboards;
