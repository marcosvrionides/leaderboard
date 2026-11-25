import React from "react";
import Modal from "../Modal/Modal";

// Menu of owner actions for a board. Each action opens its own dialog.
// actions: [{ id, title, description, disabled?, onSelect }]
const ManageBoardModal = ({ actions, onClose }) => (
	<Modal title="Manage Board" onClose={onClose}>
		<div className="manage-actions">
			{actions.map((a) => (
				<button
					key={a.id}
					type="button"
					className="manage-action"
					onClick={a.onSelect}
					disabled={a.disabled}
				>
					<span className="manage-action-text">
						<span className="manage-action-title">{a.title}</span>
						<span className="manage-action-description">
							{a.description}
						</span>
					</span>
					<span className="manage-action-chevron" aria-hidden="true">
						›
					</span>
				</button>
			))}
		</div>
	</Modal>
);

export default ManageBoardModal;
