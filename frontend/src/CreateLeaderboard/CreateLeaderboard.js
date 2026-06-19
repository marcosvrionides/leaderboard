import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateLeaderboard.css";

const CreateLeaderboard = () => {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const handleCreate = () => {
		if (!name.trim() || !password.trim()) {
			setError("Please enter a name and password.");
			return;
		}
		if (password.length < 4) {
			setError("Password must be at least 4 characters.");
			return;
		}

		setError(null);
		setSubmitting(true);

		fetch(`${process.env.REACT_APP_API_URL}/api/leaderboards`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: name.trim(), password }),
		})
			.then(async (res) => {
				if (res.status === 409) {
					throw new Error(
						`A leaderboard named "${name.trim()}" already exists.`,
					);
				}
				if (!res.ok) {
					throw new Error("Couldn't create the leaderboard. Please try again.");
				}
				return res.json();
			})
			.then((data) => navigate("/leaderboard/" + data.name))
			.catch((err) => {
				console.error(err);
				setError(err.message);
			})
			.finally(() => setSubmitting(false));
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

				{error && <div className="create-error">{error}</div>}

				<button
					className="submit-button"
					onClick={handleCreate}
					disabled={submitting}
				>
					{submitting ? "Creating…" : "Create Leaderboard"}
				</button>
			</div>
		</div>
	);
};

export default CreateLeaderboard;
