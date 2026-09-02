import { useEffect, useState } from "react";

function UserStatus({ userId, username, socket, token }) {
  const [presence, setPresence] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const fetchPresence = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/presence/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        setPresence(data);
      } catch (error) {
        console.error("Error fetching presence:", error);
      }
    };

    fetchPresence();

    socket.on("userOnline", (data) => {
      if (data.userId === userId) {
        setPresence((prev) => ({ ...prev, isOnline: true }));
      }
    });

    socket.on("userOffline", (data) => {
      if (data.userId === userId) {
        setPresence((prev) => ({
          ...prev,
          isOnline: false,
          lastSeen: data.lastSeen,
        }));
      }
    });

    return () => {
      socket.off("userOnline");
      socket.off("userOffline");
    };
  }, [userId, socket, token]);

  const getStatusText = () => {
    if (presence?.isOnline) return "Online";
    if (presence?.lastSeen) {
      const date = new Date(presence.lastSeen);
      return `Last seen ${date.toLocaleTimeString()}`;
    }
    return "Offline";
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          ...statusDotStyle,
          backgroundColor: presence?.isOnline ? "#22c55e" : "#7f8ba3",
        }}
      />
      <span style={textStyle}>{getStatusText()}</span>
    </div>
  );
}

const containerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  color: "#7f8ba3",
};

const statusDotStyle = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
};

const textStyle = {
  fontSize: "12px",
};

export default UserStatus;
