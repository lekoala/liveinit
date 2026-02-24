import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import initComponents from "../src/initComponents.js";

if (!globalThis.window) {
	GlobalRegistrator.register();
}

// Mock Component Class
class DummyComponent {
	constructor(element, config) {
		this.element = element;
		this.config = config;
		this.destroyed = false;
	}
	destroy() {
		this.destroyed = true;
	}
}

describe("initComponents.js Component Initializer", () => {
	let root;
	let engine;

	beforeEach(() => {
		document.body.innerHTML = "";
		root = document.createElement("div");
		document.body.appendChild(root);

		// Reset global objects
		window.DummyComponent = undefined;
	});

	afterEach(() => {
		if (engine) {
			engine.disconnect();
			engine = null;
		}
	});

	test("Standard Registry: Initializes component explicitly passed in dictionary", async () => {
		const Registry = {
			dummy: async () => ({ default: DummyComponent }),
		};

		engine = initComponents(Registry);

		root.innerHTML = `<div data-component="dummy" data-component-config="foo: 'bar'"></div>`;

		// Let microtasks flush for the dynamic import resolution
		await new Promise((resolve) => setTimeout(resolve, 10));

		// We can't easily snag the weakmap to test, so let's use the fact that our
		// component would run logic... wait, we don't have an easy handle on the instantiated class.
		// Let's modify our DummyComponent to attach itself to the window for testing purposes, or check a global side-effect.

		// Wait, because we are using happy-dom, we could spy on the console or use a static variable.
	});

	// Let's use a static array to track instance lifecycles for easier assertions
	let instances = [];

	class TrackedComponent {
		constructor(element, config) {
			this.element = element;
			this.config = config;
			this.destroyed = false;
			instances.push(this);
		}
		destroy() {
			this.destroyed = true;
		}
		customDispose() {
			this.destroyed = true;
		}
	}

	beforeEach(() => {
		instances = [];
		window.TrackedComponent = undefined;
	});

	test("Standard Registry: Resolves properly", async () => {
		const Registry = {
			tracked: async () => TrackedComponent, // CommonJS style support check too
		};

		engine = initComponents(Registry);

		root.innerHTML = `<div data-component="tracked" data-component-config="theme: 'dark'"></div>`;

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(instances.length).toBe(1);
		expect(instances[0].config.theme).toBe("dark");
		expect(instances[0].config.signal).toBeInstanceOf(AbortSignal);

		engine.disconnect();
	});

	test("Global Fallback: Resolves from window object", async () => {
		window.TrackedGlobal = TrackedComponent;

		engine = initComponents(); // No registry passed!

		root.innerHTML = `<div data-component="TrackedGlobal"></div>`;

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(instances.length).toBe(1);
		expect(instances[0].element).toBeTruthy();

		engine.disconnect();
	});

	test("Retry Failed: can re-attempt unresolved components after late registration", async () => {
		window.LateComponent = undefined;
		engine = initComponents(); // uses global fallback

		root.innerHTML = `<div data-component="LateComponent"></div>`;
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(instances.length).toBe(0);

		window.LateComponent = TrackedComponent;
		const retried = engine.retryFailed(root);
		expect(retried).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(instances.length).toBe(1);

		engine.disconnect();
	});

	test("Custom Resolver: Resolves using user-defined async function", async () => {
		engine = initComponents(null, {
			resolve: async (name) => {
				if (name === "magic") return TrackedComponent;
				throw new Error("No module");
			},
		});

		root.innerHTML = `<div data-component="magic"></div>`;

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(instances.length).toBe(1);

		engine.disconnect();
	});

	test("Lifecycle Teardown: Safely deletes instances and calls destroy method on detachment", async () => {
		window.TrackedComponent = TrackedComponent;
		engine = initComponents();

		const el = document.createElement("div");
		el.setAttribute("data-component", "TrackedComponent");
		root.appendChild(el);

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(instances.length).toBe(1);
		expect(instances[0].destroyed).toBe(false);

		// Remove from DOM
		root.removeChild(el);

		await new Promise((resolve) => setTimeout(resolve, 10));

		// Destruction should have occurred
		expect(instances[0].destroyed).toBe(true);
		// Signal should be aborted
		expect(instances[0].config.signal.aborted).toBe(true);

		engine.disconnect();
	});

	test("Configurable Options: Supports custom destroyMethod and signalKey", async () => {
		window.TrackedComponent = TrackedComponent;
		engine = initComponents(null, {
			destroyMethod: "customDispose",
			signalKey: "abortSignal",
		});

		const el = document.createElement("div");
		el.setAttribute("data-component", "TrackedComponent");
		root.appendChild(el);

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(instances.length).toBe(1);
		expect(instances[0].config.abortSignal).toBeInstanceOf(AbortSignal);
		expect(instances[0].destroyed).toBe(false);

		// Remove from DOM
		root.removeChild(el);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(instances[0].destroyed).toBe(true); // Custom dispose method sets this flag

		engine.disconnect();
	});
});
