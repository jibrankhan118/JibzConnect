import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:5000";

function AIChatBox({ token, user, socket, onCallInitiated, isOpen: controlledIsOpen, onOpenChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = typeof controlledIsOpen === "boolean" ? controlledIsOpen : localIsOpen;
  const setIsOpen = (nextOpen) => {
    setLocalIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(Recognition));
    return () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ai/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Failed to load AI chat history.");
        setMessages(data.messages.map((message) => ({
          id: message.id,
          text: message.message,
          sender: message.role === "user" ? "user" : "ai",
        })));
      } catch (err) {
        console.error("Error loading AI history:", err);
        setError("Failed to load previous AI messages.");
      }
    };
    if (token) loadHistory();
  }, [token]);

  const sendMessage = async (text = input) => {
    const trimmedInput = text.trim();
    if (!trimmedInput) {
      setError("Please enter a message before sending.");
      return;
    }
    if (loading) return;

    setLoading(true);
    setError("");
    setMessages((previousMessages) => [...previousMessages, {
      id: `user-${Date.now()}`,
      text: trimmedInput,
      sender: "user",
    }]);
    setInput("");

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmedInput }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to get AI response.");
      if (data.actionResult?.success && data.actionResult.action === "startCall" && socket && user) {
        const target = data.actionResult.target;
        socket.emit("initiateCall", {
          recipientId: target.id,
          callerName: user.username,
          callerId: user.id,
        });
        onCallInitiated?.(target);
      }
      setMessages((previousMessages) => [...previousMessages, {
        id: `ai-${Date.now()}`,
        text: data.reply,
        sender: "ai",
      }]);
    } catch (err) {
      setError(err.message || "Something went wrong while contacting the AI assistant.");
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
      setError("Speech recognition is not supported in this browser. You can still type your question.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    let transcript = "";

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };
    recognition.onresult = (event) => {
      transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      setInput(transcript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setError(event.error === "not-allowed"
        ? "Microphone permission was denied. Please allow microphone access and try again."
        : "Speech recognition could not hear that. Please try again.");
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (transcript.trim()) sendMessage(transcript);
      else setError("I could not hear a question. Please try again.");
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakMessage = (message) => {
    if (!("speechSynthesis" in window)) {
      setError("Text-to-speech is not supported in this browser.");
      return;
    }
    if (speakingMessageId === message.id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.onstart = () => setSpeakingMessageId(message.id);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      setError("The response could not be read aloud.");
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <button className="ai-floating-launcher" type="button" onClick={() => setIsOpen(true)} aria-label="Open AI Assistant" title="AI Assistant" style={{
          position: "fixed", right: "clamp(16px, 8vw, 90px)", bottom: "clamp(72px, 10vh, 95px)", width: "58px", height: "58px",
          borderRadius: "50%", border: "none", background: "#2563eb", color: "#ffffff",
          fontSize: "25px", cursor: "pointer", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
          zIndex: 9999, display: "none", alignItems: "center", justifyContent: "center",
        }}>AI</button>
      )}

      {isOpen && (
        <aside className="ai-chat-drawer" style={{
          position: "fixed", top: "70px", right: "0", width: "min(400px, 100vw)", maxWidth: "100vw", height: "calc(100dvh - 70px)",
          background: "#111827", boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.28)", zIndex: 40,
          display: "flex", flexDirection: "column",
        }}>
          <div className="ai-chat-drawer-header" style={{
            height: "64px", minHeight: "64px", padding: "0 18px", display: "flex",
            alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #273249",
            background: "#151c2e",
          }}>
            <div>
              <h3 style={{ margin: "0", fontSize: "17px", color: "#ffffff" }}>AI Assistant</h3>
              <span style={{ fontSize: "12px", color: "#7f8ba3" }}>JibzConnect workspace assistant</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close AI Assistant" title="Close" style={{
              width: "34px", height: "34px", borderRadius: "8px", border: "1px solid #303b55",
              background: "#1c2538", color: "#dbe2f0", fontSize: "20px",
            }}>×</button>
          </div>

          <div className="ai-chat-messages" style={{
            flex: "1", overflowY: "auto", padding: "18px", background: "#0f172a",
            display: "flex", flexDirection: "column", gap: "10px",
          }}>
            {messages.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#7f8ba3", fontSize: "14px", padding: "20px" }}>
                <div style={{ fontSize: "30px", fontWeight: "700", color: "#8d8df2", marginBottom: "12px" }}>AI</div>
                <strong style={{ display: "block", color: "#ffffff", marginBottom: "6px" }}>How can I help?</strong>
                <span>Ask the AI assistant anything.</span>
              </div>
            ) : messages.map((message) => (
              <div key={message.id} className="ai-chat-message-row" style={{
                display: "flex", justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
              }}>
                <div className={`ai-chat-message-bubble ${message.sender === "user" ? "is-user" : "is-ai"}`} style={{
                  maxWidth: "86%", padding: "10px 13px",
                  borderRadius: message.sender === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: message.sender === "user" ? "#5b5bd6" : "#1c2538",
                  color: "#e5e7eb",
                  border: message.sender === "user" ? "none" : "1px solid #303b55",
                  fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {message.text}
                  {message.sender === "ai" && (
                    <button className="ai-read-aloud-button" type="button" onClick={() => speakMessage(message)} aria-label={speakingMessageId === message.id ? "Stop reading response" : "Read response aloud"} title={speakingMessageId === message.id ? "Stop" : "Read aloud"} style={{
                      display: "block", marginTop: "8px", padding: "4px 9px", border: "1px solid #465471",
                      borderRadius: "6px", background: "#202a40", color: "#dbe2f0", fontSize: "12px",
                    }}>
                      {speakingMessageId === message.id ? "Stop" : "Read aloud"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="ai-chat-loading" style={{
              alignSelf: "flex-start", padding: "10px 13px", borderRadius: "14px 14px 14px 4px",
              background: "#1c2538", border: "1px solid #303b55", color: "#7f8ba3", fontSize: "14px",
            }}>AI is thinking...</div>}
          </div>

          {error && <div className="ai-chat-error" style={{
            padding: "8px 14px", color: "#fca5a5", background: "rgba(239, 68, 68, 0.12)",
            borderTop: "1px solid rgba(239, 68, 68, 0.3)", fontSize: "12px",
          }}>{error}</div>}

          <div className="ai-chat-composer" style={{ padding: "12px", borderTop: "1px solid #273249", background: "#151c2e" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <textarea rows={2} value={input} onChange={(event) => {
                setInput(event.target.value);
                if (error) setError("");
              }} onKeyDown={handleKeyDown} placeholder={isListening ? "Listening..." : "Ask something..."} disabled={loading} style={{
                flex: "1 1 170px", minWidth: "0", resize: "none", border: "1px solid #303b55",
                borderRadius: "9px", padding: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", background: "#1c2538", color: "#ffffff",
              }} />
              <button type="button" onClick={startListening} disabled={loading || !speechSupported} aria-label={isListening ? "Stop listening" : "Use microphone"} title={!speechSupported ? "Speech recognition unavailable" : isListening ? "Stop listening" : "Use microphone"} style={{
                height: "42px", minWidth: "58px", border: "1px solid #303b55", borderRadius: "8px",
                background: isListening ? "#b91c1c" : "#202a40", color: "#dbe2f0",
                cursor: loading || !speechSupported ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600",
              }}>{isListening ? "Stop" : "Mic"}</button>
              <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
                height: "42px", minWidth: "58px", border: "none", borderRadius: "8px",
                background: loading || !input.trim() ? "#37445f" : "#5b5bd6", color: "#ffffff",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: "600",
              }}>{loading ? "..." : "Send"}</button>
            </div>
            <div className="ai-chat-composer-hint" style={{ marginTop: "6px", fontSize: "11px", color: "#7f8ba3", textAlign: "center" }}>
              {isListening ? "Listening for your question..." : "Press Enter to send • Shift + Enter for a new line"}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}

export default AIChatBox;
