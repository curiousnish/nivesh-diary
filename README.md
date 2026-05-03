# 📒 Nivesh Diary

**Nivesh Diary** is a lightweight, privacy-focused Progressive Web App (PWA) designed to help you track personal investments like Fixed Deposits (FD), National Savings Certificates (NSC), Kisan Vikas Patra (KVP), and more, specifically tailored for the Indian financial context.

---

## ✨ Key Features

-   **💼 Investment Management:** Easily record and manage various investment types (FD, RD, NSC, KVP, MIS, PPF, SCSS, etc.).
-   **⏰ Maturity Alerts:** Never miss a maturity date! Get local notifications and dashboard reminders for upcoming maturities (Urgent, Soon, and Upcoming).
-   **🔒 Privacy First:** All data stays on your device in `localStorage`. No cloud syncing, no trackers, and no backend.
-   **🔐 Encrypted Backups:** Export and import your data as encrypted JSON files using the Web Crypto API (AES-GCM).
-   **👁️ Privacy Toggle:** Instantly hide or show investment amounts on the dashboard and lists for better privacy in public spaces.
-   **🖥️ Offline Decryption:** A standalone Python script allows you to decrypt your data backups even if you don't have access to the web app.
-   **📱 PWA Ready:** Install it on your phone or desktop for an app-like experience. Works completely offline once installed.
-   **📊 Financial Summary:** View total invested amounts, upcoming returns, and recent investment history at a glance.
-   **📤 Easy Sharing:** Quickly share investment details via WhatsApp or Email.

---

## 🛠️ Tech Stack & Techniques

### Frontend (The Web App)
-   **Vanilla Everything:** No frameworks, no libraries. Just pure **HTML5**, **CSS3**, and **Modern JavaScript (ES6+)**.
-   **PWA Core:** Service Workers (`sw.js`) for offline caching and push notifications; `manifest.json` for home screen installation.
-   **Web Crypto API:** Implements `AES-GCM` for secure, password-protected data exports and imports.
-   **Storage:** Persistent storage using the `localStorage` API.
-   **Design:** Mobile-first, responsive design with CSS custom properties (variables) and high-quality typography (Lora & DM Sans).

### Utilities (The Offline Tool)
-   **Python 3.13+:** A robust script for offline data recovery.
-   **Cryptography Library:** Uses industry-standard primitives for AES-GCM decryption.
-   **uv:** Modern Python package manager for seamless environment setup.

---

## 🚀 Getting Started

### Running the Web App
Since it's a static PWA, you can serve it using any local web server:

**Option 1: Python (Recommended)**
```bash
python3 -m http.server 8000
```

**Option 2: Node.js (serve)**
```bash
npx serve .
```
Access the app at `http://localhost:8000` (or the port provided by `serve`).

### Using the Decryption Utility
If you have an encrypted backup file and want to view its contents offline:

1.  **Install `uv`** (if not already installed).
2.  **Sync dependencies:**
    ```bash
    uv sync
    ```
3.  **Run the script:**
    ```bash
    uv run scripts/decrypt.py
    ```

---

## 🤝 Contribution Guidelines

We welcome contributions! To keep the project lightweight and maintainable, please follow these principles:

1.  **Keep it Vanilla:** Do not add external libraries or frameworks (like React, Vue, or Tailwind) to the frontend.
2.  **Modular Logic:** Maintain the separation of concerns:
    -   Styles in `css/styles.css`
    -   Application logic in `js/app.js`
    -   Structure in `index.html`
3.  **PWA Standards:** Ensure any new assets or core logic changes are reflected in `sw.js` and `manifest.json`.
4.  **Privacy:** Never introduce features that require a backend or send user data to external servers.

---

## 📂 Project Structure

```text
├── index.html         # Core structure & entry point
├── css/styles.css     # Design tokens & application styles
├── js/app.js          # Logic, storage & encryption handling
├── sw.js              # Service Worker for offline/notifs
├── manifest.json      # PWA metadata
├── icons/             # App icons & branding
├── scripts/decrypt.py # Python utility for offline recovery
├── pyproject.toml     # Python dependencies (managed by uv)
└── GEMINI.md          # Internal project context & agent mandates
```

---

## 📄 License

This project is open-source. See the repository for license details.
