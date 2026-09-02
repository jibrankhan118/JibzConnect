import Notification from "./Notification";

function Navbar({
  user,
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
  socket,
  token,
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

        <div className="user-info">
          <strong>{user?.username || "User"}</strong>
          <span>
            <i className="online-dot"></i>
            Online
          </span>
        </div>

        <div className="profile-avatar">
          {(user?.username || "U").charAt(0).toUpperCase()}
        </div>

        <button className="logout-button" onClick={onLogout} type="button">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
