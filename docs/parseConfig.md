# Config Parser (`parseConfig.js`)

A utility for parsing flexible HTML configuration strings securely into functional JavaScript Objects.

## Overview

Writing Strict JSON inside HTML properties is incredibly painful and prone to error:

```html
<div data-component-config='{"page": 2, "theme": "dark"}'> <!-- Annoying -->
```

`parseConfig` transforms the developer experience by explicitly supporting unquoted keys and single quotes, allowing for cleaner HTML:

```html
<div data-component-config="page: 2, theme: 'dark'"> <!-- Beautiful -->
```

## Usage

```javascript
import { parseConfig } from 'liveinit';

// Pass relaxed strings:
const parsed = parseConfig("delay: 50, silent: true");

/* Result: 
{
  "delay": 50,
  "silent": true
}
*/
```

## Parsing Rules

1. Single Quotes (`'value'`) are explicitly accepted as valid strings.
2. Missing Key Quotes (`name: ...`) are wrapped with Double Quotes under-the-hood.
3. If structural Regex rules completely fail, the function natively delegates down to `JSON.parse` or falls back to an empty object `{}` rather than throwing breaking errors up the chain.
