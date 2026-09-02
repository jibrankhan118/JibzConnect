import { useState, useEffect } from "react";
import UserStatus from "./UserStatus";

function Sidebar({
  channels,
  selectedChannel,
  setSelectedChannel,
  users,
  selectedDMUser,
  setSelectedDMUser,
  token,
  refreshChannels,
  socket,
}) {
  const [userPresence, setUserPresence] = useState({});

  // Fetch initial presence data on load
  useEffect(() => {
    if (!token) return;

    const fetchPresence = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/presence", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        const presenceMap = {};
        data.forEach((p) => {
          presenceMap[String(p.userId)] = {
            isOnline: p.isOnline,
            lastSeen: p.lastSeen,
          };
        });
        setUserPresence(presenceMap);
      } catch (error) {
        console.error("Error fetching presence:", error);
      }
    };

    fetchPresence();
  }, [token]);

  // Listen to real-time presence updates
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data) => {
      setUserPresence((prev) => ({
        ...prev,
        [String(data.userId)]: { isOnline: true },
      }));
    };

    const handleUserOffline = (data) => {
      setUserPresence((prev) => ({
        ...prev,
        [String(data.userId)]: { isOnline: false, lastSeen: data.lastSeen },
      }));
    };
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, [socket]);

  const handleCreateChannel = async () => {
    const name = window.prompt("New channel name:");
    if (!name || !name.trim()) return;

    try {
      const response = await fetch("http://localhost:5000/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not create channel.");
        return;
      }

      await refreshChannels();
    } catch (error) {
      console.error("Error:", error);
      alert("Error creating channel.");
    }
  };

  return (
    <aside className="sidebar">
      <div className="workspace">
        <div className="workspace-icon">J</div>
        <div>
          <strong>JibzConnect</strong>
          <span>My Workspace</span>
        </div>
        <button className="workspace-menu">⋮</button>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <span>CHANNELS</span>
          <button onClick={handleCreateChannel} title="Create channel">
            +
          </button>
        </div>

        <div className="channel-list">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item ${
                !selectedDMUser && selectedChannel?.id === channel.id
                  ? "active-channel"
                  : ""
              }`}
              onClick={() => setSelectedChannel(channel)}
            >
              <span className="channel-icon">#</span>
              <span>{channel.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <span>DIRECT MESSAGES</span>
        </div>

        <div className="dm-list">
          {users.length === 0 && (
            <p
              style={{
                color: "#7f8ba3",
                fontSize: "12px",
                padding: "4px 10px",
              }}
            >
              No other users yet.
            </p>
          )}

          {users.map((dmUser) => (
            <div
              className={`dm-item ${
                selectedDMUser?.id === dmUser.id ? "active-dm" : ""
              }`}
              key={dmUser.id}
              onClick={() => setSelectedDMUser(dmUser)}
              style={{ position: "relative", cursor: "pointer" }}
            >
              <div className="dm-avatar" style={{ position: "relative" }}>
                {dmUser.username.charAt(0).toUpperCase()}
                <span
                  className="status-dot"
                  style={{
                    position: "absolute",
                    bottom: "0",
                    right: "0",
                    width: "10px",
                    height: "10px",
                    backgroundColor:
                      userPresence[String(dmUser.id)]?.isOnline === true
                        ? "#22c55e"
                        : "#7f8ba3",
                    borderRadius: "50%",
                    border: "2px solid #1e1e2e",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="dm-name">{dmUser.username}</span>
                {socket && (
                  <UserStatus
                    userId={dmUser.id}
                    username={dmUser.username}
                    socket={socket}
                    token={token}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">J</div>
        <div className="sidebar-user-info">
          <strong>Jibz</strong>
          <span>Available</span>
        </div>
        <button className="user-settings">⚙</button>
      </div>
    </aside>
  );
}

export default Sidebar;
