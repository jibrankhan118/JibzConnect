import { useEffect, useState } from "react";

function ChannelActivity({ channelName, socket, currentUserId }) {
  const [viewingUsers, setViewingUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Clear viewing users when channel changes
    setViewingUsers([]);

    const handleViewing = (data) => {
      if (data.channelName !== channelName) return;

      setViewingUsers((prev) => {
        if (data.userId === currentUserId) return prev;
        const exists = prev.some((u) => u.userId === data.userId);
        if (!exists) {
          return [...prev, { userId: data.userId, username: data.username }];
        }
        return prev;
      });
    };
    const handleViewers = (data) => {
      if (data.channelName === channelName) {
        setViewingUsers(data.users.filter((u) => u.userId !== currentUserId));
      }
    };
    const handleLeft = (data) => {
      if (data.channelName === channelName) {
        setViewingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    };
    socket.on("userViewingChannel", handleViewing);
    socket.on("channelViewers", handleViewers);
    socket.on("userLeftChannel", handleLeft);
    socket.emit("getChannelViewers", channelName);

    return () => {
      socket.off("userViewingChannel", handleViewing);
      socket.off("channelViewers", handleViewers);
      socket.off("userLeftChannel", handleLeft);
    };
  }, [socket, channelName, currentUserId]);

  if (viewingUsers.length === 0) return null;

  return (
    <div style={activityStyle}>
      <span style={labelStyle}>👁️ Viewing:</span>
      {viewingUsers.map((user) => (
        <span key={user.userId} style={userStyle}>
          {user.username}
        </span>
      ))}
    </div>
  );
}

const activityStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  background: "#0f1419",
  borderBottom: "1px solid #303b55",
  fontSize: "13px",
  color: "#7f8ba3",
};

const labelStyle = {
  fontWeight: "600",
};

const userStyle = {
  background: "#1c2538",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "12px",
};

export default ChannelActivity;
