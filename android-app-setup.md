# Nivesh Diary Android Setup Guide

This guide details the Capacitor integration and provides instructions on how to compile, run, and package your Nivesh Diary Android app.

---

## 🛠️ Summary of Changes Made

To convert the web PWA to a native Android wrapper without changing any existing UI, UX, or offline functionality, we did the following:

1. **Created Project Configurations:**
   * [`package.json`](file:///Users/nish/Code/nivesh-diary/package.json): Defines Capacitor core dependencies, native Android plugins, and a `build` script to bundle assets.
   * [`capacitor.config.json`](file:///Users/nish/Code/nivesh-diary/capacitor.config.json): Specifies the app's metadata (`com.curiousnish.niveshdiary`), display name (`Nivesh Diary`), and local resource folder (`www`).

2. **Added Android Platform Wrapper:**
   * Initialized the native project using `npx cap add android` (resides in the [`android/`](file:///Users/nish/Code/nivesh-diary/android) folder).

3. **Upgraded App Logic ([`js/app.js`](file:///Users/nish/Code/nivesh-diary/js/app.js)):**
   * **Native Notifications:** Integrated the `@capacitor/local-notifications` plugin. The app now schedules future maturity reminders directly in the Android system scheduler (even if the app is closed), falling back to browser-based Service Workers when run on the web.
   * **Native Export/Downloads:** Android's WebView blocks browser `blob:` downloads by default. We integrated `@capacitor/filesystem` and `@capacitor/share` to write the encrypted backup JSON file to a local cache directory and trigger Android's native share drawer (allowing users to save it to Files, send to Drive, WhatsApp, etc.).
   * **Native Share/Email Sheets:** Upgraded WhatsApp and email sharing to use native sharing dialogs when running on Android.
   * **Launch Initialization:** Updated `init()` to automatically request and register notifications when the app starts, bypassing the service worker registration requirement inside Capacitor.

---

## 🚀 How to Run and Build the App

Since you have Node.js, NPM, and Android Studio installed, follow these steps to build and run your application:

### Step 1: Open the Project in Android Studio
Run the following command to open the native project in Android Studio:
```bash
npx cap open android
```
*(Android Studio will launch and start importing the Gradle project. Allow a few moments for the initial Gradle sync to complete.)*

### Step 2: Run on Emulator or Device
1. Connect your Android phone via USB (with **USB Debugging** enabled in Developer Options) or start a Virtual Device (Emulator) from Android Studio's Device Manager.
2. In Android Studio, click the green **Run (Play)** button in the top toolbar.
3. The app will compile, install, and open on your target device!

---

## 🎨 How to Customize the App Launcher Icon

To replace the default Capacitor icon with your custom logo (`icons/icon-512.png`), use Android Studio's built-in asset helper:

1. In Android Studio, open the project view on the left.
2. Navigate to: `app` ➡️ `src` ➡️ `main` ➡️ `res`.
3. Right-click on the `res` folder and select **New ➡️ Image Asset**.
4. In the **Icon Type** dropdown, select **Launcher Icons (Adaptive and Legacy)**.
5. In the **Path** field under **Source Asset**, browse and select:
   `/Users/nish/Code/nivesh-diary/icons/icon-512.png`
6. Adjust the scaling slider so your logo fits neatly inside the safe zone circle.
7. Go to the **Background Layer** tab. You can set it to a **Color** (e.g., `#2C5F2E` to match your theme color) or choose a background image.
8. Click **Next** and then **Finish**. Android Studio will generate all the resolutions of adaptive, round, and legacy icons automatically!

---

## 🔄 Developer Workflow

If you modify your HTML, CSS, or JS code in the future:
1. Run the build script to bundle assets:
   ```bash
   npm run build
   ```
2. Sync the modifications to the native Android files:
   ```bash
   npx cap sync
   ```
3. Run the app again from Android Studio (or CLI using `npx cap run android`).
