# Codex Account Manager

A lightweight Chrome extension for monitoring **Codex usage across multiple ChatGPT accounts** from one place.

Codex Account Manager automatically detects supported ChatGPT account information and usage limits from the ChatGPT settings pages, allowing you to keep track of multiple accounts without manually entering usage data.

## ✨ Features

* 🔍 **Automatic account detection**

  * Detects the ChatGPT account name and email.
  * Supports multiple ChatGPT accounts.

* 📊 **Usage monitoring**

  * Displays remaining Codex usage percentage.
  * Shows the current usage status.

* ⏱️ **Reset countdown**

  * Tracks the usage reset time.
  * Displays a live countdown until the limit resets.

* 🟢 **Account status**

  * `AVAILABLE`
  * `LOW`
  * `EXHAUSTED`
  * `UNKNOWN`

* 👤 **Active Session**

  * Shows the currently detected ChatGPT account.
  * Associates usage data with the correct account.

* ✏️ **Account management**

  * Edit the displayed account name.
  * Delete individual accounts.

* 🔄 **Automatic updates**

  * Detects supported ChatGPT settings page navigation.
  * Supports both hash-based and path-based ChatGPT settings URLs.

* 🔒 **Local storage**

  * Account information is stored using Chrome's local storage.
  * No ChatGPT password is required.

---

## 🖥️ Screenshots



![Dashboard](screenshots/dashboard.png)

![Account Management](screenshots/account-management.png)

---

## 🚀 Installation

Since this project is not currently distributed through the Chrome Web Store, it can be installed using Chrome's **Load unpacked** feature.

### 1. Clone the repository

```bash
git clone https://github.com/mehedi-nym/codex-account-manager.git
```

Or download the repository as a ZIP from GitHub.

### 2. Open Chrome Extensions

Open:

```text
chrome://extensions
```

### 3. Enable Developer Mode

Turn on:

**Developer mode**

from the top-right corner.

### 4. Load the extension

Click:

**Load unpacked**

and select the project folder:

```text
codex-account-manager/
```

The folder containing `manifest.json` must be selected.

### 5. Pin the extension

Click the puzzle icon in Chrome and pin **Codex Account Manager** for easy access.

---

## 📖 How to Use

### Step 1 — Start monitoring

Open the extension and click:

**Start Monitoring**

### Step 2 — Open ChatGPT

Log in to a ChatGPT account.

### Step 3 — Open Extension

Click On : Start Monitoring 

The extension detects the account information automatically , wait for 3-5 sec.

### Step 4 — Switch accounts

Log into another ChatGPT account and repeat the process, by clicking Capture another button on the extension.

The extension maintains separate records for each detected account.

---

## 🔗 Supported ChatGPT URLs

The extension supports both ChatGPT settings URL formats.

### Account

```text
https://chatgpt.com/#settings/account
```

and

```text
https://chatgpt.com/settings/account
```

### Usage

```text
https://chatgpt.com/#settings/usage
```

and

```text
https://chatgpt.com/settings/usage
```

Query parameters such as:

```text
?tab=overview
```

are also supported.

---

## 🧩 Project Structure

```text
codex-account-manager/
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
│
└── README.md
```

### `manifest.json`

Chrome Extension Manifest V3 configuration, permissions, host permissions, icons, popup, and content script configuration.

### `popup.html`

Structure of the extension popup and dashboard.

### `popup.css`

UI styling for the popup, account cards, status badges, usage bars, and active session.

### `popup.js`

Handles:

* Popup UI
* Account rendering
* Account editing
* Account deletion
* Active session display
* Usage status
* Reset countdown
* Chrome storage

### `content.js`

Runs on supported ChatGPT pages and handles:

* Account detection
* Email detection
* Usage detection
* Reset information
* ChatGPT settings page detection
* Communication with the popup

---

## 🔐 Privacy

Codex Account Manager is designed to keep account monitoring data locally in the browser.

The extension does **not** require users to enter their:

* ChatGPT password
* Authentication credentials
* API keys

The extension reads information displayed on supported ChatGPT settings pages to provide account and usage monitoring.

Account data is stored using:

```javascript
chrome.storage.local
```

No external backend is required by the extension.

> **Note:** Users should review the source code and permissions before installing any browser extension.

---

## 🛠️ Technologies

* HTML5
* CSS3
* JavaScript
* Chrome Extensions API
* Manifest V3
* Chrome Storage API
* Chrome Tabs API

---

## 🎯 Project Goals

This project was created to make it easier to manage and monitor Codex usage when working with multiple ChatGPT accounts.

Instead of manually checking each account, the extension provides a single dashboard showing:

```text
Account
   ↓
Usage
   ↓
Status
   ↓
Reset Countdown
```

---

## 🗺️ Roadmap

Potential future improvements:

* [ ] Better account-switch detection
* [ ] Usage history
* [ ] Usage statistics
* [ ] Notifications when an account becomes available
* [ ] Custom account labels
* [ ] Export/import account data
* [ ] Dark mode
* [ ] Automatic periodic usage refresh
* [ ] Improved account detection
* [ ] Chrome Web Store release

---

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

### Development workflow

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/my-feature
```

3. Make your changes.
4. Test the extension in Chrome.
5. Commit your changes.

```bash
git commit -m "Add my feature"
```

6. Push the branch.

```bash
git push origin feature/my-feature
```

7. Open a Pull Request.

---

## ⚠️ Disclaimer

Codex Account Manager is an independent, community-developed browser extension.

It is **not affiliated with, endorsed by, or sponsored by OpenAI or ChatGPT**.

The extension is provided for personal and educational use.

Changes to the ChatGPT interface or settings pages may affect account and usage detection.

---

## 👨‍💻 Author

**MD. Mehedi Hasan Nayem**

Technical Project Coordinator | Software & SaaS

* Portfolio: [mnym.me](https://mnym.me)
* GitHub: [github.com/mehedi-nym](https://github.com/mehedi-nym)
* LinkedIn: [linkedin.com/in/mehedi-nym](https://linkedin.com/in/mehedi-nym)

---

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

If you discover a bug or have an improvement idea, feel free to open an issue.
