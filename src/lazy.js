/**
 * @type {WeakMap<Element,Function>}
 */
const map = new WeakMap();
let observer;

// Initialize IntersectionObserver for browsers that support it
if (typeof window !== "undefined" && "IntersectionObserver" in window) {
	observer = new IntersectionObserver((entries, obs) => {
		const activeEntries = entries.filter((entry) => entry.isIntersecting);
		for (let i = 0, len = activeEntries.length; i < len; i++) {
			const t = activeEntries[i].target;
			obs.unobserve(t);

			// Run
			const fn = map.get(t);
			map.delete(t);
			if (fn) {
				fn(t);
			}
		}
	});
}

/**
 * Element will trigger callback when visible in intersection observer
 * @param {Element} el
 * @param {Function} cb An init callback that gets the element as the first argument
 * @returns {Function} a callback to remove the observer
 */
export default function lazy(el, cb) {
	// If IntersectionObserver is not supported, initialize immediately
	if (!observer) {
		cb(el);
		// Dummy cleanup
		return () => {};
	}
	map.set(el, cb);
	observer.observe(el);
	return () => {
		map.delete(el);
		return observer.unobserve(el);
	};
}
