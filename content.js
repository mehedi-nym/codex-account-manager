const STORAGE_KEY = "codexAccounts";
const MONITOR_KEY = "monitoring";
const ACTIVE_ACCOUNT_KEY = "activeAccountId";
const CAPTURE_RUN_KEY = "captureRunId";

console.log("[Codex Manager] Content script loaded:", window.location.href);


/* =========================================
   PAGE DETECTION
========================================= */

function getCurrentPage() {
    const url = new URL(window.location.href);

    const hash = url.hash.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (
        hash.includes("settings/account") ||
        pathname === "/settings/account" ||
        pathname.startsWith("/settings/account/")
    ) {
        return "account";
    }

    if (
        hash.includes("settings/usage") ||
        pathname === "/settings/usage" ||
        pathname.startsWith("/settings/usage/")
    ) {
        return "usage";
    }

    return null;
}


/* =========================================
   ACCOUNT PAGE
========================================= */

async function scanAccountPage() {

    if (getCurrentPage() !== "account") {
        return false;
    }

    console.log("[Codex Manager] Scanning Account page...");

    let name = null;
    let email = null;


    /* =========================================
       FIND NAME FROM INPUT FIELD
    ========================================= */

    const namePattern = /(^|\s)(display\s+name|full\s+name|name|username)(\s|$)/i;
    const labels = Array.from(document.querySelectorAll("label"));

    for (const label of labels) {
        if (!namePattern.test(label.textContent?.trim() || "")) continue;
        const control = label.htmlFor
            ? document.getElementById(label.htmlFor)
            : label.querySelector("input, textarea");
        if (control?.value?.trim()) {
            name = control.value.trim();
            break;
        }
    }

    if (!name) {
        const input = Array.from(document.querySelectorAll("input, textarea")).find(element => {
            const value = element.value?.trim();
            const metadata = [
                element.getAttribute("aria-label"),
                element.getAttribute("placeholder"),
                element.getAttribute("name"),
                element.getAttribute("id")
            ].filter(Boolean).join(" ").replace(/[-_]/g, " ").trim();
            return value && namePattern.test(metadata);
        });
        name = input?.value?.trim() || null;
    }


    /* =========================================
       FIND EMAIL
    ========================================= */

    const emailInput = document.querySelector('input[type="email"]');
    email = emailInput?.value?.trim() || null;

    const pageText = document.body?.innerText || "";
    const emailMatches = pageText.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];

    if (!email && emailMatches.length) {
        email = emailMatches[0];
    }


    /* =========================================
       DEBUG
    ========================================= */

    console.log(
        "[Codex Manager] ACCOUNT DETECTED:",
        {
            name,
            email
        }
    );


    if (!name && !email) {

        console.log(
            "[Codex Manager] Could not detect account identity."
        );

        return;
    }


    /* =========================================
       SAVE ACCOUNT
    ========================================= */

    const result = await chrome.storage.local.get([
        STORAGE_KEY,
        ACTIVE_ACCOUNT_KEY,
        MONITOR_KEY,
        CAPTURE_RUN_KEY
    ]);

    const accounts = result[STORAGE_KEY] || [];


    /*
     * Email is the stable account identifier.
     */

    const accountId =
        email ||
        name ||
        "unknown-chatgpt-account";


    let existingIndex = accounts.findIndex(account => account.id === accountId);
    if (existingIndex < 0 && email) {
        existingIndex = accounts.findIndex(account => account.email === email);
    }


    if (existingIndex >= 0) {

        accounts[existingIndex] = {
            ...accounts[existingIndex],
            id: accountId,

            name: accounts[existingIndex].nameEdited
                ? accounts[existingIndex].name
                : (name || accounts[existingIndex].name),

            email:
                email ||
                accounts[existingIndex].email,

            lastUpdated: Date.now()
        };

    } else {

        accounts.push({

            id: accountId,

            name:
                name ||
                "ChatGPT Account",

            email:
                email || null,

            remaining: null,

            resetAt: null,

            lastUpdated: Date.now()

        });
    }


    const savedAccount = accounts[existingIndex >= 0 ? existingIndex : accounts.length - 1];
    await chrome.storage.local.set({
        [STORAGE_KEY]: accounts,
        [ACTIVE_ACCOUNT_KEY]: savedAccount.id
    });


    console.log(
        "[Codex Manager] Account identity saved:",
        {
            name,
            email
        }
    );

    if (result[MONITOR_KEY] === true && result[CAPTURE_RUN_KEY]) {
        setTimeout(async () => {
            const state = await chrome.storage.local.get([
                MONITOR_KEY,
                CAPTURE_RUN_KEY
            ]);
            if (
                getCurrentPage() === "account" &&
                state[MONITOR_KEY] === true &&
                state[CAPTURE_RUN_KEY] === result[CAPTURE_RUN_KEY]
            ) {
                window.location.href =
                    `${window.location.origin}/settings/usage?tab=overview`;
            }
        }, 250);
    }

    return true;
}


/* =========================================
   USAGE PAGE
========================================= */

