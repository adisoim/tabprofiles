/* global chrome */

let profiles = {};
let currentProfile = null;
let originalTabs = null;
let sessionTabsMap = {};

function loadProfiles() {
  return new Promise((resolve) => {
    chrome.storage.local.get("profiles", async (data) => {
      currentProfile = null;
      originalTabs = null;
      sessionTabsMap = {};

      profiles = data.profiles || {};

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
          const tabs = await captureCurrentTabs();
          sessionTabsMap[currentProfile] = tabs;
        } else {
          originalTabs = await captureCurrentTabs();
        }

        currentProfile = msg.name;

        const tabsToOpen =
          sessionTabsMap[currentProfile] || profiles[currentProfile].tabs || [];

        delete sessionTabsMap[currentProfile];

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

        const tabs = await captureCurrentTabs();
        sessionTabsMap[currentProfile] = tabs;

        profiles[currentProfile].active = false;
        currentProfile = null;

        await openTabSet(originalTabs || []);

        originalTabs = null;

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

  return true;
});
