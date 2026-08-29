# Contributing to Nivesh Diary

Thanks for your interest in contributing! Nivesh Diary is intentionally lightweight and privacy-first, so contributions are welcome as long as they respect that philosophy.

There are two parts to the project:

- **Web App (PWA)** — `main` branch, pure vanilla HTML/CSS/JS.
- **Android App** — [`capacitor/android`](https://github.com/curiousnish/nivesh-diary/tree/capacitor/android) branch, Capacitor wrapper around the web app.

Make sure you're branching off the right one depending on what you're working on.

---

## 📋 Ground Rules

1. **Keep it vanilla (Web app).** Do not introduce frameworks or libraries (React, Vue, Tailwind, jQuery, etc.) to the frontend. The whole point of this project is a zero-dependency, fast, offline-first web app.
2. **Privacy is non-negotiable.** Never add a feature that requires a backend, sends user data off-device, or introduces third-party analytics/trackers.
3. **Respect the architecture.** Keep concerns separated:
   - Styles → `css/styles.css`
   - App logic → `js/app.js`
   - Structure → `index.html`
   - Service worker / offline behavior → `sw.js`
   - PWA metadata → `manifest.json`
4. **Android changes stay Capacitor-native.** Native code changes on the `android` branch should stay minimal — most functionality should live in the shared web layer so both platforms benefit.

---

## 🐛 Reporting Bugs

Before opening an issue, please check existing [issues](https://github.com/curiousnish/nivesh-diary/issues) to avoid duplicates.

When filing a bug report, include:

- **Platform:** Web (browser + OS) or Android (device + OS version).
- **Steps to reproduce.**
- **Expected vs. actual behavior.**
- **Screenshots** if it's a visual/UI issue.
- Whether the issue happens with an existing data set or only fresh installs (helps isolate storage/encryption bugs).

---

## 💡 Suggesting Features

Open an issue describing:

- The problem you're trying to solve (not just the feature itself).
- Why it fits the project's privacy-first, no-backend philosophy.
- Any UI/UX sketches or examples, if relevant.

Features that require a backend, cloud sync, or external services will generally be declined unless designed as a fully optional, off-by-default toggle that doesn't compromise the offline-first default.

---

## 🔧 Development Setup

### Web App

```
git clone https://github.com/curiousnish/nivesh-diary.git
cd nivesh-diary
python3 -m http.server 8000
```

Visit `http://localhost:8000`.

### Android App

```
git clone https://github.com/curiousnish/nivesh-diary.git
cd nivesh-diary
git checkout android
npm install
npm run build
npx cap sync android
npx cap open android
```

Run from Android Studio on an emulator or physical device.

### Decryption Utility (Python)

```
uv sync
uv run scripts/decrypt.py
```

---

## 🔀 Pull Request Process

1. **Fork the repo** and create your branch from `main` (web) or `android` (Android app):
   ```
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes**, keeping commits focused and descriptive.
3. **Test locally** — for the web app, check across at least one desktop and one mobile browser (PWA install/offline behavior can differ). For Android, test on an emulator or device covering the minimum supported API level.
4. **Update documentation** if your change affects setup, features, or project structure (README, this file, code comments).
5. **Open a pull request** against the correct base branch (`main` or `android`), with:
   - A clear description of what changed and why.
   - Screenshots or a short clip for any UI changes.
   - Reference to the related issue, if any (e.g. `Closes #12`).
6. A maintainer will review and may request changes before merging.

---

## 🎨 Code Style

- Use clear, descriptive variable and function names — no unexplained abbreviations.
- Match the existing formatting style already in `js/app.js` and `css/styles.css` (indentation, quote style, etc.).
- Comment non-obvious logic, especially anything touching encryption, storage schema, or notification scheduling.
- Keep functions small and single-purpose where practical.

---

## 🔒 Security Issues

If you discover a security vulnerability (especially anything related to the encryption/backup flow), please **do not open a public issue**. Instead, report it privately by opening a [security advisory](https://github.com/curiousnish/nivesh-diary/security/advisories/new) on the repo, or contact the maintainer directly.

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
