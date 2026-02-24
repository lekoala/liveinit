import lazy from "./lazy.js";
import observer from "./observer.js";
import parseConfig from "./parseConfig.js";

const isNative = (fn) =>
	typeof fn === "function" &&
	/\{\s*\[native code\]\s*\}/.test(Function.prototype.toString.call(fn));

/**
 * Initializes components dynamically based on HTML attributes.
 *
 * @param {Record<string, () => Promise<{ default: any }>>} [Registry] - Optional dictionary mapping module names to dynamic import functions.
 * @param {Object} [options={}]
 * @param {string} [options.attribute="data-component"] - The HTML attribute used for binding components.
 * @param {string} [options.lazyAttribute="data-lazy"] - The HTML attribute indicating deferred loading.
 * @param {string} [options.signalKey="signal"] - The key used to inject the AbortSignal into the component's config.
 * @param {string} [options.destroyMethod="destroy"] - The method name called on the component instance during teardown.
 * @param {boolean} [options.strict=false] - If true, only resolve from Registry, disabling window fallback.
 * @param {Function} [options.resolve] - A custom async function `(moduleName) => ModuleClass` to override default resolution.
 * @returns {Object} The observer instance { evaluate, retryFailed, forget, disconnect }.
 */
export default function initComponents(Registry = null, options = {}) {
	const attribute = options.attribute || "data-component";
	const lazyAttribute = options.lazyAttribute || "data-lazy";
	const signalKey = options.signalKey || "signal";
	const destroyMethod = options.destroyMethod || "destroy";
	const strict = options.strict || false;
	const componentState = new WeakMap();

	// Default resolver: check explicit registry, fallback to global window object
	const defaultResolver = async (moduleName) => {
		if (Registry && Registry[moduleName]) {
			const imported = await Registry[moduleName]();
			// Handle both ES module default exports and CommonJS-style exports
			return imported.default || imported;
		}

		if (!strict && window[moduleName]) {
			const candidate = window[moduleName];
			if (!isNative(candidate)) {
				return candidate;
			}
			console.warn(
				`[liveinit] '${moduleName}' is native and cannot be used as a component.`,
			);
			return null;
		}

		// Instead of throwing strongly, warn so that async component definitions
		// (late init) do not throw unhandled runtime errors on the first pass.
		// A warning is useful enough for developers to realize a typo or missing class.
		console.warn(
			`[liveinit] Module '${moduleName}' not found in Registry or global scope.`,
		);
		return null;
	};

	const resolver = options.resolve || defaultResolver;

	const engine = observer([`[${attribute}]`], (el, isConnected) => {
		if (isConnected) {
			// 1. Parse relaxed config string
			const configString = el.getAttribute(`${attribute}-config`);
			const config = parseConfig(configString);
			const moduleName = el.getAttribute(attribute);

			const state = {
				abortController: new AbortController(),
				cancelLazy: null,
				appModule: null,
				failed: false,
			};
			componentState.set(el, state);
			config[signalKey] = state.abortController.signal;

			// 2. Define the actual initialization logic
			const initModule = async () => {
				try {
					const ModuleClass = await resolver(moduleName);
					// Ensure element wasn't disconnected while we were resolving the module
					// and ensure ModuleClass was actually resolved
					if (ModuleClass && !state.abortController.signal.aborted) {
						state.appModule = new ModuleClass(el, config);
						state.failed = false;
					} else if (!ModuleClass) {
						// Keep state and mark as failed so retries can be targeted later.
						state.failed = true;
					}
				} catch (err) {
					state.failed = true;
					console.error(err);
				}
			};

			// 3. Check for Lazy Loading
			if (el.hasAttribute(lazyAttribute)) {
				state.cancelLazy = lazy(el, initModule);
			} else {
				initModule();
			}
		} else {
			// --- TEARDOWN ---
			const state = componentState.get(el);
			if (!state) return;

			// 1. Auto-cleanup all events bound with this signal
			if (state.abortController) {
				state.abortController.abort();
			}

			// 2. If it was removed before it ever scrolled into view, cancel the observer!
			if (state.cancelLazy) {
				state.cancelLazy();
			}

			// 3. If the module was actually initialized, destroy it safely.
			if (
				state.appModule &&
				typeof state.appModule[destroyMethod] === "function"
			) {
				state.appModule[destroyMethod]();
			}

			componentState.delete(el);
		}
	});

	const collectCandidates = (root) => {
		const nodes = [];
		if (!root) return nodes;

		if (typeof root.querySelectorAll === "function") {
			const descendants = root.querySelectorAll(`[${attribute}]`);
			for (let i = 0, len = descendants.length; i < len; i++) {
				nodes.push(descendants[i]);
			}
		}

		if (typeof root.matches === "function" && root.matches(`[${attribute}]`)) {
			nodes.push(root);
		}

		return nodes;
	};

	const retryFailed = (root = document) => {
		const nodes = collectCandidates(root);
		let retried = 0;

		for (let i = 0, len = nodes.length; i < len; i++) {
			const el = nodes[i];
			const state = componentState.get(el);
			if (!state || !state.failed) continue;
			retried++;
			engine.forget(el);
			engine.evaluate(el, true);
		}

		return retried;
	};

	return {
		evaluate: engine.evaluate,
		retryFailed,
		forget: engine.forget,
		disconnect: engine.disconnect,
	};
}
