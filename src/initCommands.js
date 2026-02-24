import parseConfig from "./parseConfig.js";

export const DEFAULT_ALLOWED_METHODS = new Set([
	"focus",
	"close",
	"toggle",
	"show",
	"showModal",
	"showPicker",
	"stepUp",
	"stepDown",
	"scrollIntoView",
	"showPopover",
	"hidePopover",
	"togglePopover",
]);

/**
 * Initializes the global command event delegator.
 * @param {Object} [options={}]
 * @param {string} [options.attribute="data-command"] - The HTML attribute used for the command action.
 * @param {string[]} [options.events=["click", "change", "input", "submit", "focusin", "focusout"]] - The array of bubbling events to listen for.
 * @param {string[]} [options.allowedMethods] - Optional list of allowed methods (defaults to DEFAULT_ALLOWED_METHODS).
 * Command resolution is method-first: if target[action] is a function and is allowed it is called.
 * Otherwise a namespaced CustomEvent ("{prefix}:{action}") is dispatched on target.
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

	const allowed = options.allowedMethods
		? new Set(options.allowedMethods)
		: DEFAULT_ALLOWED_METHODS;

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
			if (!action) return;
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
				const isExplicitEvent = action.includes(":");
				const maybeMethod =
					!isExplicitEvent && allowed.has(action) ? target[action] : null;

				if (typeof maybeMethod === "function") {
					const args = Array.isArray(config.args)
						? config.args
						: Object.keys(config).length > 0
							? [config]
							: [];
					maybeMethod.apply(target, args);
					return;
				}

				const eventName = action.includes(":")
					? action
					: `${eventPrefix}:${action}`;

				target.dispatchEvent(
					new CustomEvent(eventName, {
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
