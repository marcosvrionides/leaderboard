import React, { useState } from "react";
import Modal, { PasswordField } from "../Modal/Modal";
import { apiFetch, seg } from "../api";
import useBoardPassword from "../useBoardPassword";

const OPTIONS = [
	{
		unlisted: false,
		title: "Listed",
		description: "Shown on the home page and in search.",
	},
	{
		unlisted: true,
		title: "Unlisted",
		description:
			"Hidden from the home page and search. Anyone with the link can still view it, so share it with your group.",
	},
];

const VisibilityModal = ({ board, unlisted, onClose, onSaved }) => {
	const { savedPassword, remember, forget } = useBoardPassword(board);
	const [choice, setChoice] = useState(unlisted);
	const [password, setPassword] = useState(savedPassword);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const save = async () => {
		if (choice === unlisted) {
			onClose();
			return;
		}
		if (!password) {
			setError("Enter the leaderboard password.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await apiFetch(`/api/leaderboards/${seg(board)}/visibility`, {
				method: "PUT",
				password,
				body: { unlisted: choice },
			});
			remember(password);
			onSaved(choice);
		} catch (e) {
			if (e.status === 403) forget();
			setError(e.message);
			setSaving(false);
		}
	};

	return (
		<Modal title="Visibility" onClose={onClose}>
			<div className="modal-body">
				<div
					className="choice-list"
					role="radiogroup"
					aria-label="Visibility"
				>
					{OPTIONS.map((o) => (
						<label
							key={o.title}
							className={`choice${choice === o.unlisted ? " selected" : ""}`}
						>
							<input
								type="radio"
								name="visibility"
								checked={choice === o.unlisted}
								onChange={() => setChoice(o.unlisted)}
							/>
							<span>
								<strong>{o.title}</strong>
								<span>{o.description}</span>
							</span>
						</label>
					))}
				</div>
				{choice !== unlisted && (
					<PasswordField value={password} onChange={setPassword} />
				)}
				{error && <div className="modal-error">{error}</div>}
			</div>
			<button
				type="button"
				className="modal-submit"
				onClick={save}
				disabled={saving}
			>
				{saving ? "Saving…" : choice === unlisted ? "Done" : "Save"}
			</button>
		</Modal>
	);
};

export default VisibilityModal;
