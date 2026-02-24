# Lazy Intersection Observer (`lazy.js`)

A simple utility that defers the initialization of DOM elements until they enter the user's viewport.

## Overview

By leveraging the natively performant `IntersectionObserver`, `lazy.js` prevents heavy external scripts—like maps, charts, or datatables—from unnecessarily slowing down Initial Page Load times.

## Usage

```javascript
import { lazy } from 'liveinit';

// Setup your heavy DOM initialization
const initMyComponent = (element) => {
  element.innerText = "Wow! I am finally loaded.";
};

// Start watching the element
const cancelLazyObserver = lazy(myHeavyDiv, initMyComponent);
```

### Automatic Cleanup Strategy

`lazy()` returns a cleanup function that cancels the observer entirely. This makes it perfect to cleanly tie to the teardown phase of a component lifecycle in case it drops from the page before it's ever scrolled to:

```javascript
// Disconnects element from IntersectionObserver
cancelLazyObserver();
```

*(Note: Once the element actually enters the screen and executes `initMyComponent`, the internal observer automatically calls `.unobserve(el)` and destroys the internal WeakMap entry. The `cancelLazyObserver` function then becomes a harmless no-op string).*

### Fallbacks

If `IntersectionObserver` is completely unsupported by the browser, `lazy.js` will instantly fall back to executing the callback immediately to ensure core capabilities function without throwing an error natively.
