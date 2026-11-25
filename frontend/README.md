# Leaderboard App

This frontend is a React app for a leaderboard service. It connects to the backend API to show leaderboards, create new boards, and record match results.

## What the app does

- Lists all available leaderboards, each with its current leader, number of matches and when it was last played.
- Lets users search leaderboards by name.
- Lets board owners delete a leaderboard from **Manage → Delete leaderboard** (password, plus typing the board's name). This removes all its games, in every season, and its tournaments.
- Lets users favourite leaderboards for quick access (from the home page or the ☆ on a board).
- Lets users create a new leaderboard with a secure password, optionally **unlisted**: hidden from the home page and search, but viewable by anyone with the link. Visibility can be changed later from **Manage**.
- Lets users open a leaderboard to view standings and match history.
- Ranks players by Elo rating (everyone starts at 1000), recalculated from the full match history, and shows each player's rating change on every match. Matches with 3+ players are scored as head-to-head results between every pair.
- Lets users add a new match result to a leaderboard by entering player names, game scores, an optional note, and the leaderboard password.
- Lets users delete a match (leaderboard password required); ratings are recalculated automatically.
- Remembers a board's password for the rest of the browser session after it's used once.
- Treats player names that differ only in capitals or spacing ("Marcos", "marcos ") as the same player, both when saving matches and when showing older data.
- Lets board owners rename a player, or merge two names for the same person, from **Manage**.
- Standings show each player's last five results, a 🔥 streak for 3+ wins in a row, and how many places they've moved since a week ago (▲/▼, or NEW).
- "Who'd win?": pick any two players to see each one's chance of winning (from Elo), their head-to-head record, and how many points a win would be worth.
- **Share** button on each board: uses the phone's share sheet or copies a link. The link shows a rich preview in chat apps (board name, current leader, and a preview image) and opens the board.
- Seasons: from **Manage**, start a new season to crown the current leader as champion and reset everyone to 1000 Elo. Past seasons (and an all-time view) stay available from the season picker, with a list of past champions.
- TV display (Manage → TV display, or `/leaderboard/<name>/tv`): full-screen standings and latest results for a screen in the office or pub. Refreshes every 30 seconds, keeps the screen awake where supported, and hides the cursor and controls when idle.
- Tournaments (Manage → Start a tournament): knockout brackets for any group of players, seeded by Elo or drawn at random, with byes for the top seeds. Record results on the bracket; each game is saved as a normal match, so it counts towards Elo. Results can be undone until the next round is played.
- Player profile pages (tap a player in the standings or match history): Elo, peak, win rate, streaks, last-5 form, a rating-over-time chart, head-to-head records against each opponent, and their match history.
- Supports light and dark theme switching.

## How to run

1. Install dependencies:

```bash
npm install
```

2. Set the backend API URL in your environment. Example:

```bash
set REACT_APP_API_URL=http://localhost:8080
```

3. Start the development server:

```bash
npm start
```

4. Open the app in your browser:

```text
http://localhost:3000
```

> The frontend expects the backend service to expose the API endpoints under `REACT_APP_API_URL`, including `/api/leaderboards` and `/api/matches`.

## Scripts

- `npm start` — start the app in development mode.
- `npm run build` — build the app for production into the `build/` folder.
- `npm test` — run the test suite.

## Notes

- The leaderboard creation flow requires a name and a password.
- Match submission requires the leaderboard password to record a game.
- Leaderboards are fetched from the backend on load, and match history data is refreshed when changes are made.
