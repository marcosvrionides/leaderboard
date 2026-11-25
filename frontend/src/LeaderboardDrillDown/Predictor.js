import React, { useState } from "react";
import { expectedScore, formatEloChange, K_FACTOR } from "../elo";
import { headToHead, plural } from "../stats";

// Describes a head-to-head record from A's point of view.
const recordSentence = (a, b, r) => {
	if (r.played === 0) return `${a} and ${b} haven't played each other yet.`;
	const draws = r.draws ? `, ${plural(r.draws, "draw")}` : "";
	if (r.wins === r.losses)
		return `Level at ${r.wins}–${r.losses}${draws} in ${plural(r.played, "meeting")}.`;
	const [leader, hi, lo] =
		r.wins > r.losses ? [a, r.wins, r.losses] : [b, r.losses, r.wins];
	return `${leader} leads ${hi}–${lo}${draws} in ${plural(r.played, "meeting")}.`;
};

const Predictor = ({ rankings, matches }) => {
	const names = rankings.map((r) => r.player);
	const [a, setA] = useState(names[0]);
	const [b, setB] = useState(names[1]);
	if (names.length < 2) return null;

	// Fall back to the top two if a selected player disappears (e.g. renamed).
	const playerA = names.includes(a) ? a : names[0];
	const playerB =
		names.includes(b) && b !== playerA
			? b
			: names.find((n) => n !== playerA);
	const ratingOf = (p) => rankings.find((r) => r.player === p).elo;
	const ra = ratingOf(playerA);
	const rb = ratingOf(playerB);
	const chanceA = expectedScore(ra, rb);
	const pctA = Math.round(chanceA * 100);
	const record = headToHead(matches, playerA, playerB);

	const select = (value, onChange, other) => (
		<select value={value} onChange={(e) => onChange(e.target.value)}>
			{names
				.filter((n) => n !== other)
				.map((n) => (
					<option key={n} value={n}>
						{n}
					</option>
				))}
		</select>
	);

	return (
		<div className="predictor">
			<div className="predictor-pick">
				{select(playerA, setA, playerB)}
				<button
					type="button"
					className="predictor-swap"
					onClick={() => {
						setA(playerB);
						setB(playerA);
					}}
					title="Swap players"
					aria-label="Swap players"
				>
					⇄
				</button>
				{select(playerB, setB, playerA)}
			</div>

			<div className="predictor-odds">
				<div className="predictor-side">
					<span className="predictor-pct">{pctA}%</span>
					<span className="predictor-meta">{Math.round(ra)} Elo</span>
				</div>
				<div
					className="predictor-bar"
					role="img"
					aria-label={`${playerA} ${pctA}% to win, ${playerB} ${100 - pctA}%`}
				>
					<span
						className="predictor-bar-a"
						style={{ flexGrow: chanceA }}
					/>
					<span
						className="predictor-bar-b"
						style={{ flexGrow: 1 - chanceA }}
					/>
				</div>
				<div className="predictor-side right">
					<span className="predictor-pct">{100 - pctA}%</span>
					<span className="predictor-meta">{Math.round(rb)} Elo</span>
				</div>
			</div>

			<p className="predictor-text">
				{recordSentence(playerA, playerB, record)}
			</p>
			<p className="predictor-text muted">
				At stake: a win is worth{" "}
				{formatEloChange(K_FACTOR * (1 - chanceA))} to {playerA} or{" "}
				{formatEloChange(K_FACTOR * chanceA)} to {playerB}.
			</p>
		</div>
	);
};

export default Predictor;
