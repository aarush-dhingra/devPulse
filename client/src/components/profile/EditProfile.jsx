import { useState } from "react";
import Button from "../ui/Button";
import { userApi } from "../../api/user.api";
import { useAuthStore } from "../../store/authStore";

export default function EditProfile({ user }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [isPublic, setIsPublic] = useState(!!user?.is_public);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const data = await userApi.updateMe({
        name,
        bio,
        is_public: isPublic,
      });
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-4">
      <h3 className="font-semibold">Edit Profile</h3>
      <label className="block">
        <span className="text-xs text-ink-muted">Display name</span>
        <input
          className="input mt-1"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-xs text-ink-muted">Bio</span>
        <textarea
          className="input mt-1 min-h-[80px]"
          value={bio}
          maxLength={500}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell the world what you build…"
        />
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-4 h-4 rounded accent-accent-500"
        />
        <span className="text-sm">Make my profile public</span>
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save changes</Button>
        {saved && <span className="text-emerald-400 text-sm">Saved ✓</span>}
      </div>
    </form>
  );
}
