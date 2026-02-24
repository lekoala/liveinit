# liveinit

A radically lean, ultra-fast, HTML-first application loader and DOM lifecycle observer.

`liveinit` provides a robust architecture for initializing Javascript components and delegating stateless actions safely without memory leaks, massive framework overhead, or Virtual DOMs. It bridges the gap between server-rendered HTML and client-side interactivity by turning standard HTML data attributes into reactive lifecycle hooks and event delegations.

It is heavily inspired by Stimulus, Alpine, and GitHub Catalyst, but stripped down to the absolute bare minimum (~150 lines of dependency-free modern Javascript).

## Key Advantages

- **Zero Global Listeners Overhead:** The declarative `data-command` engine uses a single, global event listener delegator that catches bubbling actions. No tracking individual buttons, no multiple active listeners—saving memory and CPU.
- **GC & Memory Safe:** `initComponents` seamlessly constructs an `AbortController`. When DOM nodes are removed or replaced (e.g., via AJAX/HTMX), all associated event listeners are instantly aborted and garbage collected cleanly.
- **O(1) Evaluation Pattern:** Instead of walking entire DOM trees upon mutations, the core observer relies on blazing-fast native `querySelectorAll` with pre-compiled CSS strings.
- **Graceful Lazy-Loading:** Built-in `IntersectionObserver` optionally defers executing components until the user actually scrolls the element into view.
- **HTML-first:** Maintain beautiful, standard HTML strings. The parser natively understands relaxed JSON configuration strings, requiring no compilation steps or esoteric syntax constraints inside your templates.

## Quick Start

**CDN / no-build (fastest setup):**

```html
<script src="https://cdn.jsdelivr.net/npm/liveinit@0.1.0/dist/liveinit.min.js" defer></script>
```

```html
<div data-component="Counter" data-component-config="start: 10"></div>
<button data-command="refresh" data-command-for="#my-table">Reload Data</button>
<table id="my-table"></table>

<script>
  class Counter {
    constructor(el, config) {
      el.textContent = `Count: ${config.start || 0}`;
    }
  }
  window.Counter = Counter; // default resolver reads from window

  document.addEventListener("command:refresh", () => {
    console.log("refresh table");
  });
</script>
```

**Everything is configurable** (custom attributes, event list, resolver, lifecycle hooks, lazy behavior).  
See [docs/initComponents.md](docs/initComponents.md) and [docs/initCommands.md](docs/initCommands.md) for full options.

### Safe Script Loading

`liveinit` is structurally immune to script load order issues because of its core architecture:

1. **MutationObserver foundation**: Even if `liveinit` executes before your HTML finishes rendering, it will instantly catch and initialize elements as they stream into the `<body>`.
2. **Global Delegation**: `initCommands()` attaches listeners to the document root, meaning it doesn't care if the target buttons exist yet or are added asynchronously later.

To guarantee zero race-conditions and best performance, load the script high up in the document (like the `<head>`) with `defer`:

```html
<script src="..." defer></script>
```

**Bundler usage:**

```javascript
import { initComponents, initCommands } from "liveinit";

initComponents({
  dropdown: () => import("./components/dropdown.js"),
  "heavy-map": () => import("./components/map.js"),
});
initCommands();
```

## Documentation

The library consists of modular, standalone pieces you can use together or separately:

1. **[API Contract](docs/api.md)** - Stable public exports and return shapes.
2. **[Init Components Engine](docs/initComponents.md)** (`initComponents.js`) - The main application loader tying everything together.
3. **[Command Engine](docs/initCommands.md)** (`initCommands.js`) - The global configurable event delegator for stateless HTML actions.
4. **[Selector Observer](docs/observer.md)** (`observer.js`) - The ultra-fast MutationObserver wrapper.
5. **[Lazy Init](docs/lazy.md)** (`lazy.js`) - The IntersectionObserver bindings for deferred loading.
6. **[Data Config](docs/parseConfig.md)** (`parseConfig.js`) - A relaxed, HTML-friendly JSON parser.

## Browser Support

- `liveinit` targets browsers with native ES modules (`<script type="module">`) and modern DOM APIs.
- `IntersectionObserver` is optional:
  if unavailable, `lazy()` falls back to immediate initialization instead of throwing.
- The table below reflects the baseline for the **full feature set** (`type="module"` + `AbortController` + core DOM APIs used by this library).

| Browser | Minimum version | First stable release |
|---------|-----------------|----------------------|
| Chrome  | 66              | April 17, 2018       |
| Firefox | 57              | November 14, 2017    |
| Safari  | 12.1            | March 25, 2019       |
| Edge    | 16              | October 17, 2017     |

- `IntersectionObserver` remains optional (lazy init degrades to immediate init).
- Quick checks on caniuse:
  - ES modules: <https://caniuse.com/es6-module>
  - IntersectionObserver: <https://caniuse.com/intersectionobserver>
  - AbortController: <https://caniuse.com/abortcontroller>

## Semver Policy

- Patch releases (`x.y.z`) include bug fixes and internal changes only.
- Minor releases (`x.y.0`) can add new features/options in backward-compatible ways.
- Major releases (`x.0.0`) are used for breaking changes.

Breaking changes include:
- Renaming/removing public exports from `liveinit`.
- Changing default attribute names or command event naming behavior.
- Changing lifecycle contracts (for example return shapes from `initCommands()` or observer engine APIs).
- Raising the documented browser support baseline.
