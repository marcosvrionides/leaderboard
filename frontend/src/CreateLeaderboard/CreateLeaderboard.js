import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateLeaderboard.css";

const CreateLeaderboard = () => {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");

	const handleCreate = () => {
		fetch("http://localhost:8080/api/leaderboards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, password }),
		})
			.then((res) => res.json())
			.then((data) => navigate("/leaderboard/" + data.name))
			.catch((err) => console.error(err));
	};

	return (
		<div className="create-container">
			<div className="create-header">
				<button className="back-button" onClick={() => navigate("/")}>
					← Back
				</button>
				<h1 className="create-title">New Leaderboard</h1>
			</div>

			<div className="create-form">
				<div className="form-field">
					<label htmlFor="leaderboard-name">Leaderboard Name</label>
					<input
						type="text"
						id="leaderboard-name"
						placeholder="e.g. Backgammon 2024"
						autoComplete="off"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<div className="form-field">
					<label htmlFor="leaderboard-password">Password</label>
					<input
						type="password"
						id="leaderboard-password"
						placeholder="Enter a password"
						autoComplete="new-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>

				<button className="submit-button" onClick={handleCreate}>
					Create Leaderboard
				</button>
			</div>
		</div>
	);
};

export default CreateLeaderboard;
