const STORAGE_KEY = "codexAccounts";
const MONITOR_KEY = "monitoring";
const ACTIVE_ACCOUNT_KEY = "activeAccountId";
const CAPTURE_RUN_KEY = "captureRunId";
const WELCOME_KEY = "welcomeSeen";


// ========================================
// INITIALIZE
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadMonitoringState();

        await renderAccounts();

        await showWelcomeIfNeeded();


        document
            .getElementById("startButton")
            .addEventListener(
                "click",
                toggleMonitoring
            );


        document
            .getElementById("refreshButton")
            .addEventListener(
                "click",
                refresh
            );

        document
            .getElementById("syncButton")
            .addEventListener("click", syncActiveAccount);

        document
            .getElementById("welcomeButton")
            .addEventListener("click", dismissWelcome);

        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "local") return;
            if (changes[STORAGE_KEY] || changes[ACTIVE_ACCOUNT_KEY] || changes[MONITOR_KEY]) {
                renderAccounts();
            }
        });


        setInterval(
            renderAccounts,
            1000
        );

    }
);

async function showWelcomeIfNeeded() {
    const result = await chrome.storage.local.get(WELCOME_KEY);
    document.getElementById("welcomeScreen").hidden = result[WELCOME_KEY] === true;
}

async function dismissWelcome() {
    await chrome.storage.local.set({ [WELCOME_KEY]: true });
    document.getElementById("welcomeScreen").hidden = true;
}


// ========================================
// MONITORING STATE
// ========================================

async function loadMonitoringState() {

    const result =
        await chrome.storage.local.get(
            MONITOR_KEY
        );


    const monitoring =
        result[MONITOR_KEY] === true;


    updateMonitoringUI(
        monitoring
    );

}


// ========================================
// TOGGLE MONITORING
// ========================================

async function toggleMonitoring() {

    const result =
        await chrome.storage.local.get(
            MONITOR_KEY
        );


    const current =
        result[MONITOR_KEY] === true;


    const newState =
        !current;


    if (newState) {
        await startCapture();
        return;
    }

    await chrome.storage.local.set({
        [MONITOR_KEY]: false,
        [CAPTURE_RUN_KEY]: null
    });
    await renderAccounts();

}

async function startCapture() {
    await chrome.storage.local.set({
        [MONITOR_KEY]: true,
        [CAPTURE_RUN_KEY]: String(Date.now())
    });
    await renderAccounts();
    await openChatGPTAccountSettings();
}

async function syncActiveAccount() {
    // Re-check Account first so switching from account 1 to account 2
    // cannot write account 2's Usage data into account 1.
    await startCapture();
}

async function openChatGPTAccountSettings() {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const tab = tabs[0];
    const currentUrl = tab?.url ? new URL(tab.url) : null;
    const isChatGPT = currentUrl &&
        (currentUrl.hostname === "chatgpt.com" ||
         currentUrl.hostname.endsWith(".chatgpt.com") ||
         currentUrl.hostname === "chat.openai.com");

    const origin = isChatGPT
        ? currentUrl.origin
        : "https://chatgpt.com";
    const accountUrl = `${origin}/settings/account`;

    if (tab?.id) {
        await chrome.tabs.update(tab.id, { url: accountUrl });
    } else {
        await chrome.tabs.create({ url: accountUrl, active: true });
    }
}

// ========================================
// UPDATE MONITORING UI
// ========================================

function updateMonitoringUI(active) {

    const button =
        document.getElementById(
            "startButton"
        );


    const dot =
        document.getElementById(
            "monitorStatus"
        );


    if (active) {

        button.textContent =
            "Stop Capture";
        button.disabled = false;


        button.style.background =
            "#b91c1c";


        dot.classList.add(
            "active"
        );


        dot.title =
            "Monitoring active";

    }

    else {

        button.disabled = false;


        button.style.background =
            "#111827";


        dot.classList.remove(
            "active"
        );


        dot.title =
            "Monitoring inactive";

    }

}


// ========================================
// REFRESH
// ========================================

async function refresh() {

    const tabs =
        await chrome.tabs.query({

            active:
                true,

            currentWindow:
                true

        });


    if (!tabs.length) {
        return;
    }


    const tab =
        tabs[0];


    if (!tab.id) {
        return;
    }


    try {

        await chrome.tabs.sendMessage(
            tab.id,
            {
                action: "scanNow"
            }
        );

    }

    catch (error) {

        console.log(
            "[Codex Manager] Refresh:",
            error.message
        );

    }


    await renderAccounts();

}


