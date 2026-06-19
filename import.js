// Import the file system module so we can read files from disk
const fs = require("fs");

// Read the Firebase JSON export file from disk as raw text
const raw = fs.readFileSync(
	"C:\\Projects\\leaderboard\\leaderboards-9c5f0-default-rtdb-export.json",
);

// Parse the raw text into a JavaScript object we can work with
const data = JSON.parse(raw);

// Keys in the Firebase JSON that are not leaderboards
const RESERVED_KEYS = ["password", "users"];

async function importAll() {
	// NOTE: the backend no longer supports wiping all leaderboards/matches in
	// one unauthenticated call (that endpoint was a security hole and has been
	// removed). Re-running this script is now safe: leaderboards that already
	// exist are simply skipped instead of being silently overwritten.

	// ── STEP 1: Loop through every top-level key in the Firebase JSON
	for (const leaderboardName of Object.keys(data)) {
		// Skip reserved keys that aren't leaderboards
		if (RESERVED_KEYS.includes(leaderboardName)) continue;

		const leaderboardData = data[leaderboardName];

		// Get the password if it exists, otherwise use empty string
		let password = "";
		if (leaderboardData.password) {
			password = Object.values(leaderboardData.password)[0] || "";
		}

		// ── STEP 2: Create the leaderboard via the API
		const leaderboardRes = await fetch(
			`${process.env.REACT_APP_API_URL}/api/leaderboards`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: leaderboardName,
					password,
				}),
			},
		);

		if (leaderboardRes.status === 409) {
			console.log(
				`Skipping "${leaderboardName}" — already exists.`,
			);
			continue;
		}

		if (!leaderboardRes.ok) {
			console.error(
				`Failed to create leaderboard "${leaderboardName}": ${leaderboardRes.status}`,
			);
			continue;
		}

		const leaderboard = await leaderboardRes.json();
		console.log(`Created leaderboard: ${leaderboard.name}`);

		let matchCount = 0;

		// ── STEP 3: Loop through every entry inside this leaderboard
		for (const [key, value] of Object.entries(leaderboardData)) {
			// Skip the password entry — it's not a match
			if (key === "password") continue;

			// ── STEP 4: Create the match via the API.
			// Match creation is password-protected, so we pass the
			// leaderboard's own password back as a header.
			const matchRes = await fetch(
				`${process.env.REACT_APP_API_URL}/api/matches`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Leaderboard-Password": password,
					},
					body: JSON.stringify({
						player1Name: value.player_1_name,
						player2Name: value.player_2_name,
						// Parse games won as integers — Firebase stores them as strings
						// Fall back to 0 if the value is missing or invalid
						player1GamesWon: parseInt(value.player_1_games_won) || 0,
						player2GamesWon: parseInt(value.player_2_games_won) || 0,
						// Use empty string if no note was left on the match
						note: value.note || "",
						// Use 0 if no timestamp exists
						timestamp: value.timestamp || 0,
						// Link this match to its leaderboard using the leaderboard's ID
						leaderboard: { name: leaderboardName },
					}),
				},
			);

			if (!matchRes.ok) {
				console.error(
					`Failed to import a match for "${leaderboardName}": ${matchRes.status}`,
				);
				continue;
			}

			matchCount++;
		}

		if (matchCount > 0) {
			console.log(
				`Imported ${matchCount} matches for: ${leaderboard.name}`,
			);
		}
	}

	console.log("Import complete!");
}

// Run the import
importAll();
