import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const boards = [{ name: "Office Pool" }, { name: "Friday Darts" }];

beforeEach(() => {
	global.fetch = jest.fn(() =>
		Promise.resolve({
			ok: true,
			status: 200,
			json: () => Promise.resolve(boards),
		}),
	);
});

afterEach(() => {
	delete global.fetch;
});

test("home page lists the leaderboards from the API", async () => {
	render(
		<MemoryRouter initialEntries={["/"]}>
			<App />
		</MemoryRouter>,
	);

	expect(screen.getByText("Leaderboards")).toBeInTheDocument();
	expect(await screen.findByText("Office Pool")).toBeInTheDocument();
	expect(screen.getByText("Friday Darts")).toBeInTheDocument();
	expect(global.fetch).toHaveBeenCalledWith(
		expect.stringContaining("/api/leaderboards"),
	);
});
