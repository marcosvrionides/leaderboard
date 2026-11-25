// Small wrapper around fetch for the backend API. Throws an Error with a
// message that's safe to show to users.
const API_URL = process.env.REACT_APP_API_URL;

export const apiUrl = (path) => `${API_URL}${path}`;

export const apiFetch = async (
	path,
	{ method = "GET", body, password } = {},
) => {
	const headers = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	if (password !== undefined) headers["X-Leaderboard-Password"] = password;

	let res;
	try {
		res = await fetch(apiUrl(path), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch (e) {
		throw new Error(
			"Couldn't reach the server. Check your connection and try again.",
		);
	}

	if (res.status === 204) return null;

	let data = null;
	try {
		data = await res.json();
	} catch (e) {
		// Empty or non-JSON body.
	}

	if (!res.ok) {
		const error = new Error(
			res.status === 403
				? "Incorrect leaderboard password."
				: (data && (data.error || data.message)) ||
						"Something went wrong. Please try again.",
		);
		error.status = res.status;
		throw error;
	}
	return data;
};

// Encodes a value for use as a single path segment (names can contain
// spaces, slashes, question marks…).
export const seg = (value) => encodeURIComponent(value);
