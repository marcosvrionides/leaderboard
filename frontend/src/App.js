import "./App.css";
import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Leaderboards from "./Leaderboards/Leaderboards";
import { LeaderboardDrillDown } from "./LeaderboardDrillDown/LeaderboardDrillDown";
import CreateLeaderboard from "./CreateLeaderboard/CreateLeaderboard";

const App = () => {
	const navigate = useNavigate();
	// Controls whether the search input is visible
	const [searchOpen, setSearchOpen] = useState(false);
	// The current search term, passed down to the leaderboards list
	const [searchTerm, setSearchTerm] = useState("");

	const handleSearchToggle = () => {
		setSearchOpen((prev) => {
			// When closing, also clear the search term so the full list reappears
			if (prev) setSearchTerm("");
			return !prev;
		});
	};

	return (
		<Routes>
			<Route
				path="/"
				element={
					<div className="app-container">
						<div className="app-header">
							{!searchOpen && (
								<text id="header-name">Leaderboards</text>
							)}
							{/* Search input — slides in when searchOpen is true */}
							{searchOpen && (
								<input
									className="search-input"
									type="text"
									placeholder="Search leaderboards..."
									autoFocus
									value={searchTerm}
									onChange={(e) =>
										setSearchTerm(e.target.value)
									}
								/>
							)}
							<div className="create-search-container">
								{!searchOpen && (
									<button
										className="create-leaderboard-button"
										onClick={(e) => {
											e.stopPropagation();
											navigate(`/create-leaderboard`);
										}}
									>
										Create
									</button>
								)}
								{/* Toggle button — label changes based on state */}
								<div
									className="search-leaderboard-button"
									onClick={handleSearchToggle}
								>
									{searchOpen ? "✕ Close" : "Search"}
								</div>
							</div>
						</div>

						<div className="homescreen-body">
							<div id="left-hand-pane"></div>
							<div id="middle-pane">
								{/* Pass the search term down so Leaderboards can filter */}
								<Leaderboards searchTerm={searchTerm} />
							</div>
							<div id="right-hand-pane"></div>
						</div>
					</div>
				}
			/>
			<Route
				path="/leaderboard/:name"
				element={<LeaderboardDrillDown />}
			/>
			<Route path="/create-leaderboard" element={<CreateLeaderboard />} />
		</Routes>
	);
};

export default App;
