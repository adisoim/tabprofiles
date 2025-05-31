# 🚀 Tab Profiles Chrome Extension

## 📄 Overview

This Chrome extension allows users to **create, save, activate, and manage sets of browser tabs** under named "profiles." It’s ideal for users who work on different tasks or projects and want to easily switch between relevant sets of tabs.

---

## ✨ Features

- ✅ Create named tab profiles
- 💾 Save current tabs to a profile
- 🔄 Activate a profile (closes current tabs, opens profile tabs)
- 🔙 Deactivate a profile (restores previous session tabs)
- 📝 Edit profile tab URLs
- ❌ Delete profiles
- 📦 Persistent storage via `chrome.storage.local`

---

## 🛠️ Installation (Development Mode)

1. Clone or download this repository.
2. Run `npm install` and then `npm run build`.
3. Open Chrome and navigate to: `chrome://extensions/`
4. Enable **Developer Mode** (toggle in top-right).
5. Click **Load unpacked**.
6. Select the folder containing the extension source.

> ✅ The extension icon will appear in your toolbar and be ready to use.

---

## 💡 Usage Examples

### 📁 Example 1: Creating and Activating a Profile

1. Open the extension popup.
2. Enter a name in the **New profile name** field (e.g., `Work`).
3. Click **Create**.
4. Click **Activate** on the new profile.
5. The current open tabs will be saved and re-opened.
6. Your previous session’s tabs are stored and restored upon **deactivation**.

---

### ✏️ Example 2: Editing a Profile

1. Click **Show Links** on a profile.
2. Modify URLs directly in the list.
3. Use **+ Add Link** to include more tabs.
4. Click **Save Links** to update the profile.

---

### 🔄 Example 3: Switching Between Profiles

1. Click **Activate** on a profile (e.g., `Study`).
2. Work within the opened tabs.
3. Click **Deactivate** to return to your previous tab set.
4. Activate another profile (e.g., `Entertainment`) to switch context.

---

## 🧱 Architecture Overview

### 🧠 Background Script

Responsible for the core logic:

- Initializes and loads profile data on startup/install.
- Handles messages like `createProfile`, `activateProfile`.
- Manages tab actions using the **Chrome Tabs API**.
- Stores data with `chrome.storage.local`.

---

### 🎛️ Popup UI (React + Material UI)

- Renders the profile list and interface.
- Supports creation, activation, deletion, and editing.
- Communicates with the background script via `chrome.runtime.sendMessage`.

---

## ⚠️ Known Behavior

- On **Chrome restart**, all profile states reset to **inactive**.
  - This is **intentional** to avoid auto-reopening tabs without user control.

---
