import { useEffect, useState } from "react";

function Notification({ socket, user, token }) {
  const [notifications, setNotifications] = useState([]);
  const [showCenter, setShowCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // Listen for new message notifications
    socket.on("messageNotification", (data) => {
      const newNotif = {
        id: Date.now(),
        type: "message",
        from: data.senderUsername,
        channelName: data.channelName,
        message: data.message,
        timestamp: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for call notifications
    socket.on("incomingCall", (data) => {
      const newNotif = {
        id: Date.now(),
        type: "call",
        from: data.callerName,
        timestamp: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for incoming channel call
    socket.on("incomingChannelCall", (data) => {
      const newNotif = {
        id: Date.now(),
        type: "channelCall",
        from: data.callInitiatorName,
        channelName: data.channelName,
        timestamp: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for reaction notifications
    socket.on("reactionNotification", (data) => {
      const newNotif = {
        id: Date.now(),
        type: "reaction",
        from: data.username,
        emoji: data.emoji,
        message: data.messageText,
        channelName: data.channelName,
        timestamp: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off("messageNotification");
      socket.off("incomingCall");
      socket.off("incomingChannelCall");
      socket.off("reactionNotification");
    };
  }, [socket]);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const getNotificationText = (notif) => {
    switch (notif.type) {
      case "message":
        return `${notif.from} sent a message in #${notif.channelName}`;
      case "dmMessage":
        return `${notif.from} sent you a message`;
      case "call":
        return `${notif.from} is calling you`;
      case "channelCall":
        return `${notif.from} started a call in #${notif.channelName}`;
      case "reaction":
        return `${notif.from} reacted with ${notif.emoji} to "${notif.message}"`;
      default:
        return "New notification";
    }
  };

  return (
    <>
      {/* Bell Icon */}
      <div style={bellContainerStyle}>
        <button
          className="navbar-utility-button"
          onClick={() => setShowCenter(!showCenter)}
          style={bellButtonStyle}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span style={badgeStyle}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Center Popup */}
        {showCenter && (
          <div style={notificationCenterStyle}>
            <div style={headerStyle}>
              <h3>Notifications</h3>
              {notifications.length > 0 && (
                <button onClick={clearNotifications} style={clearButtonStyle}>
                  Clear
                </button>
              )}
            </div>

            <div style={notificationListStyle}>
              {notifications.length === 0 ? (
                <p style={emptyStyle}>No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} style={notificationItemStyle}>
                    <div style={notificationContentStyle}>
                      <p style={notificationTextStyle}>
                        {getNotificationText(notif)}
                      </p>
                      {notif.message && (
                        <p style={messagePreviewStyle}>
                          "{notif.message.substring(0, 50)}..."
                        </p>
                      )}
                      <span style={timeStyle}>
                        {notif.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      style={dismissButtonStyle}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const bellContainerStyle = {
  position: "relative",
};

const bellButtonStyle = {
  position: "relative",
};

const badgeStyle = {
  position: "absolute",
  top: "0",
  right: "0",
  background: "#ef4444",
  color: "#fff",
  borderRadius: "50%",
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "bold",
};

const notificationCenterStyle = {
  position: "absolute",
  top: "45px",
  right: "0",
  width: "min(350px, calc(100vw - 16px))",
  maxHeight: "min(500px, calc(100dvh - 78px))",
  background: "#1e1e2e",
  border: "1px solid #303b55",
  borderRadius: "8px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  zIndex: 30,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #303b55",
  background: "#0f1419",
};

const clearButtonStyle = {
  background: "none",
  border: "none",
  color: "#7f8ba3",
  cursor: "pointer",
  fontSize: "12px",
  textDecoration: "underline",
};

const notificationListStyle = {
  overflowY: "auto",
  maxHeight: "400px",
};

const notificationItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "12px 16px",
  borderBottom: "1px solid #303b55",
  cursor: "pointer",
  transition: "0.2s",
};

const notificationContentStyle = {
  flex: 1,
  marginRight: "8px",
};

const notificationTextStyle = {
  margin: "0 0 4px 0",
  fontSize: "14px",
  color: "#d1d5db",
  fontWeight: "500",
};

const messagePreviewStyle = {
  margin: "4px 0",
  fontSize: "12px",
  color: "#7f8ba3",
  fontStyle: "italic",
};

const timeStyle = {
  fontSize: "11px",
  color: "#6b7280",
};

const dismissButtonStyle = {
  background: "none",
  border: "none",
  color: "#7f8ba3",
  cursor: "pointer",
  fontSize: "16px",
  padding: "0",
};

const emptyStyle = {
  textAlign: "center",
  color: "#7f8ba3",
  padding: "40px 20px",
  fontSize: "14px",
};

export default Notification;
