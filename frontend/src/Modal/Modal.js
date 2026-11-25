import React, { useEffect } from "react";
import "./Modal.css";

// Shared dialog: a bottom sheet on phones, centred on larger screens.
// Closes on Escape, the ✕ button, or a click on the backdrop.
const Modal = ({ title, onClose, className = "", children }) => {
	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div
				className={`modal ${className}`}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-header">
					<h2 className="modal-title">{title}</h2>
					<button
						type="button"
						className="modal-close"
						onClick={onClose}
						aria-label="Close"
					>
						✕
					</button>
				</div>
				{children}
			</div>
		</div>
	);
};

// Password input used by every action that changes a board.
export const PasswordField = ({
	value,
	onChange,
	label = "Leaderboard Password",
}) => (
	<div className="form-field">
		<label>{label}</label>
		<input
			type="password"
			placeholder="Enter the leaderboard password"
			autoComplete="current-password"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	</div>
);

export default Modal;
