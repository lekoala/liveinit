import { expect, test, describe, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import observeOpenShadowRoots from "../src/observeOpenShadowRoots.js";
import observer from "../src/observer.js";

if (!globalThis.window) {
	GlobalRegistrator.register();
}

describe("observeOpenShadowRoots.js", () => {
	const cleanups = [];
	const engines = [];

	afterEach(() => {
		while (engines.length) {
			const engine = engines.pop();
			engine.disconnect();
		}
		while (cleanups.length) {
			const cleanup = cleanups.pop();
			cleanup();
		}
		document.body.innerHTML = "";
	});

	test("open shadow roots are observed", () => {
		const observed = [];
		const cleanup = observeOpenShadowRoots((shadowRoot) => {
			observed.push(shadowRoot);
		});
		cleanups.push(cleanup);

		const host = document.createElement("div");
		document.body.appendChild(host);
		const shadowRoot = host.attachShadow({ mode: "open" });

		expect(observed.length).toBe(1);
		expect(observed[0]).toBe(shadowRoot);
	});

	test("closed shadow roots are ignored", () => {
		const observed = [];
		const cleanup = observeOpenShadowRoots((shadowRoot) => {
			observed.push(shadowRoot);
		});
		cleanups.push(cleanup);

		const host = document.createElement("div");
		document.body.appendChild(host);
		host.attachShadow({ mode: "closed" });

		expect(observed.length).toBe(0);
	});

	test("restores attachShadow when last subscriber disconnects", () => {
		const originalAttachShadow = Element.prototype.attachShadow;
		const cleanupA = observeOpenShadowRoots(() => {});
		const patchedAttachShadow = Element.prototype.attachShadow;
		const cleanupB = observeOpenShadowRoots(() => {});
		cleanups.push(cleanupA, cleanupB);

		expect(patchedAttachShadow).not.toBe(originalAttachShadow);

		cleanupA();
		expect(Element.prototype.attachShadow).toBe(patchedAttachShadow);

		cleanupB();
		expect(Element.prototype.attachShadow).toBe(originalAttachShadow);
	});

	test("integration: can bridge open shadow roots into observer()", async () => {
		const observed = [];
		const cleanup = observeOpenShadowRoots((shadowRoot) => {
			const shadowEngine = observer(
				[".inside"],
				(element, isConnected) => {
					observed.push({ id: element.id, isConnected });
				},
				shadowRoot,
			);
			engines.push(shadowEngine);
		});
		cleanups.push(cleanup);

		const host = document.createElement("div");
		document.body.appendChild(host);
		const shadowRoot = host.attachShadow({ mode: "open" });

		const el = document.createElement("div");
		el.className = "inside";
		el.id = "shadow-child";
		shadowRoot.appendChild(el);

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(observed).toContainEqual({ id: "shadow-child", isConnected: true });
	});
});
