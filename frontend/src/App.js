import "./App.css";
import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Leaderboards from "./Leaderboards/Leaderboards";
import { LeaderboardDrillDown } from "./LeaderboardDrillDown/LeaderboardDrillDown";
import CreateLeaderboard from "./CreateLeaderboard/CreateLeaderboard";
import useTheme from "./useTheme";

const App = () => {
	const navigate = useNavigate();
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const { theme, toggleTheme } = useTheme();

	const handleSearchToggle = () => {
		setSearchOpen((prev) => {
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
								<span id="header-name">Leaderboards</span>
							)}
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
										className="icon-button create-leaderboard-button"
										onClick={(e) => {
											e.stopPropagation();
											navigate(`/create-leaderboard`);
										}}
										title="Create leaderboard"
									>
										+
									</button>
								)}
								<button
									className="icon-button search-leaderboard-button"
									onClick={handleSearchToggle}
									title={
										searchOpen ? "Close search" : "Search"
									}
								>
									{searchOpen ? "✕" : "🔍"}
								</button>
								<button
									className="icon-button theme-toggle"
									onClick={toggleTheme}
									title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
								>
									{theme === "dark" ? "☀️" : "🌙"}
								</button>
							</div>
						</div>

						<div className="homescreen-body">
							<Leaderboards searchTerm={searchTerm} />
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
