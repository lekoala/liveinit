# API Contract

This document defines the public API exposed by `liveinit`.

## Exports

```javascript
import {
  initCommands,
  initComponents,
  lazy,
  observeOpenShadowRoots,
  observer,
  parseConfig
} from "liveinit";
```

## Functions

### `initComponents(Registry?, options?)`

Initializes component lifecycle handling for elements matching `data-component` (configurable).

- Returns: `{ evaluate, retryFailed, forget, disconnect }` (observer engine handle)
- Notes:
  - supports global resolver fallback (`window[ComponentName]`) when no registry entry exists
  - injects an `AbortSignal` into component config (default key: `signal`)
  - supports optional lazy init via `data-lazy` (configurable)
  - `retryFailed(root?)` retries components that previously failed to resolve

### `initCommands(options?)`

Initializes global command delegation for stateless event dispatching.

- Returns: `{ disconnect }`
- Notes:
  - each call creates a new listener set
  - call `disconnect()` before re-initializing in HMR/microfrontend contexts

### `observer(queries, callback, root?)`

MutationObserver wrapper for fixed selector matching.

- Returns: `{ evaluate, forget, disconnect }`
- Notes:
  - safe by default: does not patch `Element.prototype.attachShadow`

### `observeOpenShadowRoots(observe)`

Opt-in bridge for future open shadow roots.

- Returns: `() => void` (cleanup function)
- Notes:
  - subscribes to newly created open shadow roots only
  - restores original `attachShadow` when last subscriber is removed

### `lazy(el, cb)`

Executes `cb` when `el` intersects viewport.

- Returns: `() => void` (cleanup function)
- Notes:
  - degrades gracefully when `IntersectionObserver` is unavailable (runs immediately)

### `parseConfig(str)`

Parses relaxed HTML-friendly config strings into objects.

- Returns: `object`
- Notes:
  - supports unquoted keys and single-quoted strings
  - invalid input returns `{}` (does not throw)
