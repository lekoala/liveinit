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

	test("Method Command: calls target method when command matches function name", () => {
		commandEngine = initCommands();

		root.innerHTML = `
			<button data-command="showModal" data-command-for="#dlg">Open</button>
			<dialog id="dlg"></dialog>
		`;

		const button = root.querySelector("button");
		const dialog = root.querySelector("dialog");

		let called = 0;
		dialog.showModal = () => {
			called += 1;
		};

		let eventFired = false;
		dialog.addEventListener("command:showModal", () => {
			eventFired = true;
		});

		button.click();

		expect(called).toBe(1);
		expect(eventFired).toBe(false);
	});

	test("Method Command: passes args from config.args when provided", () => {
		commandEngine = initCommands({ allowedMethods: ["setValue"] });

		root.innerHTML = `
			<button data-command="setValue" data-command-config="args: [1, 'ok']">Set</button>
		`;

		const button = root.querySelector("button");

		let received = null;
		button.setValue = (...args) => {
			received = args;
		};

		button.click();

		expect(received).toEqual([1, "ok"]);
	});

	test("Fallback Command: dispatches event when matching method does not exist", () => {
		commandEngine = initCommands();

		root.innerHTML = `<button data-command="refresh">Refresh</button>`;
		const button = root.querySelector("button");

		let eventFired = false;
		button.addEventListener("command:refresh", () => {
			eventFired = true;
		});

		button.click();

		expect(eventFired).toBe(true);
	});

	test("Event Name: supports explicit namespaced event via data-command value", () => {
		commandEngine = initCommands();

		root.innerHTML = `<button data-command="mediaplayer:play">Play</button>`;
		const button = root.querySelector("button");

		let explicitFired = false;
		let defaultFired = false;
		button.addEventListener("mediaplayer:play", () => {
			explicitFired = true;
		});
		button.addEventListener("command:mediaplayer:play", () => {
			defaultFired = true;
		});

		button.click();

		expect(explicitFired).toBe(true);
		expect(defaultFired).toBe(false);
	});

	test("Event Name: empty data-command-prefix is ignored and fallback prefix is used", () => {
		commandEngine = initCommands();

		root.innerHTML = `
			<button data-command="mycustomevent" data-command-prefix="">Emit</button>
		`;
		const button = root.querySelector("button");

		let namespacedFired = false;
		let rawFired = false;
		button.addEventListener("command:mycustomevent", () => {
			namespacedFired = true;
		});
		button.addEventListener("mycustomevent", () => {
			rawFired = true;
		});

		button.click();

		expect(namespacedFired).toBe(true);
		expect(rawFired).toBe(false);
	});

	test("Allowlist: default allows common methods like showModal", () => {
		commandEngine = initCommands();
		root.innerHTML = `
			<button data-command="showModal" data-command-for="#dlg">Open</button>
			<dialog id="dlg"></dialog>
		`;
		const button = root.querySelector("button");
		const dialog = root.querySelector("dialog");

		let called = false;
		dialog.showModal = () => {
			called = true;
		};

		button.click();
		expect(called).toBe(true);
	});

	test("Allowlist: restricts unknown methods", () => {
		commandEngine = initCommands();
		root.innerHTML = `<button data-command="hazardousAction">Kaboom</button>`;
		const button = root.querySelector("button");

		let called = false;
		button.hazardousAction = () => {
			called = true;
		};

		let eventFired = false;
		button.addEventListener("command:hazardousAction", () => {
			eventFired = true;
		});

		button.click();
		expect(called).toBe(false);
		expect(eventFired).toBe(true);
	});

	test("Allowlist: can be replaced entirely", () => {
		commandEngine = initCommands({ allowedMethods: ["onlyThis"] });
		root.innerHTML = `
			<button id="b1" data-command="onlyThis">Allowed</button>
			<button id="b2" data-command="play">Not Allowed Anymore</button>
		`;
		const b1 = root.querySelector("#b1");
		const b2 = root.querySelector("#b2");

		let b1Called = false;
		b1.onlyThis = () => (b1Called = true);

		let b2Called = false;
		b2.play = () => (b2Called = true);

		b1.click();
		b2.click();

		expect(b1Called).toBe(true);
	});

	test("Allowlist: restricts hazardous native methods like click and submit", () => {
		commandEngine = initCommands();
		root.innerHTML = `
			<button id="b1" data-command="click">Click</button>
			<button id="b2" data-command="submit">Submit</button>
		`;
		const b1 = root.querySelector("#b1");
		const b2 = root.querySelector("#b2");

		let b1MethodCalled = false;
		b1.click = () => (b1MethodCalled = true);

		let b2MethodCalled = false;
		b2.submit = () => (b2MethodCalled = true);

		let b1EventFired = false;
		b1.addEventListener("command:click", () => (b1EventFired = true));

		let b2EventFired = false;
		b2.addEventListener("command:submit", () => (b2EventFired = true));

		// We use dispatchEvent because element.click() in many environments
		// (like JSDOM/HappyDOM) might trigger internal logic that we can't easily intercept
		// simply by overwriting the property if the engine uses target[action].
		// However, our engine does target[action] check.

		// In fact, HAPPY DOM might have click on prototype. Overwriting on instance should work.
		b1.dispatchEvent(new Event("click", { bubbles: true }));

		// For submit, we need to trigger the engine's listener (e.g. click on a button or manual event)
		b2.dispatchEvent(new Event("click", { bubbles: true }));

		expect(b1MethodCalled).toBe(false);
		expect(b1EventFired).toBe(true);
		expect(b2MethodCalled).toBe(false);
		expect(b2EventFired).toBe(true);
	});

	test("Allowlist: supports scrollIntoView", () => {
		commandEngine = initCommands();
		root.innerHTML = `<div id="scroll-target"></div>`;
		const target = root.querySelector("#scroll-target");

		let called = false;
		target.scrollIntoView = (config) => {
			called = config;
		};

		const trigger = document.createElement("button");
		trigger.setAttribute("data-command", "scrollIntoView");
		trigger.setAttribute("data-command-for", "#scroll-target");
		trigger.setAttribute("data-command-config", "behavior: 'smooth'");
		root.appendChild(trigger);

		trigger.click();
		expect(called).toEqual({ behavior: "smooth" });
	});

	test("Allowlist: supports Popover API", () => {
		commandEngine = initCommands();
		root.innerHTML = `<div id="pop-target"></div>`;
		const target = root.querySelector("#pop-target");

		let showCalled = false;
		target.showPopover = () => (showCalled = true);

		let hideCalled = false;
		target.hidePopover = () => (hideCalled = true);

		let toggleCalled = false;
		target.togglePopover = () => (toggleCalled = true);

		const bShow = document.createElement("button");
		bShow.setAttribute("data-command", "showPopover");
		bShow.setAttribute("data-command-for", "#pop-target");
		root.appendChild(bShow);

		const bHide = document.createElement("button");
		bHide.setAttribute("data-command", "hidePopover");
		bHide.setAttribute("data-command-for", "#pop-target");
		root.appendChild(bHide);

		const bToggle = document.createElement("button");
		bToggle.setAttribute("data-command", "togglePopover");
		bToggle.setAttribute("data-command-for", "#pop-target");
		root.appendChild(bToggle);

		bShow.click();
		bHide.click();
		bToggle.click();

		expect(showCalled).toBe(true);
		expect(hideCalled).toBe(true);
		expect(toggleCalled).toBe(true);
	});
});
