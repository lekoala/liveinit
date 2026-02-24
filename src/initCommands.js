import parseConfig from "./parseConfig.js";

/**
 * Initializes the global command event delegator.
 * @param {Object} [options={}]
 * @param {string} [options.attribute="data-command"] - The HTML attribute used for the command action.
 * @param {string[]} [options.events=["click", "change", "input", "submit", "focusin", "focusout"]] - The array of bubbling events to listen for.
 * @returns {{ disconnect: () => void }} Disconnects all event listeners registered by this init call.
 */
export default function initCommands(options = {}) {
	const attribute = options.attribute || "data-command";
	const eventPrefix = attribute.replace(/^data-/, "");
	const commandOnAttr = `${attribute}-on`;
	const commandForAttr = `${attribute}-for`;
	const commandConfigAttr = `${attribute}-config`;

	const events = options.events || [
		"click",
		"change",
		"input",
		"submit",
		"focusin",
		"focusout",
	];

	const listener = {
		// One stable listener object for all events:
		// `handleEvent` keeps add/remove symmetric and avoids per-event bound closures.
		handleEvent(event) {
			const eventTarget = event && event.target;
			if (!eventTarget || typeof eventTarget.closest !== "function") return;

			// Find if the event originated from inside a [data-command] element
			const trigger = eventTarget.closest(`[${attribute}]`);
			if (!trigger) return;

			// If the event type doesn't match the requested trigger, ignore it
			const expectedEvent = trigger.getAttribute(commandOnAttr) || "click";
			const type = event.type;
			if (type !== expectedEvent) return;

			if (type !== "focusin" && type !== "focusout") {
				// Prevent Default handles submit, links, and changes correctly usually
				event.preventDefault();
			}

			const action = trigger.getAttribute(attribute); // e.g., "refresh"
			const targetSelector = trigger.getAttribute(commandForAttr);
			const configString = trigger.getAttribute(commandConfigAttr);
			const config = parseConfig(configString ? configString : "{}");

			let target = trigger;
			if (targetSelector) {
				try {
					target = document.querySelector(targetSelector);
				} catch (_e) {
					return;
				}
			}

			if (target) {
				target.dispatchEvent(
					new CustomEvent(`${eventPrefix}:${action}`, {
						detail: { originalEvent: event, config, trigger },
						bubbles: true,
					}),
				);
			}
		},
	};

	for (let i = 0, len = events.length; i < len; i++) {
		document.addEventListener(events[i], listener);
	}

	let connected = true;
	return {
		disconnect() {
			if (!connected) return;
			connected = false;
			for (let i = 0, len = events.length; i < len; i++) {
				document.removeEventListener(events[i], listener);
			}
		},
	};
}
