/* global chrome */

let profiles = {};
let currentProfile = null;
let originalTabs = null; // Save tabs before first profile activation
let sessionTabsMap = {}; // In-memory only, not persisted

function loadProfiles() {
  return new Promise((resolve) => {
    chrome.storage.local.get("profiles", async (data) => {
      currentProfile = null;
      originalTabs = null;
      sessionTabsMap = {}; // Clear in-memory session tabs on load/restart

      profiles = data.profiles || {};

      // Clear active flags for all profiles on startup
      Object.keys(profiles).forEach((name) => {
        profiles[name].active = false;
      });

      await chrome.storage.local.set({ profiles });

      resolve();
    });
  });
}

function captureCurrentTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      resolve(tabs.map((t) => ({ url: t.url, pinned: t.pinned })));
    });
  });
}

function openTabSet(tabSet) {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const [firstTab, ...restTabs] = tabs;
        const tabIds = restTabs.map((t) => t.id);
        chrome.tabs.remove(tabIds, () => {
          chrome.tabs.update(
            firstTab.id,
            { url: tabSet[0]?.url || "chrome://newtab/" },
            () => {
              for (let i = 1; i < tabSet.length; i++) {
                chrome.tabs.create({
                  url: tabSet[i].url,
                  pinned: tabSet[i].pinned,
                });
              }
              resolve();
            }
          );
        });
      } else {
        // no tabs open, just create them all
        for (const { url, pinned } of tabSet) {
          chrome.tabs.create({ url, pinned });
        }
        resolve();
      }
    });
  });
}

chrome.runtime.onStartup.addListener(async () => {
  currentProfile = null;
  originalTabs = null;
  sessionTabsMap = {};
  await loadProfiles();
});

chrome.runtime.onInstalled.addListener(async () => {
  currentProfile = null;
  originalTabs = null;
  sessionTabsMap = {};
  await loadProfiles();
});

// ... captureCurrentTabs and openTabSet remain unchanged

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const data = await chrome.storage.local.get("profiles");
    profiles = data.profiles || {};
    currentProfile =
      Object.keys(profiles).find((name) => profiles[name].active) || null;

    switch (msg.action) {
      case "createProfile":
        if (msg.name && !profiles[msg.name]) {
          profiles[msg.name] = { tabs: [], active: false };
          await chrome.storage.local.set({ profiles });
          sendResponse({ success: true });
        } else {
          sendResponse({
            success: false,
            error: "Profile name missing or already exists",
          });
        }
        break;

      case "setProfileTabs":
        if (msg.name && profiles[msg.name]) {
          profiles[msg.name].tabs = msg.tabs;
          await chrome.storage.local.set({ profiles });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Profile not found" });
        }
        break;

      case "activateProfile": {
        if (!profiles[msg.name] || currentProfile === msg.name) {
          sendResponse({
            success: false,
            error: "Invalid profile or already active",
          });
          break;
        }

        if (currentProfile !== null) {
          // Save current tabs including extras for the old active profile in memory only
          const tabs = await captureCurrentTabs();
          sessionTabsMap[currentProfile] = tabs;
        } else {
          // First activation in this session, save original tabs
          originalTabs = await captureCurrentTabs();
        }

        currentProfile = msg.name;

        // Choose tabs to open:
        // Use sessionTabs saved in memory for this profile if it exists, otherwise use saved tabs
        const tabsToOpen =
          sessionTabsMap[currentProfile] || profiles[currentProfile].tabs || [];

        // Clear sessionTabs for this profile in memory because we're opening them now
        delete sessionTabsMap[currentProfile];

        // Update active flags
        Object.keys(profiles).forEach((name) => {
          profiles[name].active = name === currentProfile;
        });

        await openTabSet(tabsToOpen);
        await chrome.storage.local.set({ profiles });
        sendResponse({ success: true });
        break;
      }

      case "deactivateProfile": {
        if (currentProfile === null) {
          sendResponse({
            success: false,
            error: "No active profile to deactivate",
          });
          break;
        }

        // Save current tabs including extras for the active profile before deactivation in memory only
        const tabs = await captureCurrentTabs();
        sessionTabsMap[currentProfile] = tabs;

        profiles[currentProfile].active = false;
        currentProfile = null;

        // Restore original tabs from before any profile activation
        await openTabSet(originalTabs || []);

        originalTabs = null; // clear after restoring

        await chrome.storage.local.set({ profiles });
        sendResponse({ success: true });
        break;
      }

      case "getState":
        sendResponse({
          profiles: Object.keys(profiles).map((name) => ({
            name,
            active: profiles[name].active || false,
            tabs: profiles[name].tabs || [],
          })),
          currentProfile,
        });
        break;

      case "deleteProfile":
        if (msg.name && profiles[msg.name]) {
          if (currentProfile === msg.name) {
            profiles[msg.name].active = false;
            currentProfile = null;
            originalTabs = null;
          }
          delete profiles[msg.name];
          await chrome.storage.local.set({ profiles });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Profile not found" });
        }
        break;

      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
  })();

  return true; // keep message channel open for async response
});
