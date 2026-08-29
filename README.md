# 📒 Nivesh Diary

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg)](https://web.dev/progressive-web-apps/)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android-informational.svg)]()
[![Last Commit](https://img.shields.io/github/last-commit/curiousnish/nivesh-diary.svg)](https://github.com/curiousnish/nivesh-diary/commits/main)
[![Stars](https://img.shields.io/github/stars/curiousnish/nivesh-diary.svg)](https://github.com/curiousnish/nivesh-diary/stargazers)

**Nivesh Diary** is a lightweight, privacy-focused app to track personal investments — Fixed Deposits (FD), Recurring Deposits (RD), National Savings Certificates (NSC), Kisan Vikas Patra (KVP), PPF, SCSS, and more — tailored for the Indian financial context.

Available as a **Progressive Web App** and as a **native Android app** (Capacitor-based).

🔗 **[Live Demo](https://curiousnish.github.io/nivesh-diary/)**

---

## 📸 Screenshots

<!-- TODO: Replace with actual screenshots or a GIF walkthrough -->
<!-- Suggested shots: Dashboard, Add Investment form, Maturity Alerts, Encrypted Backup flow -->

| Dashboard | Add Investment | Maturity Alerts |
|-----------|-----------------|------------------|
| _placeholder_ | _placeholder_ | _placeholder_ |

<!-- Optional: a short GIF of the app in action -->
<!-- ![App Demo](assets/demo.gif) -->

---

## ✨ Key Features

- **💼 Investment Management:** Easily record and manage various investment types (FD, RD, NSC, KVP, MIS, PPF, SCSS, etc.).
- **⏰ Maturity Alerts:** Never miss a maturity date — local notifications and dashboard reminders for upcoming maturities (Urgent, Soon, and Upcoming).
- **🔒 Privacy First:** All data stays on your device. No cloud syncing, no trackers, no backend.
- **🔐 Encrypted Backups:** Export and import your data as encrypted JSON files using the Web Crypto API (AES-GCM).
- **👁️ Privacy Toggle:** Instantly hide or show investment amounts for better privacy in public spaces.
- **🖥️ Offline Decryption:** A standalone Python script to decrypt your data backups without the web app.
- **📱 PWA & Android Ready:** Install as a PWA on any device, or use the native Android app. Works fully offline once installed.
- **📊 Financial Summary:** View total invested amounts, upcoming returns, and recent investment history at a glance.
- **📤 Easy Sharing:** Quickly share investment details via WhatsApp or Email.

---

## 🛠️ Tech Stack

### Frontend (Web App)

- **Vanilla Everything:** No frameworks, no libraries. Pure **HTML5**, **CSS3**, and **Modern JavaScript (ES6+)**.
- **PWA Core:** Service Workers (`sw.js`) for offline caching and push notifications; `manifest.json` for home screen installation.
- **Web Crypto API:** `AES-GCM` for secure, password-protected data exports and imports.
- **Storage:** Persistent local storage using the `localStorage` API.
- **Design:** Mobile-first, responsive design with CSS custom properties and typography (Lora & DM Sans).

### Android App

- **Capacitor:** Wraps the web app into a native Android build, packaged for the Play Store.
- Available on the [`android`](https://github.com/curiousnish/nivesh-diary/tree/android) branch.

### Utilities (Offline Recovery Tool)

- **Python 3.13+:** Robust script for offline data recovery.
- **Cryptography Library:** Industry-standard AES-GCM decryption primitives.
- **uv:** Modern Python package manager for environment setup.

---

## 🚀 Getting Started

### Running the Web App

Since it's a static PWA, serve it with any local web server:

**Option 1: Python (Recommended)**

```
python3 -m http.server 8000
```

**Option 2: Node.js (serve)**

```
npx serve .
```

Access the app at `http://localhost:8000` (or the port provided by `serve`).

### Building the Android App

The native Android build lives on the [`android`](https://github.com/curiousnish/nivesh-diary/tree/android) branch and is built with [Capacitor](https://capacitorjs.com/).

```
git checkout android
npm install
npx cap sync android
npx cap open android
```

This opens the project in Android Studio, from which you can run it on an emulator/device or build a release APK/AAB.

### Using the Decryption Utility

If you have an encrypted backup file and want to view its contents offline:

1. **Install `uv`** (if not already installed).
2. **Sync dependencies:**

```
uv sync
```

3. **Run the script:**

```
uv run scripts/decrypt.py
```

---

## 🤝 Contributing

We welcome contributions! To keep the project lightweight and maintainable, please follow these principles:

1. **Keep it Vanilla:** Do not add external libraries or frameworks (like React, Vue, or Tailwind) to the web frontend.
2. **Modular Logic:** Maintain the separation of concerns:
   - Styles in `css/styles.css`
   - Application logic in `js/app.js`
   - Structure in `index.html`
3. **PWA Standards:** Reflect any new assets or core logic changes in `sw.js` and `manifest.json`.
4. **Privacy:** Never introduce features that require a backend or send user data to external servers.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## 📂 Project Structure

```
├── index.html         # Core structure & entry point
├── css/styles.css     # Design tokens & application styles
├── js/app.js          # Logic, storage & encryption handling
├── sw.js              # Service Worker for offline/notifications
├── manifest.json      # PWA metadata
├── icons/             # App icons & branding
├── assets/            # Images, screenshots, and other static assets
├── scripts/decrypt.py # Python utility for offline recovery
└── pyproject.toml     # Python dependencies (managed by uv)
```

> The native Android (Capacitor) project structure lives on the [`android`](https://github.com/curiousnish/nivesh-diary/tree/android) branch.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
