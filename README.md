# Pinote

A lightweight JavaScript feedback layer for adding Figma-style comments to any website.

Pinote adds a small always-visible floating button to any web application. Users can open Pinote, click UI elements, and leave localized feedback that stays anchored even if the layout reflows or the window is resized.

- **Framework Agnostic**: Pure Vanilla JS engine that works anywhere.
- **First-class React Support**: Includes components and hooks for React and Next.js.
- **Local by Default**: Uses `localStorage` plus JSON import/export without requiring a server.

## Features

- **Precise Targeting**: Comments attach to DOM elements using stable selectors and relative percentage offsets.
- **Dynamic Anchoring**: Pins follow moved or resized elements automatically.
- **Local Persistence**: Comments are stored in the browser, scoped by project ID.
- **Cross-Page Support**: Comments are automatically separated by URL pathname.
- **Always-Visible Control**: A compact floating button toggles all Pinote pins, popovers, and controls.
- **JSON Import/Export**: Download feedback as JSON and import shared Pinote JSON files later.
- **Lightweight**: Minimal footprint and easy to integrate.

## Installation

```bash
# Using npm
npm install pinotejs

# Using pnpm
pnpm add pinotejs

# Using yarn
yarn add pinotejs
```

## Quick Start

### Vanilla JavaScript

Use Pinote in any DOM-based framework (Vue, Svelte, Angular, etc.) or plain HTML.

```javascript
import { createPinote } from "pinotejs";
import "pinotejs/style.css";

const feedbackLayer = createPinote({
  storageKey: "my-project-id",
});

// Mount the UI layer
feedbackLayer.mount();
```

Pinote renders one compact floating button. When the button is disabled, only the button is visible. When enabled, Pinote shows page pins, comment creation, counts, import, and export controls.

### React / Next.js

Pinote provides a thin React wrapper around the core engine.

```tsx
import { PinoteProvider, PinoteToolbar, PinoteLayer } from "pinotejs/react";
import "pinotejs/style.css";

function App() {
  return (
    <PinoteProvider storageKey="my-project-id">
      <PinoteToolbar />
      <YourAppContent />
      <PinoteLayer />
    </PinoteProvider>
  );
}
```

> **Note for Next.js App Router**: Wrap your layout or specific page in a Client Component when using Pinote components, or ensure they are mounted only on the client.

## API Reference

### Vanilla API (`pinotejs`)

#### `createPinote(options)`

Initializes a new Pinote instance.

- `options.storageKey` (string): Unique ID for local storage scoping.
- `options.ignoreSelector` (string): CSS selector for elements that should not be clickable.

#### `instance.mount()`

Injects the toolbar and comment layer into the DOM.

#### `instance.unmount()`

Removes the UI layer and cleans up all event listeners and observers.

#### `instance.enableCommentMode()`

Programmatically turns on comment mode.

#### `instance.disableCommentMode()`

Programmatically turns off comment mode.

#### `instance.exportComments()`

Returns a JSON-serializable export payload for comments in the project.

#### `instance.downloadCommentsExport()`

Downloads all project comments as `pinote-comments-{projectId}-{date}.json`.

#### `instance.importComments(input)`

Imports a parsed JSON value or JSON string, validates Pinote comment data, and merges it into local comments.

#### `instance.importCommentsFromFile(file)`

Reads and imports a `.json` file selected by the user.

#### `instance.mergeImportedComments(input)`

Alias for `importComments(input)`.

### React API (`pinotejs/react`)

#### `<PinoteProvider>`

The context provider that manages the engine lifecycle. Accepts the same options as `createPinote`.

#### `<PinoteToolbar>`

The built-in floating toolbar with toggle and export controls.

#### `<PinoteLayer>`

The visual layer that renders comment pins and popovers. (Optional: `PinoteProvider` can render this automatically).

#### `usePinote()`

A hook to access the current state and methods:

- `isCommentModeEnabled`: boolean
- `comments`: All project comments
- `currentPageComments`: Comments for the current path
- `toggleCommentMode()`: Function to toggle mode
- `exportComments()`: Function to create a JSON export payload
- `downloadCommentsExport()`: Function to download a JSON export file
- `importComments()`: Function to import parsed JSON or JSON text
- `importCommentsFromFile()`: Function to import a selected `.json` file

## Configuration

| Option            | Type                                                           | Default          | Description                                              |
| :---------------- | :------------------------------------------------------------- | :--------------- | :------------------------------------------------------- |
| `storageKey`      | `string`                                                       | `"default"`      | Used to isolate comments in localStorage.                |
| `ignoreSelector`  | `string`                                                       | `undefined`      | Additional CSS selectors to ignore during click capture. |
| `controlPosition` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` | Position of the always-visible Pinote button.            |
| `onStateChange`   | `function`                                                     | `undefined`      | Callback triggered when internal state updates.          |

## Data Import and Export

The exported JSON file contains:

- Full project metadata.
- `schemaVersion` for import compatibility.
- Comment counts (total, open, resolved).
- List of pages with comments.
- Raw comment data with anchoring metadata and relative positioning.

Manual sharing workflow:

1. User A opens Pinote and clicks **Export JSON**.
2. User A sends the downloaded JSON file to User B.
3. User B opens the same site, opens Pinote, and clicks **Import JSON**.
4. Imported comments are stored locally in User B's browser and render on matching pages when their target element can be found.

Importing the same file multiple times will not duplicate comments. Pinote deduplicates by comment id and only replaces an existing local comment when the imported copy has a newer `updatedAt` value.

If an imported file has a different `projectId`, Pinote treats the user-selected file as intentional and imports valid comments into the current local storage key. The original comment metadata, page path, URL, target selector, and relative position are preserved so comments still render only on matching pages.

Pinote import/export is not realtime sync. Comments only move between users when they manually share and import JSON files.

## Limitations

- **Local Only**: In the current MVP, data is stored in the browser and can be shared manually with JSON import/export.
- **Not Realtime**: Pinote does not sync comments between users unless they manually exchange JSON files.
- **Browser-Only**: Requires a DOM environment; not compatible with Node.js/SSR environments.
- **Visibility**: Uses a high z-index (`2147483647`), but may be affected by other elements with equal priority.

## Contributing

1. Clone the repo: `git clone https://github.com/RidloGhifary/pinote.git`
2. Install dependencies: `pnpm install`
3. Build the package: `pnpm build`
4. Run demos: `pnpm dev:react` or `pnpm dev:vanilla`

## License

MIT © [Ridlo Ghifary](https://github.com/RidloGhifary)
