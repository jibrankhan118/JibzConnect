import { useEffect, useRef, useState } from "react";

const API = "http://localhost:5000";

function Avatar({ user, large = false }) {
  return user.avatarUrl ? <img className={large ? "profile-page-avatar" : "profile-page-avatar small"} src={user.avatarUrl} alt={`${user.username} avatar`} /> : <div className={large ? "profile-page-avatar profile-page-avatar-fallback" : "profile-page-avatar small profile-page-avatar-fallback"}>{(user.fullName || user.username || "U").charAt(0).toUpperCase()}</div>;
}

function ProfilePage({ user, token, onSaved, onCancel }) {
  const [profile, setProfile] = useState(user);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", bio: "", title: "", avatarUrl: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => data.user && setProfile(data.user))
      .catch(() => setStatus({ type: "error", message: "Unable to load profile." }));
  }, [token]);

  const beginEdit = () => {
    setForm({ fullName: profile.fullName || "", username: profile.username || "", bio: profile.bio || "", title: profile.title || "", avatarUrl: profile.avatarUrl || "" });
    setStatus({ type: "", message: "" });
    setEditing(true);
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 900 * 1024) {
      setStatus({ type: "error", message: "Choose an image smaller than 900 KB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, avatarUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch(`${API}/api/users/me`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save changes.");
      setProfile(data.user);
      setEditing(false);
      setStatus({ type: "success", message: "Profile updated successfully." });
      onSaved(data.user);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—";
  return <main className="profile-page">
    <div className="profile-page-inner">
      <div className="profile-page-intro"><button type="button" className="profile-back-button" onClick={onCancel}>← Back to workspace</button><span className="eyebrow">YOUR PROFILE</span></div>
      {!editing ? <>
        <section className="profile-hero profile-card">
          <div className="profile-hero-glow" />
          <Avatar user={profile} large />
          <div className="profile-identity"><span className="profile-kicker">JibzConnect member</span><h1>{profile.fullName || profile.username}</h1><p className="profile-username">@{profile.username}</p>{profile.title && <p className="profile-title">{profile.title}</p>}<p className="profile-bio">{profile.bio || "No bio added yet. Tell your workspace a little about yourself."}</p></div>
          <button type="button" className="profile-primary-button" onClick={beginEdit}>Edit profile</button>
        </section>
        <section className="profile-card profile-section"><div className="profile-section-heading"><div><span className="eyebrow">ABOUT</span><h2>A little about you</h2></div><span className="section-mark">✦</span></div><p className="about-copy">{profile.bio || "Your bio is the space to share what you are working on, what you care about, or how teammates can reach you."}</p></section>
        <section className="profile-card profile-section"><div className="profile-section-heading"><div><span className="eyebrow">ACCOUNT</span><h2>Account information</h2></div></div><div className="account-grid"><div><span className="account-label">Email address</span><strong className="account-value email-value">{profile.email}</strong></div><div><span className="account-label">Username</span><strong className="account-value">@{profile.username}</strong></div><div><span className="account-label">Joined</span><strong className="account-value">{joined}</strong></div></div></section>
      </> : <section className="profile-card profile-edit-card"><div className="profile-section-heading"><div><span className="eyebrow">PERSONALIZE</span><h1>Edit your profile</h1><p>Keep your workspace identity current.</p></div></div><form onSubmit={save} className="profile-form"><div className="profile-photo-editor"><Avatar user={{ ...profile, avatarUrl: form.avatarUrl }} large /><button type="button" className="profile-secondary-button" onClick={() => fileInputRef.current?.click()}>Change photo</button><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhoto} hidden /></div><div className="profile-form-grid"><label>Full name<input value={form.fullName} maxLength={80} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your name" /></label><label>Username<input value={form.username} maxLength={20} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" /></label><label>Title or role<input value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Product designer" /></label><label>Email address<span className="readonly-field">{profile.email}</span></label><label className="profile-form-wide">Bio<textarea value={form.bio} maxLength={280} rows="4" onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What are you working on?" /><small>{form.bio.length}/280</small></label></div><div className="profile-form-actions"><button type="button" className="profile-secondary-button" onClick={() => { setEditing(false); setStatus({ type: "", message: "" }); }}>Cancel</button><button type="submit" className="profile-primary-button" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div></form></section>}
      {status.message && <div className={`profile-status ${status.type}`} role="status">{status.message}</div>}
    </div>
  </main>;
}

export default ProfilePage;
