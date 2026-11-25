import React, { useLayoutEffect, useRef, useState } from "react";
import { STARTING_RATING } from "../elo";

const HEIGHT = 220;
const PAD = { top: 18, right: 56, bottom: 30, left: 44 };

// Smallest "nice" gridline step that gives at most 4 intervals.
const niceStep = (range) =>
	[5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => range / s <= 4) || 1000;

const useWidth = (ref, fallback) => {
	const [width, setWidth] = useState(fallback);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		setWidth(el.clientWidth || fallback);
		if (typeof ResizeObserver === "undefined") return undefined;
		const observer = new ResizeObserver(([entry]) =>
			setWidth(Math.round(entry.contentRect.width) || fallback),
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref, fallback]);
	return width;
};

/**
 * Single-series line of a player's rating, one step per match.
 * history: [{ matchId, timestamp, rating, change }] oldest first.
 * describe(point) -> { title, detail } for the tooltip.
 */
const EloChart = ({ history, describe, summary }) => {
	const wrapRef = useRef(null);
	const width = useWidth(wrapRef, 640);
	const [active, setActive] = useState(null);

	const points = [{ rating: STARTING_RATING, start: true }, ...history];
	const ratings = points.map((p) => p.rating);
	const min = Math.min(...ratings);
	const max = Math.max(...ratings);
	const step = niceStep(Math.max(max - min, 20));
	const lo = Math.floor((min - step * 0.2) / step) * step;
	const hi = Math.ceil((max + step * 0.2) / step) * step;

	const innerW = Math.max(width - PAD.left - PAD.right, 10);
	const innerH = HEIGHT - PAD.top - PAD.bottom;
	const x = (i) => PAD.left + (i * innerW) / Math.max(points.length - 1, 1);
	const y = (v) => PAD.top + ((hi - v) / (hi - lo)) * innerH;

	const line = points
		.map(
			(p, i) =>
				`${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`,
		)
		.join("");
	const area = `${line}L${x(points.length - 1).toFixed(1)},${y(lo)}L${x(0)},${y(lo)}Z`;
	const ticks = [];
	for (let v = lo; v <= hi; v += step) ticks.push(v);

	const last = points.length - 1;
	const indexAt = (clientX) => {
		const rect = wrapRef.current.getBoundingClientRect();
		const rel = clientX - rect.left - PAD.left;
		const i = Math.round((rel / innerW) * Math.max(points.length - 1, 1));
		return Math.min(Math.max(i, 0), last);
	};

	const onKeyDown = (e) => {
		const moves = {
			ArrowLeft: (i) => Math.max(i - 1, 0),
			ArrowRight: (i) => Math.min(i + 1, last),
			Home: () => 0,
			End: () => last,
		};
		if (!moves[e.key]) return;
		e.preventDefault();
		setActive((i) => moves[e.key](i ?? last));
	};

	const activePoint = active === null ? null : points[active];
	const tip = activePoint
		? activePoint.start
			? { title: "Starting rating", detail: "Everyone starts here" }
			: describe(activePoint)
		: null;
	const tipLeft = active === null ? 0 : x(active);
	const flip = tipLeft > width * 0.6;

	return (
		<div
			className="elo-chart"
			ref={wrapRef}
			tabIndex={0}
			role="group"
			aria-label={`${summary} Use the left and right arrow keys to step through matches.`}
			onKeyDown={onKeyDown}
			onFocus={() => setActive((i) => i ?? last)}
			onBlur={() => setActive(null)}
		>
			<svg
				width={width}
				height={HEIGHT}
				onPointerMove={(e) => setActive(indexAt(e.clientX))}
				onPointerLeave={() => setActive(null)}
				aria-hidden="true"
			>
				{ticks.map((v) => (
					<g key={v}>
						<line
							className={`elo-chart-grid${v === STARTING_RATING ? " start" : ""}`}
							x1={PAD.left}
							x2={width - PAD.right}
							y1={y(v)}
							y2={y(v)}
						/>
						<text
							className="elo-chart-tick"
							x={PAD.left - 8}
							y={y(v)}
							dy="0.32em"
							textAnchor="end"
						>
							{v}
						</text>
					</g>
				))}
				<path className="elo-chart-area" d={area} />
				<path className="elo-chart-line" d={line} />

				<text
					className="elo-chart-tick"
					x={x(0)}
					y={HEIGHT - 8}
					textAnchor="start"
				>
					Start
				</text>
				<text
					className="elo-chart-tick"
					x={x(last)}
					y={HEIGHT - 8}
					textAnchor="end"
				>
					{last === 0
						? ""
						: new Date(points[last].timestamp).toLocaleDateString(
								"en-GB",
								{
									day: "numeric",
									month: "short",
								},
							)}
				</text>

				{activePoint && (
					<>
						<line
							className="elo-chart-crosshair"
							x1={x(active)}
							x2={x(active)}
							y1={PAD.top}
							y2={HEIGHT - PAD.bottom}
						/>
						<circle
							className="elo-chart-dot"
							cx={x(active)}
							cy={y(activePoint.rating)}
							r={4}
						/>
					</>
				)}
				<circle
					className="elo-chart-dot"
					cx={x(last)}
					cy={y(points[last].rating)}
					r={4}
				/>
				<text
					className="elo-chart-end-label"
					x={x(last) + 10}
					y={y(points[last].rating)}
					dy="0.32em"
				>
					{Math.round(points[last].rating)}
				</text>
			</svg>

			{tip && (
				<div
					className="elo-chart-tooltip"
					style={{
						left: tipLeft,
						top: Math.max(y(activePoint.rating) - 12, 0),
						transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -100%)`,
					}}
				>
					<strong>{Math.round(activePoint.rating)}</strong>
					<span className="elo-chart-tooltip-title">{tip.title}</span>
					{tip.detail && (
						<span className="elo-chart-tooltip-detail">
							{tip.detail}
						</span>
					)}
				</div>
			)}
		</div>
	);
};

export default EloChart;
