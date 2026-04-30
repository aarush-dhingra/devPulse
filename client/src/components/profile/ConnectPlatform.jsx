import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { PLATFORM_BY_ID } from "../../utils/constants";

export default function ConnectPlatform({ open, onClose, platformId, onSubmit }) {
  const platform = PLATFORM_BY_ID[platformId];
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setUsername("");
    setApiKey("");
    setError(null);
    setLoading(false);
  };

  const handle = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (platform?.needsApiKey && !apiKey.trim()) {
      setError("API key is required for this platform");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        platform: platformId,
        username: username.trim(),
        apiKey: platform?.needsApiKey ? apiKey.trim() : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!platform) return null;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <span>{platform.icon}</span>
          Connect {platform.name}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button onClick={handle} loading={loading}>
            Connect
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="text-xs text-ink-muted">{platform.inputLabel}</span>
        <input
          autoFocus
          className="input mt-1"
          value={username}
          placeholder="e.g. octocat"
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      {platform.needsApiKey && (
        <label className="block mt-3">
          <span className="text-xs text-ink-muted">API Key</span>
          <input
            type="password"
            className="input mt-1 font-mono"
            value={apiKey}
            placeholder="waka_xxx…"
            onChange={(e) => setApiKey(e.target.value)}
          />
          <span className="text-[11px] text-ink-dim mt-1 block">
            Stored encrypted (AES-256). Used only to fetch your stats.
          </span>
        </label>
      )}
      {error && (
        <div className="mt-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </Modal>
  );
}
