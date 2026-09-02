import { useEffect, useState, useRef } from "react";

function ChannelActiveCallWindow({
  channelName,
  callId,
  user,
  socket,
  onEndCall,
}) {
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState([user]);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        localStreamRef.current = stream;
      } catch (error) {
        console.error("Mic error:", error);
      }
    };

    setupAudio();

    socket.on("userJoinedCall", (data) => {
      setParticipants((prev) => {
        const exists = prev.some((p) => p.id === data.userId);
        if (exists) return prev;
        return [...prev, { id: data.userId, username: data.userName }];
      });
    });

    socket.on("userLeftCall", (data) => {
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
    });

    return () => {
      socket.off("userJoinedCall");
      socket.off("userLeftCall");
    };
  }, [socket]);

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (socket) socket.emit("endChannelCall", { callId, channelName });
    onEndCall();
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main style={callWindowStyle}>
      <div style={callHeaderStyle}>
        <h2>#{channelName}</h2>
        <p>Duration: {formatTime(callDuration)}</p>
      </div>

      <div style={participantsStyle}>
        <h3>Participants ({participants.length})</h3>
        {participants.map((p) => (
          <div key={p.id} style={participantStyle}>
            <span style={avatarStyle}>
              {p.username.charAt(0).toUpperCase()}
            </span>
            <span>{p.username}</span>
          </div>
        ))}
      </div>

      <button onClick={handleEndCall} style={endButtonStyle}>
        ☎️ End Call
      </button>
    </main>
  );
}

const callWindowStyle = {
  flex: 1,
  background: "linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
};

const callHeaderStyle = {
  marginBottom: "40px",
  textAlign: "center",
};

const participantsStyle = {
  background: "#1c2538",
  padding: "20px",
  borderRadius: "8px",
  marginBottom: "30px",
  minWidth: "250px",
};

const participantStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 0",
  borderBottom: "1px solid #303b55",
};

const avatarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  backgroundColor: "#3b6ea5",
  borderRadius: "50%",
  fontSize: "14px",
  fontWeight: "600",
};

const endButtonStyle = {
  padding: "12px 32px",
  fontSize: "16px",
  backgroundColor: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

export default ChannelActiveCallWindow;
