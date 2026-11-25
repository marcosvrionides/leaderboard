import React from "react";
import Modal from "../Modal/Modal";
import {
	expectedScore,
	formatEloChange,
	K_FACTOR,
	STARTING_RATING,
} from "../elo";

// Worked example, computed from the real constants so the explanation
// can never drift out of sync with how ratings are actually calculated.
const EXAMPLE_YOU = STARTING_RATING;
const EXAMPLE_OPPONENT = STARTING_RATING + 100;
const exampleExpected = expectedScore(EXAMPLE_YOU, EXAMPLE_OPPONENT);
const exampleChange = (result) => K_FACTOR * (result - exampleExpected);

const EloInfoModal = ({ onClose }) => (
	<Modal title="How Elo works" className="elo-info" onClose={onClose}>
		<p className="elo-info-lead">
			Elo rates players on <em>who</em> they beat, not just how often they
			win. Beating a strong player is worth more than beating a weak one,
			and simply playing lots of games won't push you up the table.
		</p>

		<section>
			<h3 className="elo-info-heading">The basics</h3>
			<ul className="elo-info-list">
				<li>
					Everyone starts at <strong>{STARTING_RATING}</strong>.
				</li>
				<li>
					Win and you gain points, lose and you drop. One match can
					move a rating by at most <strong>{K_FACTOR}</strong> points.
				</li>
				<li>
					Between two evenly matched players, the winner gains{" "}
					<strong>{K_FACTOR / 2}</strong> and the loser drops{" "}
					<strong>{K_FACTOR / 2}</strong>.
				</li>
				<li>
					Beating someone rated above you earns extra. Losing to them
					costs less.
				</li>
				<li>
					Only the result counts, not the margin:{" "}
					<span className="nowrap">3–0</span> and{" "}
					<span className="nowrap">3–2</span> are worth the same.
					Winning the same number of games is a draw.
				</li>
			</ul>
		</section>

		<section>
			<h3 className="elo-info-heading">Example</h3>
			<p className="elo-info-text">
				You're rated {EXAMPLE_YOU} and play someone rated{" "}
				{EXAMPLE_OPPONENT}. Elo expects you to score{" "}
				{Math.round(exampleExpected * 100)}%, so:
			</p>
			<div className="elo-info-example">
				<div>
					<span className="elo-change up">
						{formatEloChange(exampleChange(1))}
					</span>
					<span>if you win</span>
				</div>
				<div>
					<span className="elo-change up">
						{formatEloChange(exampleChange(0.5))}
					</span>
					<span>for a draw</span>
				</div>
				<div>
					<span className="elo-change down">
						{formatEloChange(exampleChange(0))}
					</span>
					<span>if you lose</span>
				</div>
			</div>
		</section>

		<section>
			<h3 className="elo-info-heading">Matches with 3+ players</h3>
			<p className="elo-info-text">
				Every pair of players counts as a head-to-head. You beat
				everyone you outscored, lost to everyone who outscored you, and
				drew with anyone level with you. Your change is the average of
				those results, so coming first in a four-player match is worth
				about the same as winning a one-on-one.
			</p>
		</section>

		<section>
			<h3 className="elo-info-heading">The maths</h3>
			<div className="elo-info-formula">
				<div>
					Expected = 1 ÷ (1 + 10
					<sup>(opponent − you) ÷ 400</sup>)
				</div>
				<div>Change = {K_FACTOR} × (result − expected)</div>
			</div>
			<p className="elo-info-text">
				Result is 1 for a win, ½ for a draw and 0 for a loss. In matches
				with more players, the change is averaged across all your
				opponents.
			</p>
		</section>

		<p className="elo-info-footnote">
			Ratings are recalculated from the whole match history, in the order
			games were played, so deleting a match updates everyone's rating as
			if it never happened.
		</p>
	</Modal>
);

export default EloInfoModal;
