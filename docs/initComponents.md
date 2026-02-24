# Init Components Engine (`initComponents.js`)

The high-level component initializer that wires together the `observer`, `lazy` intersection observations, and parsed `parseConfig` configuration.

## Overview

`initComponents` is designed to be the main entry point for HTML-first applications. It watches the DOM for specific attributes, parses configuration strings safely, and dynamically lazy-loads and instantiates classes when they enter the DOM.

## Usage

```javascript
import { initComponents } from 'liveinit';

// ---------- Method 1: Zero Setup (Global Scope) ----------
// If a component is attached to the window (e.g., `window.Dropdown`)
// this will automatically instantiate `<div data-component="Dropdown">`
initComponents();

// ---------- Method 2: Standard Registry (Code-Splitting) ----------
// Dictionary mapping the module names (HTML attribute values)
// to dynamic imports for lazy loading.
const Registry = {
  'datatable': () => import('./components/datatable.js'),
  'heavy-map': () => import('./components/map.js')
};
initComponents(Registry);

// ---------- Method 3: Advanced Options & Custom Resolvers ----------
initComponents(null, {
  attribute: 'data-widget',        // Default: data-component
  lazyAttribute: 'data-defer',     // Default: data-lazy
  signalKey: 'abortSignal',        // Default: signal
  destroyMethod: 'dispose',        // Default: destroy
  resolve: async (name) => {
    // Write your own logic (e.g. Vite glob imports)
    const modules = import.meta.glob('./widgets/*.js');
    const imported = await modules[`./widgets/${name}.js`]();
    return imported.default;
  }
});
```

### HTML Setup

**Immediate Initialization:**
When the HTML node enters the DOM, it immediately imports the datatable component and initializes it.

```html
<div data-component="datatable" data-component-config="pageLength: 25"></div>
```

**Lazy Initialization:**
By adding the `data-lazy` attribute, the loader waits until the element is scrolled into view (using `IntersectionObserver`) before it downloads and executes the component code.

```html
<div data-component="heavy-map" data-component-config="lat: 50.85, lng: 4.35" data-lazy></div>
```

### Component Structure

Your JavaScript component classes will receive two arguments upon instantiation: the DOM `Element`, and a `config` object containing the parsed dataset configurations.

By default, an `AbortSignal` is automatically injected into the config as `config.signal` (configurable via `options.signalKey`) to elegantly handle event cleanup when DOM nodes are removed.

```javascript
export default class DataTable {
  constructor(element, config) {
    this.element = element;
    
    // Config properties parsed from `data-component-config`
    this.pageLength = config.pageLength || 10;
    
    // Automatically cleaned up when the element leaves the DOM!
    window.addEventListener("resize", this.handleResize, { signal: config.signal });
  }

  // Optional teardown triggered automatically if the node is removed from the DOM
  // (Configurable via options.destroyMethod, defaults to "destroy")
  destroy() {
    console.log("Datatable unmounted safely.");
  }
}
```

## How It Works

1. Uses `observer.js` to strictly track DOM insertion and removal.
2. Uses `lazy.js` to optionally defer the initialization until the element is visible in the viewport.
3. Automatically creates an `AbortController` and passes the `.signal` to the component to guarantee no orphaned event listeners cause memory leaks.
4. Safely calls `.destroy()` on the class instance when the HTML node is removed (e.g., replaced during an AJAX/HTMX request).

## AJAX / Load Order Notes

`initComponents()` evaluates elements as soon as they enter the DOM.  
If an AJAX fragment is injected before its component class is registered on `window`, global fallback resolution can fail.

Recommended for async/fragment-heavy apps:

1. Prefer `options.resolve` with async imports so component loading is deterministic.
2. Treat `window.ComponentName` fallback as a convenience path (best for simple pages).
3. If your scripts register components later, retry previously failed nodes after registration (`engine.retryFailed(fragment)`), or inject scripts before inserting the fragment.

If you use the CDN auto bundle (`dist/liveinit.min.js`), a convenience event is available:

```javascript
document.dispatchEvent(
  new CustomEvent("liveinit:refresh", {
    detail: { root: fragmentElement } // optional, defaults to document
  })
);
```

This re-scans `[data-component]` elements in the provided root and initializes any newly available components.
It also retries nodes that previously failed to resolve.
