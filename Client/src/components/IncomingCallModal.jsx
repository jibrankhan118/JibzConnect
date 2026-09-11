function IncomingCallModal({ caller, onAccept, onReject }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0 }}>📞 Incoming Call</h2>
        <p style={{ fontSize: "18px" }}>{caller.callerName} is calling...</p>

        <div style={buttonGroupStyle}>
          <button onClick={onAccept} style={acceptButtonStyle}>
            Accept
          </button>
          <button onClick={onReject} style={rejectButtonStyle}>
            Reject
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
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

const buttonGroupStyle = {
  display: "flex",
  gap: "16px",
  marginTop: "24px",
  justifyContent: "center",
};

const acceptButtonStyle = {
  padding: "12px 32px",
  fontSize: "16px",
  backgroundColor: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

const rejectButtonStyle = {
  padding: "12px 32px",
  fontSize: "16px",
  backgroundColor: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

export default IncomingCallModal;
