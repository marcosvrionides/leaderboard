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
	// ── STEP 1: Delete all existing matches first (must delete matches before
	//           leaderboards due to the foreign key relationship between them)
	console.log("Deleting existing matches...");
	await fetch("http://localhost:8080/api/matches/all", { method: "DELETE" });

	// ── STEP 2: Delete all existing leaderboards
	console.log("Deleting existing leaderboards...");
	await fetch("http://localhost:8080/api/leaderboards/all", {
		method: "DELETE",
	});

	// ── STEP 3: Loop through every top-level key in the Firebase JSON
	for (const leaderboardName of Object.keys(data)) {
		// Skip reserved keys that aren't leaderboards
		if (RESERVED_KEYS.includes(leaderboardName)) continue;

		const leaderboardData = data[leaderboardName];

		// Get the password if it exists, otherwise use empty string
		let password = "";
		if (leaderboardData.password) {
			password = Object.values(leaderboardData.password)[0] || "";
		}

		// ── STEP 4: Create the leaderboard via the API
		const leaderboardRes = await fetch(
			"http://localhost:8080/api/leaderboards",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: leaderboardName,
					password,
				}),
			},
		);

		const leaderboard = await leaderboardRes.json();
		console.log(`Created leaderboard: ${leaderboard.name}`);

		let matchCount = 0;

		// ── STEP 5: Loop through every entry inside this leaderboard
		for (const [key, value] of Object.entries(leaderboardData)) {
			// Skip the password entry — it's not a match
			if (key === "password") continue;

			// ── STEP 6: Create the match via the API
			await fetch("http://localhost:8080/api/matches", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
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
			});

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
