# Grocery List

A minimal, mobile-friendly grocery list webapp with dark mode and store grouping.

## Features

- Add/check off items
- Organize items by store with colored labels
- Auto-remembers which store you buy each item from
- Clear completed items
- All data persists in browser localStorage
- Single-page, no dependencies

## Usage

Open `index.html` in a browser or [open the corresponding GitHub Page](https://nestordemeure.github.io/grocery-list).

## Development

Sources live in `src/` (separate `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json` for easy editing; `src/index.html` can be opened directly during development). The served files at the repo root are generated — `index.html` gets the CSS and JS inlined so the app loads from a single cached file:

```bash
node build.js
```

Run this after editing anything in `src/`, and commit the generated root files (GitHub Pages serves them). Updates reach installed PWAs automatically: the service worker serves the cached copy for a fast launch and refreshes it in the background, so a deploy shows up on the second launch — no cache-version bump needed.

- **Add item**: Type item name and press Enter
- **Assign store**: Click the 🏷️ icon to optionally select a store
- **Check off**: Click checkbox to mark as purchased
- **Clear**: Click 🛒 to remove all checked items