async function scanUsagePage() {

    if (getCurrentPage() !== "usage") {
        return false;
    }

    console.log("[Codex Manager] Scanning Usage page...");

    const text = document.body?.innerText || "";


    /* -----------------------------------------
       Remaining percentage
    ----------------------------------------- */

    let remaining = null;

    const leftMatch = text.match(/(\d{1,3})\s*%\s*(?:left|remaining)/i);

    if (leftMatch) {
        remaining = Number(leftMatch[1]);
    }


    /* -----------------------------------------
       Reset countdown
    ----------------------------------------- */

    let resetText = null;

    const resetMatch = text.match(/Resets?\s+in\s+([^\n]+)/i);

    if (resetMatch) {

        resetText = resetMatch[1].trim();
    }


    /* -----------------------------------------
       Convert countdown to timestamp
    ----------------------------------------- */

    let resetAt = null;

    if (resetText) {

        const days = Number(
            (resetText.match(/(\d+)\s*d(?:ays?)?/i) || [0, 0])[1]
        );

        const hours = Number(
            (resetText.match(/(\d+)\s*h(?:ours?)?/i) || [0, 0])[1]
        );

        const minutes = Number(
            (resetText.match(/(\d+)\s*m(?:in(?:utes?)?)?/i) || [0, 0])[1]
        );


        const milliseconds =
            (
                days * 86400 +
                hours * 3600 +
                minutes * 60
            ) * 1000;


        resetAt = Date.now() + milliseconds;
    }


    console.log("[Codex Manager] USAGE DETECTED:", {
        remaining,
        resetText,
        resetAt
    });


    /* -----------------------------------------
       Get existing accounts
    ----------------------------------------- */

    const result = await chrome.storage.local.get([
        STORAGE_KEY,
        ACTIVE_ACCOUNT_KEY,
        MONITOR_KEY,
        CAPTURE_RUN_KEY
    ]);

    const accounts = result[STORAGE_KEY] || [];


    /*
     * Find account that already has identity.
     */

    if (!accounts.length) {

        console.log(
            "[Codex Manager] No account identity found yet."
        );

        return false;
    }


    const activeAccountId = result[ACTIVE_ACCOUNT_KEY];
    const account = accounts.find(item => item.id === activeAccountId);


    if (!account || !activeAccountId) {
        console.log("[Codex Manager] Usage ignored: no matching active account.");
        return false;
    }

    if (result[CAPTURE_RUN_KEY] && result[MONITOR_KEY] !== true) {
        console.log("[Codex Manager] Capture stopped before Usage completed.");
        return false;
    }

    if (remaining === null || !resetAt) {
        console.log("[Codex Manager] Usage is still loading; keeping capture active.");
        return false;
    }


    account.remaining = remaining;


    if (resetAt) {
        account.resetAt = resetAt;
    }


    account.lastUpdated = Date.now();


    const updates = { [STORAGE_KEY]: accounts };
    if (result[CAPTURE_RUN_KEY]) {
        updates[MONITOR_KEY] = false;
        updates[CAPTURE_RUN_KEY] = null;
    }
    await chrome.storage.local.set(updates);


    console.log(
        "[Codex Manager] Usage saved for:",
        account.email || account.name
    );

    return remaining !== null || resetAt !== null;
}


/* =========================================
   NAVIGATION
========================================= */

let lastUrl = window.location.href;

async function scanPageWhenReady(page, attempt = 0) {
    if (getCurrentPage() !== page) return false;

    const captured = page === "account"
        ? await scanAccountPage()
        : await scanUsagePage();

    if (captured || attempt >= 20) return captured;

    await new Promise(resolve => setTimeout(resolve, 500));
    return scanPageWhenReady(page, attempt + 1);
}


function handleNavigation() {

    const currentUrl = window.location.href;

    if (currentUrl === lastUrl) {
        return;
    }


    console.log(
        "[Codex Manager] URL CHANGED:",
        currentUrl
    );


    lastUrl = currentUrl;


    const page = getCurrentPage();


    if (page === "account") {

        setTimeout(() => scanPageWhenReady(page), 250);

    }


    if (page === "usage") {

        setTimeout(() => scanPageWhenReady(page), 250);
    }
}


window.addEventListener(
    "hashchange",
    handleNavigation
);


setInterval(
    handleNavigation,
    1000
);


/* =========================================
   POPUP REFRESH MESSAGE
========================================= */

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message?.action === "scanNow") {

            const page = getCurrentPage();


            let scanPromise;


            if (page === "account") {

                scanPromise = scanPageWhenReady(page);

            } else if (page === "usage") {

                scanPromise = scanPageWhenReady(page);

            } else {

                scanPromise = Promise.resolve();

            }


            scanPromise
                .then(() => {
                    sendResponse({
                        success: true
                    });
                })
                .catch(error => {

                    console.error(
                        "[Codex Manager] Scan error:",
                        error
                    );

                    sendResponse({
                        success: false,
                        error: error.message
                    });
                });


            return true;
        }
    }
);


/* =========================================
   INITIAL SCAN
========================================= */

setTimeout(() => {

    const page = getCurrentPage();

    if (page === "account") {
        scanPageWhenReady(page);
    }

    if (page === "usage") {
        scanPageWhenReady(page);
    }

}, 250);
