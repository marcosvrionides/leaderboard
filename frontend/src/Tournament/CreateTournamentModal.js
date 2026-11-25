import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch, seg } from "../api";
import { cleanName, playerKey } from "../stats";
import useBoardPassword from "../useBoardPassword";

const MIN = 3;
const MAX = 32;

const bracketShape = (n) => {
	let size = 2;
	while (size < n) size *= 2;
	return { rounds: Math.log2(size), byes: size - n };
};

// players: every player on the board, best current Elo first.
const CreateTournamentModal = ({ board, players, onClose, onCreated }) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const [name, setName] = useState("");
	const [selected, setSelected] = useState(
		() => new Set(players.slice(0, 8)),
	);
	const [extra, setExtra] = useState([]);
	const [newName, setNewName] = useState("");
	const [seeding, setSeeding] = useState("elo");
	const [password, setPassword] = useState(savedPassword);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const everyone = [...players, ...extra];
	const chosen = everyone.filter((p) => selected.has(p));
	const toggle = (p) =>
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(p)) next.delete(p);
			else next.add(p);
			return next;
		});

	const addPlayer = () => {
		const cleaned = cleanName(newName);
		if (!cleaned) return;
		const existing = everyone.find(
			(p) => playerKey(p) === playerKey(cleaned),
		);
		if (existing) {
			setSelected((prev) => new Set(prev).add(existing));
		} else {
			setExtra((prev) => [...prev, cleaned]);
			setSelected((prev) => new Set(prev).add(cleaned));
		}
		setNewName("");
	};

	const create = async () => {
		if (!cleanName(name)) {
			setError("Give the tournament a name.");
			return;
		}
		if (chosen.length < MIN || chosen.length > MAX) {
			setError(`Pick between ${MIN} and ${MAX} players.`);
			return;
		}
		if (!password) {
			setError("Enter the leaderboard password.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const t = await apiFetch(
				`/api/leaderboards/${seg(board)}/tournaments`,
				{
					method: "POST",
					password,
					body: { name: cleanName(name), players: chosen, seeding },
				},
			);
			remember(password);
			onCreated(t);
		} catch (e) {
			if (e.status === 403) forget();
			setError(e.message);
			setSaving(false);
		}
	};

	const shape = bracketShape(Math.max(chosen.length, 2));

	return (
		<Modal title="New Tournament" onClose={onClose}>
			<div className="modal-body">
				<div className="form-field">
					<label>Tournament name</label>
					<input
						type="text"
						placeholder="e.g. Winter Cup"
						maxLength={60}
						autoComplete="off"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<div className="form-field">
					<label>Players ({chosen.length} selected)</label>
					<div className="player-picker">
						{everyone.map((p) => (
							<label
								key={p}
								className={`player-pick${selected.has(p) ? " on" : ""}`}
							>
								<input
									type="checkbox"
									checked={selected.has(p)}
									onChange={() => toggle(p)}
								/>
								{p}
							</label>
						))}
					</div>
					<div className="player-picker-add">
						<input
							type="text"
							placeholder="Add someone new"
							maxLength={50}
							autoComplete="off"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addPlayer();
								}
							}}
						/>
						<button type="button" onClick={addPlayer}>
							Add
						</button>
					</div>
				</div>

				<div
					className="choice-list"
					role="radiogroup"
					aria-label="Seeding"
				>
					<label
						className={`choice${seeding === "elo" ? " selected" : ""}`}
					>
						<input
							type="radio"
							name="seeding"
							checked={seeding === "elo"}
							onChange={() => setSeeding("elo")}
						/>
						<span>
							<strong>Seed by Elo</strong>
							<span>
								Best-rated players are kept apart until the
								later rounds, and get any byes.
							</span>
						</span>
					</label>
					<label
						className={`choice${seeding === "random" ? " selected" : ""}`}
					>
						<input
							type="radio"
							name="seeding"
							checked={seeding === "random"}
							onChange={() => setSeeding("random")}
						/>
						<span>
							<strong>Random draw</strong>
							<span>Anyone can meet anyone.</span>
						</span>
					</label>
				</div>

				{chosen.length >= MIN && (
					<p className="modal-text">
						Knockout: {shape.rounds} rounds
						{shape.byes > 0
							? `, with ${shape.byes} ${shape.byes === 1 ? "bye" : "byes"} in the first round`
							: ""}
						. Every game counts towards Elo and shows in the match
						history.
					</p>
				)}

				<PasswordField value={password} onChange={setPassword} />
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className="modal-submit"
				onClick={create}
				disabled={saving}
			>
				{saving ? "Creating…" : "Create Tournament"}
			</button>
		</Modal>
	);
};

export default CreateTournamentModal;
