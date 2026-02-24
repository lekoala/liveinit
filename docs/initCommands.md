# Init Commands (`initCommands.js`)

A global event delegation engine designed to handle stateless actions declaratively from HTML variables without writing repetitive event listeners.

## Overview

Instead of tracking every button's insertion and removal to attach/detach event listeners, the command engine uses a single, global event listener on the `document` that catches bubbling events and parses their custom target and actions. It then emits a standardized `CustomEvent` that your Javascript modules can listen for.

### Relation to the Open UI Invokers API

This engine takes heavy inspiration from the [Open UI Invokers API Explainer](https://open-ui.org/components/invokers.explainer/) (the native `command` and `commandfor` HTML attributes), but diverges to provide a generic, framework-like event bus.

**How it's similar:**

- It allows declarative, HTML-only event delegation without manual `addEventListener` scripts.
- It relies on a source `trigger` pointing to a destination `target` using an ID or CSS selector.

**How it's different & better for our needs:**

1. **No Polyfill Overhead:** Native `command/commandfor` requires heavy polyfilling for general-purpose use, interfering with shadow DOMs and native prototypes. This engine is pure and lightweight.
2. **Beyond Clicks:** The native spec is strictly tied to buttons and clicks. Our engine scales to `input`, `change`, `submit`, `focusin`, and `focusout` via the `data-command-on` attribute.
3. **No `--custom` Syntax:** The native spec forces custom actions to use a CSS-variable-like syntax (e.g., `command="--my-action"`). We just use standard strings (`data-command="refresh"`).
4. **Rich Configuration:** We built in native JSON configuration strings (`data-command-config`) via `parseConfig.js` to easily pass complex arguments to your controllers.

## Usage

Just import the initialization function into your main entry file to start tracking events:

```javascript
import { initCommands } from 'liveinit';

// The engine binds to the document. Custom data attributes and events can be passed here.
const commandEngine = initCommands({
  attribute: "data-command", // Default
  events: ["click", "change", "input", "submit", "focusin", "focusout"], // Default
  allowedMethods: null // Optional: array of strings to extend/replace default allowlist
});

// Later, cleanup listeners if needed (HMR, teardown, tests, microfrontends)
commandEngine.disconnect();
```

`initCommands()` creates a new listener set on each call. In environments like HMR or microfrontends, keep the returned handle and call `disconnect()` before re-initializing to avoid duplicate command dispatches.

### HTML Setup

The engine relies on `[data-command]` (configurable) attributes to dispatch standard events.

**Basic Click Example:**

```html
<!-- Clicking this dispatches a `command:refresh` event targeting the `#table` -->
<button data-command="refresh" data-command-for="#table">Refresh</button>
```

**Per-command event naming:**
You can override event naming directly in markup.

```html
<!-- Explicit full event name (namespaced) -->
<button data-command="mediaplayer:play">Play</button>

<!-- Default namespacing (becomes command:save) -->
<button data-command="save">Save</button>
```

**Custom Events:**
By default, the engine listens for `click` events. To listen for other bubbling actions (`change`, `input`, `submit`, `focusin`, `focusout`), use the `data-command-on` attribute.

```html
<!-- Fires whenever the user types -->
<input type="search" data-command="search" data-command-on="input" data-command-for="#table">

<!-- Intercepts form submissions -->
<form data-command="save" data-command-on="submit" data-command-for="#table">
  ...
</form>
```

**Custom Configurations:**
To pass extra parameters to the command, use `data-command-config`.

```html
<button data-command="refresh" data-command-for="#table" data-command-config="silent: true">
  Silent Refresh
</button>
```

### Method-first Resolution (Safe Allowlist)

When a command is triggered, the engine resolves behavior in this order:

1. If `data-command` does not contain `:` and `target[data-command]` exists, is a function, and **is present in the allowlist**, it is called.
2. Otherwise, a namespaced `CustomEvent` is dispatched:
   - If `data-command` contains `:`, it is used as-is (e.g., `mediaplayer:play`).
   - Otherwise, it is prefixed with the default prefix (e.g., `command:save`).

#### Default Allowed Methods

For security, only a subset of common, safe native methods can be invoked by default:

`focus`, `close`, `toggle`, `show`, `showModal`, `showPicker`, `stepUp`, `stepDown`, `scrollIntoView`, `showPopover`, `hidePopover`, `togglePopover`.

This means native elements can be controlled directly without extra JS:

```html
<button data-command="showModal" data-command-for="#dlg">Open Modal</button>
<button data-command="showPopover" data-command-for="#pop">Open Popover</button>
<button data-command="scrollIntoView" data-command-for="#section-2">Go to Section 2</button>

<dialog id="dlg">...</dialog>
<div id="pop" popover>...</div>
```

```html
<button
  data-command="setValue"
  data-command-config="args: [1, 'ok']">
  Set
</button>
```

> [!IMPORTANT]
> Since `setValue` is not in the default allowlist, you must explicitly enable it during initialization:
> `initCommands({ allowedMethods: [...DEFAULT_ALLOWED_METHODS, "setValue"] })`

#### Customizing the Allowlist

You can extend or replace the allowlist during initialization:

```javascript
// Extend the default list
import { DEFAULT_ALLOWED_METHODS } from 'liveinit';
initCommands({ 
  allowedMethods: [...DEFAULT_ALLOWED_METHODS, "next", "prev"] 
});

// Replace entirely (stricter control)
initCommands({ 
  allowedMethods: ["play", "pause"] 
});
```

### Listening for Commands

Inside your components or Javascript, you listen to the emitted `{prefix}:{action}` event on the target element.
If your configured attribute is `data-command`, the prefix is `command`. If you configure it to `data-action`, the prefix becomes `action`.

```javascript
const table = document.querySelector("#table");

// Assuming the default `data-command` attribute:
table.addEventListener("command:refresh", (event) => {
  // Extract custom configuration
  const isSilent = event.detail.config.silent;
  
  // See which element actually triggered the command
  const buttonEl = event.detail.trigger;
  
  // Access the original bubbling event (e.g. MouseEvent or SubmitEvent)
  const originalEvent = event.detail.originalEvent;
  
  console.log("Refreshing table...", isSilent);
});
```

The listener above runs only when `table.refresh` is not a function.

## Supported Events

The global delegator currently listens for and supports intercepting:

- `click` (default)
- `change`
- `input`
- `submit`
- `focusin`
- `focusout`

*(Note: The engine natively suppresses default browser behaviors like form submissions or hash link jumping automatically when catching these commands, except for focus events).*
