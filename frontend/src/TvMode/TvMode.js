import React, {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import { formatEloChange } from "../elo";
import {
	computeStandings,
	computeTrends,
	getMatchWinnerNames,
	newestFirst,
} from "../stats";
import { filterBySeason, seasonLabel } from "../seasons";
import { boardPath } from "../paths";
import useBoard from "../useBoard";
import useBoardMatches from "../useBoardMatches";
import "./TvMode.css";

const REFRESH_MS = 30 * 1000;
const IDLE_MS = 3000;
const MAX_ROWS = 10;
const MAX_RESULTS = 6;

const timeOfDay = (ts) =>
	new Date(ts).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});

// Keeps the screen awake where the browser allows it (re-requested when the
// tab becomes visible again, since the lock is released when hidden).
const useWakeLock = () => {
	useEffect(() => {
		let lock = null;
		const request = async () => {
			try {
				if (
					navigator.wakeLock &&
					document.visibilityState === "visible"
				) {
					lock = await navigator.wakeLock.request("screen");
				}
			} catch (e) {
				// Not supported or not allowed; the screen may sleep.
			}
		};
		request();
		document.addEventListener("visibilitychange", request);
		return () => {
			document.removeEventListener("visibilitychange", request);
			if (lock) lock.release().catch(() => {});
		};
	}, []);
};

// True after the mouse/keyboard has been idle for a few seconds.
const useIdle = () => {
	const [idle, setIdle] = useState(false);
	useEffect(() => {
		let timer = setTimeout(() => setIdle(true), IDLE_MS);
		const wake = () => {
			setIdle(false);
			clearTimeout(timer);
			timer = setTimeout(() => setIdle(true), IDLE_MS);
		};
		window.addEventListener("mousemove", wake);
		window.addEventListener("keydown", wake);
		window.addEventListener("touchstart", wake);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("mousemove", wake);
			window.removeEventListener("keydown", wake);
			window.removeEventListener("touchstart", wake);
		};
	}, []);
	return idle;
};

// Height of one standings row in --row units (padding, name, form chips,
// border and the gap below it), used to size rows to the space available.
const ROW_UNITS = 10.8;

/**
 * Picks the --row size (px) so `count` rows (plus the "+N more" line) fill
 * the standings column without overflowing, never larger than 1vh.
 * Portrait screens scroll instead, so they use a fixed size.
 */