// ========================================
// RENDER ACCOUNTS
// ========================================

async function renderAccounts() {

    const result = await chrome.storage.local.get([
        STORAGE_KEY,
        ACTIVE_ACCOUNT_KEY,
        MONITOR_KEY
    ]);


    const accounts = result[STORAGE_KEY] || [];
    const activeAccountId = result[ACTIVE_ACCOUNT_KEY] || null;

    updateCaptureControls(result[MONITOR_KEY] === true, accounts);


    updateSummary(
        accounts
    );

    await updateActiveSession(accounts, activeAccountId);


    const container =
        document.getElementById(
            "accountsContainer"
        );


    if (!accounts.length) {

        container.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    👤
                </div>

                <h2>No accounts detected</h2>

                <p>
                    Start monitoring, then open
                    ChatGPT Usage.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = "";


    accounts.forEach(
        account => {

            const remaining =
                Number(
                    account.remaining
                );

            const effectiveRemaining =
                getEffectiveRemaining(
                    remaining,
                    account.resetAt
                );


            const status =
                getStatus(
                    effectiveRemaining
                );


            const resetText =
                getResetText(
                    account.resetAt
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "account";


            card.innerHTML = `

                <div class="account-top">

                    <div>

                        <div class="account-info">
                        <div class="account-name">
                            ${escapeHTML(
                                account.name ||
                                "ChatGPT Account"
                            )}
                        </div>

                        <div class="account-id">
                            ${escapeHTML(
                                account.email ||
                                account.id ||
                                "Unknown account"
                            )}
                        </div>
                        </div>

                    </div>

                    <span
                        class="badge ${status.className}"
                    >
                        ${status.text}
                    </span>

                </div>


                <div class="usage">

                    <div class="usage-header">

                        <span>
                            Usage remaining
                        </span>

                        <strong>
                            ${
                                Number.isFinite(
                                    effectiveRemaining
                                )
                                    ? effectiveRemaining + "%"
                                    : "Unknown"
                            }
                        </strong>

                    </div>


                    <div class="progress">

                        <div
                            class="progress-bar"
                            style="
                                width:
                                ${
                                    Number.isFinite(
                                        effectiveRemaining
                                    )
                                        ? Math.max(
                                            0,
                                            Math.min(
                                                100,
                                                effectiveRemaining
                                            )
                                        )
                                        : 0
                                }%
                            "
                        ></div>

                    </div>

                </div>


                <div class="account-bottom">

                    <div class="reset">

                    <span>
                        Resets in
                    </span>

                    <span class="reset-value">
                        ${resetText}
                    </span>

                    </div>

                    <div class="account-actions">
                        <button class="edit-button" data-action="edit" data-account-id="${escapeHTML(account.id)}" title="Edit account name">Edit</button>
                        <button class="delete-button" data-action="delete" data-account-id="${escapeHTML(account.id)}" title="Delete account">Delete</button>
                    </div>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

    container.querySelectorAll("button[data-action]").forEach(button => {
        button.addEventListener("click", () => {
            const accountId = button.dataset.accountId;
            if (button.dataset.action === "edit") editAccount(accountId);
            if (button.dataset.action === "delete") deleteAccount(accountId);
        });
    });


    document.getElementById(
        "lastUpdated"
    ).textContent =
        "Last updated: " +
        new Date().toLocaleTimeString();

}


// ========================================
// STATUS
// ========================================

function getStatus(remaining) {

    if (
        !Number.isFinite(
            remaining
        )
    ) {

        return {

            text:
                "UNKNOWN",

            className:
                "unknown"

        };

    }


    if (remaining <= 0) {

        return {

            text:
                "EXHAUSTED",

            className:
                "exhausted"

        };

    }


    if (remaining <= 20) {

        return {

            text:
                "LOW",

            className:
                "low"

        };

    }


    return {

        text:
            "AVAILABLE",

        className:
            "available"

    };

}

function getEffectiveRemaining(remaining, resetAt) {
    if (
        Number.isFinite(remaining) &&
        resetAt &&
        new Date(resetAt).getTime() <= Date.now()
    ) {
        return 100;
    }

    return remaining;
}


// ========================================
// COUNTDOWN
// ========================================

function getResetText(resetAt) {

    if (!resetAt) {

        return "Not detected";

    }


    const difference =
        new Date(resetAt).getTime() -
        Date.now();


    if (difference <= 0) {
        const nextReset = new Date(resetAt);

        while (nextReset.getTime() <= Date.now()) {
            nextReset.setMonth(nextReset.getMonth() + 1);
        }

        return nextReset.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short"
        });

    }


    const seconds =
        Math.floor(
            difference / 1000
        );


    const days =
        Math.floor(
            seconds / 86400
        );


    const hours =
        Math.floor(
            (seconds % 86400) /
            3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) /
            60
        );


    if (days > 0) {

        return `${days}d ${hours}h`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    return `${minutes}m`;

}


// ========================================
// SUMMARY
// ========================================

function updateSummary(accounts) {

    let available = 0;

    let low = 0;

    let exhausted = 0;


    accounts.forEach(
        account => {

            const status =
                getStatus(
                    getEffectiveRemaining(
                        Number(account.remaining),
                        account.resetAt
                    )
                );


            if (
                status.className ===
                "available"
            ) {

                available++;

            }

            else if (
                status.className ===
                "low"
            ) {

                low++;

            }

            else if (
                status.className ===
                "exhausted"
            ) {

                exhausted++;

            }

        }
    );


    document.getElementById(
        "totalAccounts"
    ).textContent =
        accounts.length;


    document.getElementById(
        "availableAccounts"
    ).textContent =
        available;


    document.getElementById(
        "lowAccounts"
    ).textContent =
        low;


    document.getElementById(
        "exhaustedAccounts"
    ).textContent =
        exhausted;

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}

async function updateActiveSession(
    accounts,
    activeAccountId
) {

    const nameElement =
        document.getElementById(
            "activeSessionName"
        );

    const idElement =
        document.getElementById(
            "activeSessionId"
        );

    const statusElement =
        document.getElementById(
            "activeSessionStatus"
        );


    const account = accounts.find(
        item => item.id === activeAccountId
    );


    if (!account) {

        nameElement.textContent =
            "No active session";

        idElement.textContent =
            "Open ChatGPT to detect account";

        statusElement.textContent = "—";

        return;
    }


    nameElement.textContent =
        account.name ||
        "ChatGPT Account";


    idElement.textContent =
        account.email ||
        account.id ||
        "Unknown";


    const status =
        getStatus(
            getEffectiveRemaining(
                Number(account.remaining),
                account.resetAt
            )
        );


    const remaining = getEffectiveRemaining(
        Number(account.remaining),
        account.resetAt
    );
    statusElement.className = `session-status ${status.className}`;
    statusElement.textContent = Number.isFinite(remaining)
        ? `${status.text} · ${remaining}%`
        : status.text;
}

function updateCaptureControls(active, accounts) {
    const startButton = document.getElementById("startButton");
    const syncButton = document.getElementById("syncButton");
    const hasAccounts = accounts.length > 0;

    updateMonitoringUI(active);
    updateCaptureProgress(active);

    if (active) {
        startButton.textContent = "Stop Capture";
        syncButton.hidden = true;
        return;
    }

    startButton.textContent = hasAccounts
        ? "Capture Another"
        : "Start Monitoring";
    syncButton.textContent = "Verify & Sync";
    syncButton.hidden = !hasAccounts;
}

function updateCaptureProgress(active) {
    document.body.classList.toggle("capture-active", active);
    document.getElementById("captureProgress").hidden = !active;
}

async function editAccount(accountId) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const accounts = result[STORAGE_KEY] || [];
    const account = accounts.find(item => item.id === accountId);
    if (!account) return;

    const nextName = window.prompt("Account display name", account.name || "ChatGPT Account");
    if (nextName === null) return;

    const name = nextName.trim();
    if (!name) return;

    account.name = name;
    account.nameEdited = true;
    await chrome.storage.local.set({ [STORAGE_KEY]: accounts });
    await renderAccounts();
}


async function deleteAccount(accountId) {

    const result =
        await chrome.storage.local.get([
            STORAGE_KEY,
            "activeAccountId"
        ]);


    let accounts =
        result[STORAGE_KEY] || [];


    accounts =
        accounts.filter(
            account =>
                account.id !== accountId
        );


    const updates = {
        [STORAGE_KEY]: accounts
    };


    if (
        result.activeAccountId === accountId
    ) {

        updates.activeAccountId = null;
    }


    await chrome.storage.local.set(
        updates
    );


    await renderAccounts();
}
