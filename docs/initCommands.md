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
  events: ["click", "change", "input", "submit", "focusin", "focusout"] // Default
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

## Supported Events

The global delegator currently listens for and supports intercepting:

- `click` (default)
- `change`
- `input`
- `submit`
- `focusin`
- `focusout`

*(Note: The engine natively suppresses default browser behaviors like form submissions or hash link jumping automatically when catching these commands, except for focus events).*
