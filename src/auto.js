import * as liveinit from "./index.js";

// Auto-initialize with default settings for immediate use via CDN script tag
liveinit.initCommands();
const componentEngine = liveinit.initComponents();

// Convenience hook for AJAX/fragment flows in CDN mode.
// Dispatch `liveinit:refresh` with an optional `detail.root` Element/Document.
if (typeof document !== "undefined") {
	document.addEventListener("liveinit:refresh", (event) => {
		const detail = event && event.detail ? event.detail : null;
		const root = detail && detail.root ? detail.root : document;
		if (!root || typeof root.querySelectorAll !== "function") return;
		
		// Evaluate children
		componentEngine.evaluate(root.querySelectorAll("[data-component]"), true);
		
		// Evaluate root itself if it is a component
		if (root.matches && root.matches("[data-component]")) {
			componentEngine.evaluate(root, true);
		}

		// Retry components that previously failed to resolve.
		componentEngine.retryFailed(root);
	});
}

// Expose the library to the global window object for programmatic access
if (typeof window !== "undefined") {
	window.liveinit = liveinit;
}

export default liveinit;
