/* global chrome */
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Stack,
  Divider,
} from "@mui/material";
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
    chrome.runtime.sendMessage(
      { action: "createProfile", name: trimmedName },
      () => {
        setNewProfileName("");
        fetchState();
      }
    );
  };

  const activateProfile = (name) => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ action: "activateProfile", name }, fetchState);
  };

  const deactivateProfile = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ action: "deactivateProfile" }, fetchState);
  };

  const deleteProfile = (name) => {
    if (
      !window.confirm(`Delete profile "${name}"? This action cannot be undone.`)
    )
      return;
    setIsLoading(true);
    chrome.runtime.sendMessage({ action: "deleteProfile", name }, fetchState);
  };

  const toggleLinks = (name) => {
    if (expandedProfile === name) {
      setExpandedProfile(null);
      setEditingLinks([]);
    } else {
      const prof = profiles.find((p) => p.name === name);
      setExpandedProfile(name);
      setEditingLinks(prof?.tabs?.map((tab) => tab.url) || []);
    }
  };

  const updateLink = (index, newUrl) => {
    const updated = [...editingLinks];
    updated[index] = newUrl;
    setEditingLinks(updated);
  };

  const addLink = () => setEditingLinks((prev) => [...prev, ""]);
  const deleteLink = (index) =>
    setEditingLinks((prev) => prev.filter((_, i) => i !== index));

  const saveLinks = () => {
    if (!expandedProfile) return;
    const tabs = editingLinks
      .filter((url) => url.trim())
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
    <Box
      sx={{
        padding: 2,
        minWidth: 360,
        backgroundColor: "#121212",
        color: "#fff",
      }}
    >
      <Typography variant="h5" gutterBottom>
        Tab Profiles
      </Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <TextField
          label="New profile name"
          variant="outlined"
          size="small"
          fullWidth
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createProfile()}
          disabled={isLoading}
          sx={{
            input: { color: "#fff" },
            label: { color: "#ccc" },
            backgroundColor: "#2a2a2a",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#555" },
              "&:hover fieldset": { borderColor: "#888" },
              "&.Mui-focused fieldset": { borderColor: "#aaa" },
            },
          }}
        />

        <Button
          variant="contained"
          onClick={createProfile}
          disabled={isLoading || !newProfileName.trim()}
        >
          Create
        </Button>
      </Stack>

      <Typography variant="subtitle1" gutterBottom>
        Profiles:
      </Typography>
      {profiles.length === 0 ? (
        <Typography>No profiles</Typography>
      ) : (
        <Stack spacing={2}>
          {profiles.map((p) => (
            <Box key={p.name}>
              <Paper sx={{ p: 1, backgroundColor: "#2a2a2a", color: "#fff" }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography variant="body1" fontWeight="bold">
                    {p.name}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      color={p.active ? "secondary" : "primary"}
                      size="small"
                      onClick={() =>
                        p.active ? deactivateProfile() : activateProfile(p.name)
                      }
                    >
                      {p.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => deleteProfile(p.name)}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => toggleLinks(p.name)}
                    >
                      {expandedProfile === p.name ? "Hide Links" : "Show Links"}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {expandedProfile === p.name && (
                <Box mt={1} p={2} bgcolor="#1e1e1e" borderRadius={1}>
                  <Typography variant="subtitle2">Edit Tabs</Typography>
                  <Stack spacing={1} mt={1}>
                    {editingLinks.map((url, i) => (
                      <Stack
                        direction="row"
                        spacing={1}
                        key={i}
                        alignItems="center"
                      >
                        <TextField
                          value={url}
                          onChange={(e) => updateLink(i, e.target.value)}
                          fullWidth
                          size="small"
                          placeholder="https://example.com"
                          disabled={isLoading}
                          sx={{
                            input: { color: "#fff" },
                            placeholder: { color: "#ccc" },
                            backgroundColor: "#2a2a2a",
                            borderRadius: 1,
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": { borderColor: "#555" },
                              "&:hover fieldset": { borderColor: "#888" },
                              "&.Mui-focused fieldset": { borderColor: "#aaa" },
                            },
                          }}
                        />
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => deleteLink(i)}
                        >
                          ×
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1} mt={2}>
                    <Button
                      onClick={addLink}
                      disabled={isLoading}
                      size="small"
                      variant="outlined"
                    >
                      + Add Link
                    </Button>
                    <Button
                      onClick={saveLinks}
                      disabled={isLoading}
                      size="small"
                      variant="contained"
                      color="primary"
                    >
                      Save Links
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="body2">
        <strong>Current Profile:</strong> {currentProfile || "None"}
      </Typography>
    </Box>
  );
}
