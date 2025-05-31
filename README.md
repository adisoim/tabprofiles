#Tab Profiles Chrome Extension
Overview
This Chrome extension allows users to create, save, activate, and manage sets of browser tabs under named "profiles". It’s designed for users who work on different tasks or projects and want to easily switch between relevant sets of tabs.

This document describes the functionality, architecture, and usage of the extension as part of section D of the project.

Features
Create named tab profiles

Save current tabs to a profile

Activate a profile (closes current tabs, opens profile tabs)

Deactivate a profile (restores tabs from before activation)

Edit profile tab URLs

Delete profiles

Persistent profile storage using chrome.storage.local

Installation (Development Mode)
Clone or download this repository.

In Chrome, go to chrome://extensions/.

Enable Developer Mode (top-right).

Click Load unpacked.

Select the folder containing the extension source.

The extension will appear in your toolbar and be ready to use.

Usage Examples
Example 1: Creating and Activating a Profile
Open the extension popup.

Enter a name in the New profile name field (e.g., Work).

Click Create.

Click Activate on the new profile.

This saves your current open tabs under the Work profile and opens them.

The previous session's tabs are stored and restored on deactivation.

Example 2: Editing a Profile
Click Show Links on a profile.

Modify URLs in the list or add new ones using + Add Link.

Click Save Links to update the profile's tab set.

Example 3: Switching Between Profiles
Activate a profile (e.g., Study).

Work within those tabs.

Click Deactivate to return to your previous session.

Activate another profile (e.g., Entertainment) to switch tasks.

Architecture Overview
Background Script
Handles profile logic:

Loads and initializes profile data on startup/install.

Responds to messages (e.g., activateProfile, createProfile).

Manages tab querying and manipulation using Chrome Tabs API.

Stores and updates data via chrome.storage.local.

Popup (UI)
Built with React + Material UI:

Displays profiles and status.

Allows interaction (create, activate, delete, edit).

Syncs with background via chrome.runtime.sendMessage.

Known Behavior
On Chrome restart, all profile states are reset to inactive.

This is intentional: no profile is automatically reactivated.

If tabs seem to disappear temporarily, reloading the extension or opening the popup usually triggers a state fetch and refresh.

Future Improvements
Allow custom icons or colors per profile

Add optional auto-save of open tabs periodically

Enable keyboard shortcuts for profile switching

Cloud sync (optional) for profiles across devices
