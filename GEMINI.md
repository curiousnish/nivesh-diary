# Nivesh Diary

A lightweight, privacy-focused Progressive Web App (PWA) for tracking personal investments like Fixed Deposits (FD), National Savings Certificates (NSC), Kisan Vikas Patra (KVP), and more, specifically tailored for the Indian financial context.

## Project Overview

- **Purpose:** Provide a simple, offline-first tool to track investment maturity dates, principal amounts, and returns without the need for a backend or cloud syncing (data stays in `localStorage`).
- **Main Technologies:**
  - **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6+).
  - **PWA:** Service Workers (`sw.js`) for offline capabilities and push notifications, and `manifest.json` for home screen installation.
  - **Storage:** `localStorage` for data persistence.
  - **Fonts:** DM Sans and Lora (via Google Fonts).
- **Architecture:** Modular single-page application (SPA). Structure split into HTML, CSS, and JS for better maintainability.

## Key Features

- **Investment Management:** Create, read, update, and delete investment records.
- **Maturity Alerts:** Local notifications for upcoming investment maturities.
- **Sharing:** Export summaries or specific investment details to WhatsApp and Email.
- **Data Portability:** Backup and restore data via JSON import/export.
- **Offline First:** Works without an internet connection once installed.
- **Visuals:** Clean, mobile-optimized design with a focus on typography and clear financial summaries.

## Building and Running

### Development
No build step or dependencies are required. Edit files in `css/`, `js/`, or `index.html`.

### Running Locally
To test PWA features (like Service Workers), the app should be served over HTTPS or `localhost`.
- **Simple Python Server:**
  ```bash
  python3 -m http.server 8000
  ```
- **Node.js (serve):**
  ```bash
  npx serve .
  ```

### Testing
- **Manual Testing:** Open in a mobile browser (or desktop) and verify `localStorage` persistence and PWA installation prompts.
- **Service Worker:** Check Chrome DevTools > Application > Service Workers to verify caching and notification handling.

## Development Conventions

- **Vanilla-only:** Avoid adding external libraries or frameworks to keep the app lightweight and zero-dependency.
- **Modular Structure:** Keep styles in `css/`, logic in `js/`, and structure in `index.html`.
- **Data Schema:** Investments are stored as an array of objects in `data.investments` within `localStorage`.
- **PWA Assets:** Ensure `manifest.json` and `sw.js` are updated if core file names or caching strategies change.
- **Styling:** Use CSS variables (defined in `:root` in `css/styles.css`) for consistent theming.

## Project Structure

- `index.html`: The core structure and entry point.
- `css/styles.css`: All application styles and design tokens.
- `js/app.js`: Application logic, data handling, and UI rendering.
- `manifest.json`: Web App Manifest for PWA installation and metadata.
- `sw.js`: Service Worker for offline caching and notification scheduling.
- `icons/`: (Placeholder) Should contain `icon-192.png` and `icon-512.png` as referenced in `manifest.json`.
- `.gitignore`: Basic git configuration.
