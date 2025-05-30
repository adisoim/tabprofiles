/* global chrome */
import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedProfile, setExpandedProfile] = useState(null);
  const [editingLinks, setEditingLinks] = useState([]);

  const fetchState = () => {
    chrome.runtime.sendMessage({ action: "getState" }, (response) => {
      if (response) {
        setProfiles(response.profiles);
        setCurrentProfile(response.currentProfile);
        setIsLoading(false);
        setExpandedProfile(null);
        setEditingLinks([]);
      }
    });
  };

  useEffect(() => {
    fetchState();
  }, []);

  const createProfile = () => {
    const trimmedName = newProfileName.trim();
    if (!trimmedName) return;

    setIsLoading(true);

    setProfiles((prev) => [...prev, { name: trimmedName, active: false }]);
    setNewProfileName("");

    chrome.runtime.sendMessage(
      { action: "createProfile", name: trimmedName },
      () => {
        fetchState();
        setIsLoading(false);
      }
    );
  };

  const activateProfile = (name) => {
    setIsLoading(true);

    setCurrentProfile(name);
    setProfiles((prev) => prev.map((p) => ({ ...p, active: p.name === name })));

    chrome.runtime.sendMessage({ action: "activateProfile", name }, fetchState);
  };

  const deactivateProfile = () => {
    setIsLoading(true);

    setCurrentProfile(null);
    setProfiles((prev) => prev.map((p) => ({ ...p, active: false })));

    chrome.runtime.sendMessage({ action: "deactivateProfile" }, fetchState);
  };

  const deleteProfile = (name) => {
    if (
      !window.confirm(`Delete profile "${name}"? This action cannot be undone.`)
    ) {
      return;
    }

    setIsLoading(true);

    setProfiles((prev) => prev.filter((p) => p.name !== name));

    if (currentProfile === name) {
      setCurrentProfile(null);
    }

    chrome.runtime.sendMessage({ action: "deleteProfile", name }, () => {
      fetchState();
      setIsLoading(false);
    });
  };

  const toggleLinks = (name) => {
    if (expandedProfile === name) {
      setExpandedProfile(null);
      setEditingLinks([]);
    } else {
      const prof = profiles.find((p) => p.name === name);
      setExpandedProfile(name);

      const links = prof?.tabs?.length ? prof.tabs.map((tab) => tab.url) : [];
      setEditingLinks(links);
    }
  };

  const updateLink = (index, newUrl) => {
    setEditingLinks((prev) => {
      const copy = [...prev];
      copy[index] = newUrl;
      return copy;
    });
  };

  const addLink = () => {
    setEditingLinks((prev) => [...prev, ""]);
  };

  const deleteLink = (index) => {
    setEditingLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const saveLinks = () => {
    if (!expandedProfile) return;

    const tabs = editingLinks
      .filter((url) => typeof url === "string" && url.trim() !== "")
      .map((url) => ({ url: url.trim(), pinned: false }));

    setIsLoading(true);
    chrome.runtime.sendMessage(
      { action: "setProfileTabs", name: expandedProfile, tabs },
      (response) => {
        if (response?.success) {
          fetchState();
        } else {
          alert("Failed to save links: " + response?.error);
          setIsLoading(false);
        }
      }
    );
  };

  return (
    <div id="root">
      <h2>Tab Profiles</h2>

      <div className="new-profile-container">
        <input
          className="new-profile-input"
          placeholder="New profile name"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createProfile()}
          disabled={isLoading}
        />
        <button
          onClick={createProfile}
          disabled={isLoading || !newProfileName.trim()}
        >
          Create
        </button>
      </div>

      <div className="profiles-container">
        <strong>Profiles:</strong>
        {profiles.length === 0 ? (
          <p>No profiles</p>
        ) : (
          <ul>
            {profiles.map((p) => (
              <li key={p.name} className="profile-item">
                <div className="profile-row">
                  <div className="profile-name">{p.name}</div>
                  <div className="profile-buttons">
                    {p.active ? (
                      <button onClick={deactivateProfile}>Deactivate</button>
                    ) : (
                      <button onClick={() => activateProfile(p.name)}>
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => deleteProfile(p.name)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                    <button onClick={() => toggleLinks(p.name)}>
                      Show Links
                    </button>
                  </div>
                </div>

                {expandedProfile === p.name && (
                  <div className="links-editor">
                    <strong>Links:</strong>
                    {editingLinks.length === 0 && (
                      <p style={{ fontStyle: "italic" }}>No links yet</p>
                    )}
                    <ul className="links-list">
                      {editingLinks.map((url, i) => (
                        <li key={i}>
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => updateLink(i, e.target.value)}
                            disabled={isLoading}
                            placeholder="Tab URL"
                          />
                          <button
                            onClick={() => deleteLink(i)}
                            disabled={isLoading}
                            className="delete-btn"
                            aria-label={`Delete link ${i + 1}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button onClick={addLink} disabled={isLoading}>
                      + Add Link
                    </button>{" "}
                    <button onClick={saveLinks} disabled={isLoading}>
                      Save Links
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="current-profile">
        <strong>Current Profile:</strong> {currentProfile || "None"}
      </div>
    </div>
  );
}
