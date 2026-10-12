import Notification from "./Notification";

function Navbar({
  user,
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
  socket,
  token,
  onOpenAI,
  isAIChatOpen,
  onOpenProfile,
}) {
  return (
    <nav className="navbar">
      <button
        className="sidebar-toggle"
        type="button"
        onClick={onToggleSidebar}
        aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isSidebarOpen}
      >
        ☰
      </button>
      <div className="navbar-brand">
        <div className="logo-icon">J</div>

        <div>
          <h1>JibzConnect</h1>
          <span>Team communication</span>
        </div>
      </div>

      <div className="navbar-search">
        <span>⌕</span>
        <input type="text" placeholder="Search messages..." />
        <kbd>Ctrl K</kbd>
      </div>

      <div className="navbar-user">
        {/* Bell Icon - Notifications */}
        <Notification socket={socket} user={user} token={token} />

        <button
          className={`navbar-ai-button${isAIChatOpen ? " is-active" : ""}`}
          type="button"
          onClick={onOpenAI}
          aria-label="Open AI Assistant"
          aria-pressed={isAIChatOpen}
        >
          AI
        </button>

        <div className="user-info">
          <strong>{user?.fullName || user?.username || "User"}</strong>
          <span>
            <i className="online-dot"></i>
            Online
          </span>
        </div>

        <button className="profile-avatar profile-avatar-button" onClick={onOpenProfile} type="button" aria-label="Open your profile">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="Your avatar" /> : (user?.fullName || user?.username || "U").charAt(0).toUpperCase()}
        </button>

        <button className="logout-button" onClick={onLogout} type="button">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
