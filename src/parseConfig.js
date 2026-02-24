/**
 * Parses a simplified, non-strict object string into a JavaScript object.
 * Allows unquoted keys.
 * Allows single-quoted strings.
 * Assumes the root is an object.
 * @param {string} str The configuration string.
 * @returns {object} The parsed JavaScript object.
 */
export default function parseConfig(str) {
	if (typeof str !== "string") return {};
	let jsonString = str.trim();
	// Empty returns an empty object
	if (jsonString === "") return {};
	// 1. ([a-zA-Z_$][\w$-]+)\s: matches an unquoted key followed by a colon.
	// 2. '((?:\'|[^']))' matches a single-quoted string and its content.
	jsonString = jsonString.replace(
		/([a-zA-Z_$][\w$-]*)\s*:|'((?:\\'|[^'])*)'/g,
		(_match, key, stringContent) => {
			// Case 1: An unquoted key was matched (e.g., "key:").
			if (key) {
				// Return the key, now double-quoted, with the colon.
				return `"${key}":`;
			}
			// Case 2: A single-quoted string was matched (e.g., "'value'").
			// Note: The 'else' is implicit. `key` will be undefined if the second part of the regex matched.

			// Un-escape any escaped single quotes within the content.
			const unescaped = stringContent.replace(/\\'/g, "'");
			// Escape any double quotes to create a valid JSON string.
			const escaped = unescaped.replace(/"/g, '\\"');
			// Return the content, now wrapped in double quotes.
			return `"${escaped}"`;
		},
	);
	// Ensure the string is wrapped in braces to be a valid JSON object.
	if (!jsonString.startsWith("{")) {
		jsonString = `{${jsonString}}`;
	}
	// Use the built-in JSON.parse.
	try {
		return JSON.parse(jsonString);
	} catch (_e) {
		console.error(`Failed to parse: ${str}`);
		return {}; // Return an empty object on failure.
	}
}