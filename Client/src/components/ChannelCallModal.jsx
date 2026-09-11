function ChannelCallModal({ call, onJoin, onDecline }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>📞 Channel Call</h2>
        <p>
          {call.callInitiatorName} started a call in #{call.channelName}
        </p>
        <div style={buttonGroupStyle}>
          <button onClick={onJoin} style={joinButtonStyle}>
            Join
          </button>
          <button onClick={onDecline} style={declineButtonStyle}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalStyle = {
  background: "#1e1e2e",
  color: "#fff",
  width: "min(420px, calc(100vw - 24px))",
  padding: "clamp(24px, 8vw, 40px)",
  borderRadius: "12px",
  textAlign: "center",
  minWidth: 0,
  maxHeight: "calc(100dvh - 24px)",
  overflowY: "auto",
};

const buttonGroupStyle = {
  display: "flex",
  gap: "16px",
  marginTop: "24px",
  justifyContent: "center",
};

const joinButtonStyle = {
  padding: "12px 32px",
  fontSize: "16px",
  backgroundColor: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const declineButtonStyle = {
  padding: "12px 32px",
  fontSize: "16px",
  backgroundColor: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

export default ChannelCallModal;
