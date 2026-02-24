import { expect, test, describe, beforeEach } from "bun:test";
import parseConfig from "../src/parseConfig.js";

let totalErrors = 0;
globalThis.console = {
	error: (_msg) => {
		totalErrors++;
	},
};

describe("parseConfig.js Config Parser", () => {
	beforeEach(() => {
		totalErrors = 0;
	});

	const testCases = [
		// --- Basic Cases ---
		{
			description: "Simple key-value with single quotes",
			input: `key: 'value'`,
			expected: { key: "value" },
		},
		{
			description: "Multiple key-value pairs",
			input: `name: 'parseConfig', version: 1.0, enabled: true`,
			expected: { name: "parseConfig", version: 1.0, enabled: true },
		},
		{
			description: "Keys with underscores and dollar signs",
			input: `_private_key: 'secret', $id: 'user-123'`,
			expected: { _private_key: "secret", $id: "user-123" },
		},
		{
			description: "Various data types (number, boolean, null)",
			input: `port: 8080, active: true, backup: false, secondary: null`,
			expected: { port: 8080, active: true, backup: false, secondary: null },
		},

		// --- Input Variations ---
		{
			description: "Empty string input",
			input: "",
			expected: {},
		},
		{
			description: "Whitespace-only string input",
			input: " \t\n ",
			expected: {},
		},
		{
			description: "Input is an empty object literal",
			input: "{}",
			expected: {},
		},

		// --- String Content Edge Cases ---
		{
			description: "String value with spaces",
			input: `message:'Hello world!'`,
			expected: { message: "Hello world!" },
		},
		{
			description: "String with an escaped single quote",
			input: `title: 'It\\'s a test'`,
			expected: { title: "It's a test" },
		},
		{
			description: "String containing a double quote",
			input: `quote: 'He said "Hi!"'`,
			expected: { quote: 'He said "Hi!"' },
		},
		{
			description: "String containing a colon",
			input: `url: 'http://example.com'`,
			expected: { url: "http://example.com" },
		},
		{
			description: "String containing a comma",
			input: `list: 'one, two, three'`,
			expected: { list: "one, two, three" },
		},
		{
			description: "Empty string as a value",
			input: `name: ''`,
			expected: { name: "" },
		},

		// --- Data Structures ---
		{
			description: "Array of numbers",
			input: `values: [1, 2, 3, 4]`,
			expected: { values: [1, 2, 3, 4] },
		},
		{
			description: "Array of mixed-quoted strings",
			input: `items: ['item1', "item2"]`,
			expected: { items: ["item1", "item2"] },
		},
		{
			description: "Simple nested object",
			input: `user: { name: 'test', id: 42 }`,
			expected: { user: { name: "test", id: 42 } },
		},
		{
			description: "Complex nesting with arrays and objects",
			input: `data: { users: [{name: 'A', active: true}, {name: 'B', active: false}], count: 2 }`,
			expected: {
				data: {
					users: [
						{ name: "A", active: true },
						{ name: "B", active: false },
					],
					count: 2,
				},
			},
		},

		// --- Formatting and Whitespace ---
		{
			description: "Lots of extra whitespace",
			input: ` key \n : \t 'value' ,  anotherKey: [ 1 , 2 ] `,
			expected: { key: "value", anotherKey: [1, 2] },
		},
		{
			description: "String that is already valid JSON",
			input: `{ "key": "value", "number": 123 }`,
			expected: { key: "value", number: 123 },
		},
		{
			description: "Mix of quoted and unquoted keys",
			input: ` "quotedKey": 'is ok', unquotedKey: 'is also ok'`,
			expected: { quotedKey: "is ok", unquotedKey: "is also ok" },
		},

		// --- Expected Failures (should return empty object) ---
		{
			description: "Trailing comma in object (invalid JSON)",
			input: `key: 'value',`,
			expected: {},
			error: true,
		},
		{
			description: "Trailing comma in array (invalid JSON)",
			input: `items: [1, 2, ]`,
			expected: {},
			error: true,
		},
		{
			description: "Malformed structure (missing colon)",
			input: `key 'value'`,
			expected: {},
			error: true,
		},
		{
			description: "Invalid key starting with a number",
			input: `1key: 'value'`,
			expected: {}, // Our key regex `[a-zA-Z_$][\w$]*` correctly rejects this.
			error: true,
		},

		// --- Missing Edge Cases ---
		{
			description: "Non-string input: null",
			input: null,
			expected: {},
		},
		{
			description: "Non-string input: undefined",
			input: undefined,
			expected: {},
		},
		{
			description: "Non-string input: number",
			input: 123,
			expected: {},
		},
		{
			description: "Non-string input: array",
			input: [],
			expected: {},
		},
		{
			description: "Non-string input: object",
			input: {},
			expected: {},
		},
		{
			description: "Hyphenated keys are handled",
			input: "data-id: 123",
			expected: { "data-id": 123 },
		},
		{
			description: "Single quoted keys are handled properly",
			input: "'my-key': 'value'",
			expected: { "my-key": "value" },
		},
		{
			description: "JSON-escaped newline in single-quote string",
			input: `message: 'Hello\\nWorld'`,
			expected: { message: "Hello\nWorld" },
		},
		{
			description: "JSON-escaped tab in single-quote string",
			input: `message: 'Hello\\tWorld'`,
			expected: { message: "Hello\tWorld" },
		},
	];

	testCases.forEach((currentTest) => {
		test(currentTest.description, () => {
			const parsed = parseConfig(currentTest.input);
			expect(parsed).toEqual(currentTest.expected);
			if (currentTest.error) {
				// One error should be logged for failure cases
				expect(totalErrors).toEqual(1);
			} else {
				expect(totalErrors).toEqual(0);
			}
		});
	});
});
