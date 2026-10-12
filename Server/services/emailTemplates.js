const escapeHtml = (value = "") =>
  String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);

const welcomeEmail = ({ username }) => {
  const safeUsername = escapeHtml(username);
  const text = `Hi ${username},\n\nWelcome to JibzConnect. Your account is ready, and you can start connecting with your team.\n\n— The JibzConnect team`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;"><div style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fff;border-radius:16px;"><div style="font-size:24px;font-weight:700;color:#3157d5;">JibzConnect</div><h1 style="font-size:28px;margin:32px 0 12px;">Welcome, ${safeUsername}!</h1><p style="font-size:16px;line-height:1.6;">Your account is ready. JibzConnect gives your team one place for conversations, channels, calls, and AI assistance.</p><p style="font-size:16px;line-height:1.6;">We’re glad you’re here.</p><p style="margin-top:32px;font-size:14px;color:#64748b;">— The JibzConnect team</p></div></body></html>`;
  return { subject: "Welcome to JibzConnect", text, html };
};

module.exports = { welcomeEmail };
