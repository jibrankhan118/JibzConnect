import { useEffect, useState, useRef } from "react";
import SimplePeer from "simple-peer";

function ActiveCallWindow({ recipient, socket, isInitiator, onEndCall }) {
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState("Connecting...");
  const [callError, setCallError] = useState("");
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Timer for call duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Setup WebRTC peer connection
  useEffect(() => {
    if (!socket) return;

    let isDisposed = false;
    let localStream = null;
    let peer = null;
    const remoteAudio = remoteAudioRef.current;

    const stopLocalStream = () => {
      localStream?.getTracks().forEach((track) => track.stop());
      if (localStreamRef.current === localStream) {
        localStreamRef.current = null;
      }
    };

    const setupPeer = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone access is not supported by this browser.");
        }

        // Get user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        if (isDisposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = stream;
        localStreamRef.current = stream;

        // Only the caller creates the offer; the recipient answers it.
        peer = new SimplePeer({
          initiator: isInitiator,
          trickleICE: true,
          stream: stream,
        });

        // When you generate an offer
        const handleSignal = (data) => {
          if (data.type === "offer") {
            socket.emit("sendOffer", {
              recipientId: recipient.id,
              offer: data,
            });
          } else if (data.type === "answer") {
            socket.emit("sendAnswer", {
              recipientId: recipient.id,
              answer: data,
            });
          } else if (data.candidate) {
            socket.emit("sendICECandidate", {
              recipientId: recipient.id,
              candidate: data,
            });
          }
        };

        const handleRemoteStream = (remoteStream) => {
          if (!remoteAudio) return;

          remoteAudio.srcObject = remoteStream;
          remoteAudio.play().catch((error) => {
            console.error("Unable to play remote call audio:", error);
            setCallError("Remote audio could not start automatically.");
          });
        };

        const handleConnect = () => {
          setCallStatus("Connected");
          setCallError("");
        };

        const handlePeerError = (error) => {
          console.error("Voice call peer error:", error);
          setCallStatus("Call error");
          setCallError("The audio connection failed. You can end the call and try again.");
        };

        const handlePeerClose = () => {
          setCallStatus("Call ended");
        };

        peer.on("signal", handleSignal);
        peer.on("stream", handleRemoteStream);
        peer.on("connect", handleConnect);
        peer.on("error", handlePeerError);
        peer.on("close", handlePeerClose);

        // Receive offer from remote peer
        const handleReceiveOffer = ({ offer }) => {
          peer.signal(offer);
        };

        // Receive answer from remote peer
        const handleReceiveAnswer = ({ answer }) => {
          peer.signal(answer);
        };

        // Receive ICE candidate from remote peer
        const handleReceiveIceCandidate = ({ candidate }) => {
          peer.signal(candidate);
        };

        socket.on("receiveOffer", handleReceiveOffer);
        socket.on("receiveAnswer", handleReceiveAnswer);
        socket.on("receiveICECandidate", handleReceiveIceCandidate);

        peerRef.current = peer;

        return () => {
          socket.off("receiveOffer", handleReceiveOffer);
          socket.off("receiveAnswer", handleReceiveAnswer);
          socket.off("receiveICECandidate", handleReceiveIceCandidate);
        };
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setCallStatus("Microphone unavailable");
        setCallError(
          "Microphone access was not granted. Check your browser permission and try again.",
        );
      }
    };

    let removeSocketListeners;
    setupPeer().then((cleanup) => {
      removeSocketListeners = cleanup;
    });

    return () => {
      isDisposed = true;
      removeSocketListeners?.();
      stopLocalStream();
      if (remoteAudio) {
        remoteAudio.srcObject = null;
      }
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
      if (peerRef.current === peer) {
        peerRef.current = null;
      }
    };
  }, [socket, recipient, isInitiator]);

  const handleEndCall = () => {
    if (socket) {
      socket.emit("endCall", { recipientId: recipient.id });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }

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
        <div>
          <h2 style={{ margin: 0 }}>{recipient.username}</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>
            Call duration: {formatTime(callDuration)}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#cbd5e1" }}>
            {callStatus}
          </p>
        </div>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline />

      {callError && <p style={callErrorStyle}>{callError}</p>}

      <div style={callControlsStyle}>
        <button onClick={handleEndCall} style={endCallButtonStyle}>
          ☎️ End Call
        </button>
      </div>

      <p style={{ textAlign: "center", color: "#aaa", marginTop: "20px" }}>
        🎤 Audio call in progress...
      </p>
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

const callControlsStyle = {
  display: "flex",
  gap: "16px",
  marginTop: "20px",
};

const endCallButtonStyle = {
  padding: "14px 32px",
  fontSize: "16px",
  backgroundColor: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

const callErrorStyle = {
  maxWidth: "420px",
  margin: "0 0 12px",
  color: "#fca5a5",
  textAlign: "center",
};

export default ActiveCallWindow;
