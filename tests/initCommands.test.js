import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import initCommands from "../src/initCommands.js";

if (!globalThis.window) {
	GlobalRegistrator.register();
}

describe("initCommands.js Global Delegator", () => {
	let root;
	let commandEngine;

	beforeEach(() => {
		document.body.innerHTML = "";
		root = document.createElement("div");
		document.body.appendChild(root);

		// Reset event listeners for a pristine environment by replacing the body
		const newBody = document.createElement("body");
		newBody.appendChild(root);
		document.documentElement.replaceChild(newBody, document.body);
	});

	afterEach(() => {
		if (commandEngine) {
			commandEngine.disconnect();
			commandEngine = null;
		}
	});

	test("Basic Click Command: Dispatches custom event with correct payload", () => {
		commandEngine = initCommands();

		root.innerHTML = `<button data-command="save" data-command-config="id: 5">Save</button>`;
		const button = root.querySelector("button");

		let eventData = null;
		button.addEventListener("command:save", (e) => {
			eventData = e.detail;
		});

		button.click();

		expect(eventData).toBeTruthy();
		expect(eventData.trigger).toBe(button);
		expect(eventData.config).toEqual({ id: 5 });
	});

	test("Targeted Command: Dispatches to data-command-for selector", () => {
		commandEngine = initCommands();

		root.innerHTML = `
			<button data-command="refresh" data-command-for="#table1">Refresh</button>
			<table id="table1"></table>
		`;

		const button = root.querySelector("button");
		const table = root.querySelector("table");

		let eventFired = false;
		table.addEventListener("command:refresh", () => {
			eventFired = true;
		});

		button.click();

		expect(eventFired).toBe(true);
	});

	test("Custom Trigger Event: Listens to data-command-on", () => {
		commandEngine = initCommands();

		// A click shouldn't trigger this, only a 'change' event
		root.innerHTML = `<div data-command="toggle" data-command-on="change"></div>`;
		const div = root.querySelector("div");

		let eventFired = false;
		div.addEventListener("command:toggle", () => {
			eventFired = true;
		});

		// Clicking shouldn't dispatch the custom event because event !== expectedEvent
		div.click();
		expect(eventFired).toBe(false);

		// Dispatching change should work
		div.dispatchEvent(new Event("change", { bubbles: true }));
		expect(eventFired).toBe(true);
	});

	test("Configurable Options: Custom attribute and prefix", () => {
		commandEngine = initCommands({
			attribute: "data-action",
		});

		root.innerHTML = `<button data-action="submit">Go</button>`;
		const button = root.querySelector("button");

		let eventFired = false;
		button.addEventListener("action:submit", () => {
			eventFired = true;
		});

		button.click();

		expect(eventFired).toBe(true);
	});

	test("Configurable Events: Only limits to specified events", () => {
		commandEngine = initCommands({ events: ["mouseleave"] });

		root.innerHTML = `<div data-command="hover" data-command-on="mouseleave"></div>`;
		const div = root.querySelector("div");

		let fired = false;
		div.addEventListener("command:hover", () => (fired = true));

		// A click won't work even if command-on was set to click, because the listener isn't global
		div.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

		expect(fired).toBe(true);
	});

	test("Nested Elements: Clicks inside the command bubble up perfectly", () => {
		commandEngine = initCommands();

		root.innerHTML = `
			<button data-command="save">
				<span><i class="icon"></i> Click Me</span>
			</button>
		`;
		const button = root.querySelector("button");
		const icon = root.querySelector(".icon");

		let fired = false;
		button.addEventListener("command:save", () => (fired = true));

		// Click the deepest nested element
		icon.click();

		expect(fired).toBe(true);
	});

	test("Disconnect API: stops dispatching after disconnect()", () => {
		commandEngine = initCommands();

		root.innerHTML = `<button data-command="save">Save</button>`;
		const button = root.querySelector("button");

		let fired = 0;
		button.addEventListener("command:save", () => (fired += 1));

		button.click();
		expect(fired).toBe(1);

		commandEngine.disconnect();
		button.click();
		expect(fired).toBe(1);
	});

	test("Disconnect API: can be called multiple times safely", () => {
		commandEngine = initCommands();
		expect(() => {
			commandEngine.disconnect();
			commandEngine.disconnect();
		}).not.toThrow();
	});

	test("Edge Case: invalid data-command-for selector does not throw", () => {
		commandEngine = initCommands();
		root.innerHTML = `<button data-command="save" data-command-for="???">Save</button>`;
		const button = root.querySelector("button");
		expect(() => button.click()).not.toThrow();
	});

	test("Edge Case: non-Element event target is ignored safely", () => {
		commandEngine = initCommands();

		expect(() => {
			document.dispatchEvent(new Event("click", { bubbles: true }));
		}).not.toThrow();
	});

	test("Repeated init: each init registers its own listener set", () => {
		const first = initCommands();
		commandEngine = initCommands();

		root.innerHTML = `<button data-command="save">Save</button>`;
		const button = root.querySelector("button");

		let fired = 0;
		button.addEventListener("command:save", () => (fired += 1));

		button.click();
		expect(fired).toBe(2);

		first.disconnect();
		button.click();
		expect(fired).toBe(3);
	});
});
