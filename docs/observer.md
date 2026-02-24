# Selector Observer (`observer.js`)

The ultra-fast, pure JS core DOM lifecycle tracker for known, fixed CSS selectors. This module wraps `MutationObserver` directly.

## Overview

Unlike many mutation tracking libraries that suffer severe performance penalties by walking the entire DOM on every change, `observer.js` specifically looks for targeted, pre-computed CSS selector matches when nodes drop in and out of the DOM.

## Features

- Blazing fast CSS string compilation upfront.
- Native evaluation for child element searches (`querySelectorAll`).
- Auto-initialization for matched elements immediately on load.
- Safe-by-default behavior with no global prototype patching.

## Usage

```javascript
import { observer } from 'liveinit';

// The engine takes an Array of specific CSS selectors it should look for
const OBSERVED = ['[data-component]', '[data-custom-component]'];

// Start observing mutations and immediately evaluate all current DOM
const engine = observer(OBSERVED, (element, isConnected, selector) => {
  if (isConnected) {
    console.log(`Node ${element.tagName} attached! matched: ${selector}`);
  } else {
    console.log(`Node ${element.tagName} detached! matched: ${selector}`);
  }
});
```

### The Returned Instance

The observer call returns the following API:

```javascript
const { evaluate, forget, disconnect } = engine;
```

- `evaluate(elements, isConnected = true)`: Manually trigger the engine on dynamically altered nodes. *Because `observer.js` intentionally ignores attribute changes (for performance), if you dynamically add a class or attribute later without re-appending the DOM node, call `evaluate(yourDiv)` to manually trigger the connection lifecycle.*
- `forget(element)`: Strips an element entirely from the WeakMap memory tracker.
- `disconnect()`: Unplugs the internal `MutationObserver`.

## Shadow DOM (Opt-In)

`observer.js` does not patch `Element.prototype` automatically. If you want to observe future **open** shadow roots, opt in explicitly:

```javascript
import { observer, observeOpenShadowRoots } from 'liveinit';

const engine = observer(['[data-component]'], (el, isConnected) => {
  // ...
});

// Observe all newly created open shadow roots.
const stopShadowRootBridge = observeOpenShadowRoots((shadowRoot) => {
  engine.evaluate(shadowRoot.querySelectorAll('[data-component]'), true);
});

// Later:
stopShadowRootBridge();
engine.disconnect();
```
