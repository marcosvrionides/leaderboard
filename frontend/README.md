# Leaderboard App

This frontend is a React app for a leaderboard service. It connects to the backend API to show leaderboards, create new boards, and record match results.

## What the app does

- Lists all available leaderboards.
- Lets users search leaderboards by name.
- Lets users favourite leaderboards for quick access.
- Lets users create a new leaderboard with a secure password.
- Lets users open a leaderboard to view standings and match history.
- Lets users add a new match result to a leaderboard by entering player names, game scores, an optional note, and the leaderboard password.
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
