import { expect, test, describe, beforeEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import lazy from "../src/lazy.js";

// Ensure a standard DOM environment is available for the module payload
if (!globalThis.window) {
	GlobalRegistrator.register();
}

describe("lazy.js Intersection Tracker", () => {
	let root;

	beforeEach(() => {
		document.body.innerHTML = "";
		root = document.createElement("div");
		document.body.appendChild(root);
	});

	test("Basic Execution Profile: Should add element to observer cleanly and return teardown", () => {
		const el = document.createElement("div");
		root.appendChild(el);

		let calls = 0;
		const cleanup = lazy(el, () => {
			calls += 1;
		});

		expect(typeof cleanup).toBe("function");
		expect(calls).toBeLessThanOrEqual(1);

		// Teardown should be safe
		expect(() => cleanup()).not.toThrow();
	});

	test("Detached/Orphan Elements: Cleaning up an element natively works safely", () => {
		const el = document.createElement("div");

		let calls = 0;
		const cleanup = lazy(el, () => {
			calls += 1;
		});

		expect(typeof cleanup).toBe("function");
		expect(calls).toBeLessThanOrEqual(1);

		expect(() => cleanup()).not.toThrow();
	});
});
