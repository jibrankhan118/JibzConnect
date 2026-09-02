import { useEffect, useState } from "react";

function TypingIndicator({ channelName, socket, currentUserId }) {
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data) => {
      if (data.channelName !== channelName) return;
      if (String(data.userId) === String(currentUserId)) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          const exists = prev.some((u) => u.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, username: data.username }];
        } else {
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    };
    socket.on("userTypingStatus", handleTyping);

    return () => {
      socket.off("userTypingStatus", handleTyping);
    };
  }, [socket, channelName, currentUserId]);

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.username).join(", ");

  return (
    <div style={typingStyle}>
      <div style={dotsStyle}>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <span>{names} is typing...</span>
      <style>{`
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6b7280;
          animation: bounce 1.4s infinite;
        }
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.5; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const typingStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  color: "#7f8ba3",
  fontSize: "13px",
  fontStyle: "italic",
};

const dotsStyle = {
  display: "flex",
  gap: "4px",
};

export default TypingIndicator;
