const subscribers = new Set();
let originalAttachShadow = null;

/**
 * Opt-in helper to observe mutations inside future open shadow roots.
 * Returns a cleanup callback that removes the subscription and restores
 * `Element.prototype.attachShadow` when no subscribers remain.
 *
 * @param {(shadowRoot: ShadowRoot) => void} observe
 * @returns {() => void}
 */
export default function observeOpenShadowRoots(observe) {
	if (typeof observe !== "function") {
		throw new Error("observeOpenShadowRoots requires an observe callback.");
	}

	if (typeof Element === "undefined" || !Element.prototype.attachShadow) {
		return () => {};
	}

	if (!originalAttachShadow) {
		originalAttachShadow = Element.prototype.attachShadow;
		Element.prototype.attachShadow = function (init) {
			const shadowRoot = originalAttachShadow.call(this, init);
			if (init && init.mode === "open") {
				subscribers.forEach((subscriber) => {
					subscriber(shadowRoot);
				});
			}
			return shadowRoot;
		};
	}

	subscribers.add(observe);
	let active = true;

	return () => {
		if (!active) return;
		active = false;
		subscribers.delete(observe);

		if (!subscribers.size && originalAttachShadow) {
			Element.prototype.attachShadow = originalAttachShadow;
			originalAttachShadow = null;
		}
	};
}