const useRowSize = (ref, count, hasMore) => {
	const [rowPx, setRowPx] = useState(null);
	useLayoutEffect(() => {
		const measure = () => {
			const el = ref.current;
			if (!el || count === 0) return;
			const vh = window.innerHeight / 100;
			if (window.innerWidth <= window.innerHeight) {
				setRowPx(0.55 * vh);
				return;
			}
			const available = el.parentElement.clientHeight;
			const units = count * ROW_UNITS + (hasMore ? 3 : 0);
			setRowPx(Math.min(vh, available / units));
		};
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [ref, count, hasMore]);
	return rowPx;
};

const TvMode = () => {
	const { name } = useParams();
	const { matches: allMatches, error, reload } = useBoardMatches(name);
	const { board, reload: reloadBoard } = useBoard(name);
	const [updatedAt, setUpdatedAt] = useState(Date.now());
	const [isFullscreen, setIsFullscreen] = useState(false);
	const idle = useIdle();
	const rootRef = useRef(null);
	const standingsRef = useRef(null);
	useWakeLock();

	useEffect(() => {
		const timer = setInterval(() => {
			Promise.all([reload(), reloadBoard()]).then(() =>
				setUpdatedAt(Date.now()),
			);
		}, REFRESH_MS);
		return () => clearInterval(timer);
	}, [reload, reloadBoard]);

	useEffect(() => {
		const onChange = () =>
			setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);

	const season = board.currentSeason;
	const matches = useMemo(
		() => filterBySeason(allMatches, season),
		[allMatches, season],
	);
	const { rankings, elo } = useMemo(
		() => computeStandings(matches),
		[matches],
	);
	const trends = useMemo(
		() => computeTrends(matches, rankings),
		[matches, rankings],
	);
	const latest = newestFirst(matches).slice(0, MAX_RESULTS);
	const rows = rankings.slice(0, MAX_ROWS);
	const rowPx = useRowSize(
		standingsRef,
		rows.length,
		rankings.length > MAX_ROWS,
	);

	const toggleFullscreen = () => {
		if (document.fullscreenElement) document.exitFullscreen();
		else rootRef.current?.requestFullscreen?.().catch(() => {});
	};

	return (
		<div className={`tv${idle ? " idle" : ""}`} ref={rootRef}>
			<header className="tv-header">
				<div>
					<h1 className="tv-title">{name}</h1>
					<div className="tv-subtitle">
						{season > 1 && <span>{seasonLabel(season)}</span>}
						<span>
							<span className="tv-live-dot" aria-hidden="true" />{" "}
							Live · updated {timeOfDay(updatedAt)}
						</span>
					</div>
				</div>
				<div className="tv-controls">
					<button type="button" onClick={toggleFullscreen}>
						{isFullscreen ? "Exit full screen" : "Full screen"}
					</button>
					<Link to={boardPath(name)}>Close</Link>
				</div>
			</header>

			{error && (
				<p className="tv-message">{error} Retrying automatically…</p>
			)}
			{!error && matches && matches.length === 0 && (
				<p className="tv-message">
					No games yet{season > 1 ? " this season" : ""}. Play one!
				</p>
			)}

			{rows.length > 0 && (
				<main className="tv-body">
					<section
						className="tv-standings"
						aria-label="Standings"
						ref={standingsRef}
						style={rowPx ? { "--row": `${rowPx}px` } : undefined}
					>
						{rows.map((r, i) => {
							const t = trends.get(r.player) || {};
							const move = t.movement;
							return (
								<div
									className={`tv-row tv-place-${i + 1}`}
									key={r.player}
								>
									<span className="tv-rank">{i + 1}</span>
									<span className="tv-player">
										<span className="tv-name">
											{r.player}
											{t.streak?.result === "W" &&
												t.streak.count >= 3 && (
													<span className="tv-streak">
														{" "}
														🔥{t.streak.count}
													</span>
												)}
										</span>
										<span className="tv-form">
											{(t.form || []).map((res, j) => (
												<span
													key={j}
													className={`tv-chip result-${res}`}
												>
													{res}
												</span>
											))}
										</span>
									</span>
									<span className="tv-move">
										{move?.isNew
											? "NEW"
											: move?.change > 0
												? `▲${move.change}`
												: move?.change < 0
													? `▼${-move.change}`
													: ""}
									</span>
									<span className="tv-elo">
										{Math.round(r.elo)}
									</span>
								</div>
							);
						})}
						{rankings.length > MAX_ROWS && (
							<p className="tv-more">
								+{rankings.length - MAX_ROWS} more players
							</p>
						)}
					</section>

					<section className="tv-results" aria-label="Latest results">
						<h2>Latest results</h2>
						{latest.map((m) => {
							const winners = getMatchWinnerNames(m.participants);
							const changes = elo.changesByMatchId.get(m.id);
							return (
								<div className="tv-result" key={m.id}>
									<span className="tv-result-time">
										{new Date(
											m.timestamp,
										).toLocaleDateString("en-GB", {
											day: "numeric",
											month: "short",
										})}
									</span>
									{[...m.participants]
										.sort((a, b) => b.gamesWon - a.gamesWon)
										.map((p) => (
											<span
												key={p.playerName}
												className={`tv-result-line${winners.includes(p.playerName) ? " winner" : ""}`}
											>
												<span className="tv-result-name">
													{p.playerName}
												</span>
												<span className="tv-result-change">
													{changes?.has(p.playerName)
														? formatEloChange(
																changes.get(
																	p.playerName,
																),
															)
														: ""}
												</span>
												<span className="tv-result-score">
													{p.gamesWon}
												</span>
											</span>
										))}
								</div>
							);
						})}
					</section>
				</main>
			)}
		</div>
	);
};

export default TvMode;
