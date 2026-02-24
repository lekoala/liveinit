import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import observer from "../src/observer.js";

if (!globalThis.window) {
	GlobalRegistrator.register();
}

describe("observer.js DOM Lifecycle Tracker", () => {
	let engine;
	let root;

	beforeEach(() => {
		// Reset the document body before each test
		document.body.innerHTML = "";
		root = document.createElement("div");
		document.body.appendChild(root);
	});

	afterEach(() => {
		if (engine) {
			engine.disconnect();
			engine = null;
		}
	});

	test("Should throw error if queries are empty", () => {
		expect(() => observer([], () => {})).toThrow();
		expect(() => observer(null, () => {})).toThrow();
	});

	test("Immediate Evaluation: Should instantly trigger callback for existing elements", () => {
		root.innerHTML = `
			<div class="target" id="t1"></div>
			<div class="target" id="t2"></div>
		`;

		let triggerCount = 0;
		const connectedIds = [];

		engine = observer(
			["\.target"],
			(element, isConnected, selector) => {
				triggerCount++;
				if (isConnected) connectedIds.push(element.id);
				expect(selector).toBe(".target");
			},
			root,
		);

		expect(triggerCount).toBe(2);
		expect(connectedIds).toContain("t1");
		expect(connectedIds).toContain("t2");
	});

	test("Dynamic Insertion: Should observe appended elements within next tick", async () => {
		root.innerHTML = `<div class="target" id="t1"></div>`; // 1 immediate

		let triggers = [];
		engine = observer(
			["\.target"],
			(element, isConnected) => {
				triggers.push({ id: element.id, isConnected });
			},
			root,
		);

		// Manually add
		const newEl = document.createElement("div");
		newEl.className = "target";
		newEl.id = "t2";
		root.appendChild(newEl);

		// Wait for MutationObserver to cycle
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Expect 1 immediate + 1 async insertion
		expect(triggers.length).toBe(2);
		expect(triggers[0]).toEqual({ id: "t1", isConnected: true });
		expect(triggers[1]).toEqual({ id: "t2", isConnected: true });
	});

	test("Dynamic Removal: Should observe detached elements", async () => {
		const child = document.createElement("div");
		child.className = "target";
		child.id = "t1";
		root.appendChild(child);

		let triggers = [];
		engine = observer(
			["\.target"],
			(element, isConnected) => {
				triggers.push({ id: element.id, isConnected });
			},
			root,
		);

		// Remove element
		root.removeChild(child);

		await new Promise((resolve) => setTimeout(resolve, 10));

		// Expect 1 immediate connection, 1 async disconnection
		expect(triggers.length).toBe(2);
		expect(triggers[0]).toEqual({ id: "t1", isConnected: true });
		expect(triggers[1]).toEqual({ id: "t1", isConnected: false });
	});

	test("Nested/Child Elements: Should detect children of mutated nodes", async () => {
		let triggers = [];
		engine = observer(
			["\.child"],
			(element, isConnected) => {
				triggers.push({ id: element.id, isConnected });
			},
			root,
		);

		// Append a wrapper that *contains* the target
		const wrapper = document.createElement("div");
		wrapper.innerHTML = `<div class="child" id="c1"></div>`;

		root.appendChild(wrapper);

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(triggers.length).toBe(1);
		expect(triggers[0]).toEqual({ id: "c1", isConnected: true });

		// Now remove the wrapper
		root.removeChild(wrapper);

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(triggers.length).toBe(2);
		expect(triggers[1]).toEqual({ id: "c1", isConnected: false });
	});

	test("Manual Evaluation: evaluate() should trigger callback natively", () => {
		let triggers = [];
		engine = observer(
			["\.target"],
			(element, isConnected) => {
				triggers.push(element.id);
			},
			root,
		);

		const loneWolf = document.createElement("div");
		loneWolf.className = "target";
		loneWolf.id = "manual";

		// This node isn't attached to root yet!
		engine.evaluate(loneWolf, true);

		expect(triggers).toContain("manual");
	});

	test("Disconnection API: disconnect() stops observing future mutations", async () => {
		let triggers = 0;
		engine = observer([".target"], () => triggers++, root);

		expect(triggers).toBe(0); // None existing initially

		engine.disconnect();

		const el = document.createElement("div");
		el.className = "target";
		root.appendChild(el);

		await new Promise((resolve) => setTimeout(resolve, 10));

		// Call count should still be 0 because we killed the listener
		expect(triggers).toBe(0);
	});

	test("Safe by default: does not patch Element.prototype.attachShadow", () => {
		const originalAttachShadow = Element.prototype.attachShadow;
		engine = observer([".target"], () => {}, root);
		expect(Element.prototype.attachShadow).toBe(originalAttachShadow);
	});

	test("Multiple Selectors: Triggers correct callback parameters for various selectors", () => {
		root.innerHTML = `
			<button data-command="save"></button>
			<form data-component="login"></form>
		`;

		let logs = [];
		engine = observer(
			["[data-command]", "[data-component]"],
			(element, isConnected, selector) => {
				logs.push(selector);
			},
			root,
		);

		expect(logs.length).toBe(2);
		expect(logs).toContain("[data-command]");
		expect(logs).toContain("[data-component]");
	});
});
