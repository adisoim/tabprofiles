/* global chrome */

let profiles = {};
let currentProfile = null;
let originalTabs = null;

function loadProfiles() {
  return new Promise((resolve) => {
    chrome.storage.local.get("profiles", async (data) => {
      profiles = data.profiles || {};

      // Clear active flags for all profiles on startup
      Object.keys(profiles).forEach((name) => {
        profiles[name].active = false;
      });

      currentProfile = null;
      originalTabs = null;

      // Save updated profiles back to storage to reflect no active profile
      await chrome.storage.local.set({ profiles });

      resolve();
    });
  });
}

chrome.runtime.onStartup.addListener(() => {
  profiles = {};
  currentProfile = null;
  originalTabs = null;
  loadProfiles();
});

chrome.runtime.onInstalled.addListener(() => {
  profiles = {};
  currentProfile = null;
  originalTabs = null;
  loadProfiles();
});

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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
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

      case "activateProfile":
        if (!profiles[msg.name] || currentProfile === msg.name) {
          sendResponse({
            success: false,
            error: "Invalid profile or already active",
          });
          break;
        }

        if (currentProfile === null) {
          originalTabs = await captureCurrentTabs();
        }

        currentProfile = msg.name;

        // Mark profiles active/inactive properly
        Object.keys(profiles).forEach((name) => {
          profiles[name].active = name === currentProfile;
        });

        await openTabSet(profiles[currentProfile].tabs);
        await chrome.storage.local.set({ profiles });
        sendResponse({ success: true });
        break;

      case "deactivateProfile":
        if (currentProfile === null) {
          sendResponse({
            success: false,
            error: "No active profile to deactivate",
          });
          break;
        }

        profiles[currentProfile].tabs = await captureCurrentTabs();
        profiles[currentProfile].active = false;

        await openTabSet(originalTabs || []);
        currentProfile = null;
        originalTabs = null;
        await chrome.storage.local.set({ profiles });
        sendResponse({ success: true });
        break;

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
