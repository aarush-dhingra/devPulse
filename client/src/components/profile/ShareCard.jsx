import { useState } from "react";
import Button from "../ui/Button";
import { cardApi } from "../../api/card.api";

export default function ShareCard({ username }) {
  const [busy, setBusy] = useState(false);
  const url = cardApi.svgUrl(username);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(url, { credentials: "include" });
      const svg = await res.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `devpulse-${username}.svg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.origin + `/u/${username}`);
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Shareable Card</h3>
      <div className="rounded-xl overflow-hidden border border-white/5 bg-bg-deep">
        <img src={url} alt={`${username} stats card`} className="w-full block" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={download} loading={busy}>
          Download SVG
        </Button>
        <Button variant="ghost" onClick={copyLink}>
          Copy profile link
        </Button>
      </div>
    </div>
  );
}
