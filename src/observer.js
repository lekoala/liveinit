/**
 * Ultra-fast DOM lifecycle tracker for known, fixed CSS selectors.
 *
 * @param {string[]} queries Array of CSS selectors to observe
 * @param {Function} callback Callback for matches: (element, connected, selector)
 * @param {Document|Element} [root=document] The root element to observe
 * @returns {object} The observer instance { evaluate, forget, disconnect }
 */
export default function observer(queries, callback, root = document) {
	const liveElements = new WeakMap();

	if (!queries || !queries.length) {
		throw new Error("observer requires an array of CSS selector queries.");
	}

	// Compute the master selector string exactly once.
	const selectorString = queries.join(",");

	const notifyNode = (element, isConnected) => {
		if (!element.matches) return;

		let activeSelectors = liveElements.get(element);

		if (isConnected) {
			// Classic, blazing-fast 'for' loop instead of Set iteration
			for (let i = 0, len = queries.length; i < len; i++) {
				const selector = queries[i];
				if (element.matches(selector)) {
					if (!activeSelectors) {
						activeSelectors = new Set();
						liveElements.set(element, activeSelectors);
					}
					if (!activeSelectors.has(selector)) {
						activeSelectors.add(selector);
						callback(element, true, selector);
					}
				}
			}
		} else if (activeSelectors) {
			liveElements.delete(element);
			activeSelectors.forEach((selector) => {
				callback(element, false, selector);
			});
		}
	};

	const processNode = (node, isConnected, added, removed) => {
		if (isConnected) {
			if (!added.has(node)) {
				added.add(node);
				removed.delete(node);
				notifyNode(node, true);
			}
		} else {
			if (!removed.has(node)) {
				removed.add(node);
				added.delete(node);
				notifyNode(node, false);
			}
		}

		// Uses the pre-computed string for immediate native C++ evaluation
		const descendants = node.querySelectorAll(selectorString);
		for (let i = 0, len = descendants.length; i < len; i++) {
			const desc = descendants[i];
			if (isConnected) {
				if (!added.has(desc)) {
					added.add(desc);
					removed.delete(desc);
					notifyNode(desc, true);
				}
			} else {
				if (!removed.has(desc)) {
					removed.add(desc);
					added.delete(desc);
					notifyNode(desc, false);
				}
			}
		}
	};

	const observer = new MutationObserver((records) => {
		const added = new Set();
		const removed = new Set();

		for (let i = 0, len = records.length; i < len; i++) {
			const { addedNodes, removedNodes } = records[i];

			for (let j = 0, rLen = removedNodes.length; j < rLen; j++) {
				const node = removedNodes[j];
				if (node.nodeType === 1) processNode(node, false, added, removed);
			}
			for (let j = 0, aLen = addedNodes.length; j < aLen; j++) {
				const node = addedNodes[j];
				if (node.nodeType === 1) processNode(node, true, added, removed);
			}
		}
	});

	observer.observe(root, { childList: true, subtree: true });

	const evaluate = (elements, isConnected = true) => {
		const nodes =
			elements instanceof NodeList || Array.isArray(elements)
				? elements
				: [elements];
		for (let i = 0, len = nodes.length; i < len; i++) {
			if (nodes[i].nodeType === 1) notifyNode(nodes[i], isConnected);
		}
	};

	// Automatically initialize everything currently in the DOM
	evaluate(root.querySelectorAll(selectorString), true);

	// Return the stripped-down public API
	return {
		evaluate,
		forget: (el) => liveElements.delete(el),
		disconnect: () => observer.disconnect(),
	};
}
