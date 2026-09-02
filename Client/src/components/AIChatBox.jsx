import { useEffect, useState } from "react";

function AIChatBox({ token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load previous AI chat messages from PostgreSQL
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/ai/history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load AI chat history.");
        }

        const historyMessages = data.messages.map((message) => ({
          id: message.id,
          text: message.message,
          sender: message.role === "user" ? "user" : "ai",
        }));

        setMessages(historyMessages);
      } catch (err) {
        console.error("Error loading AI history:", err);
        setError("Failed to load previous AI messages.");
      }
    };

    if (token) {
      loadHistory();
    }
  }, [token]);

  const handleSend = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      setError("Please enter a message before sending.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError("");

    const userMessage = {
      id: Date.now(),
      text: trimmedInput,
      sender: "user",
    };

    setMessages((previousMessages) => [...previousMessages, userMessage]);

    setInput("");

    try {
      const response = await fetch("http://localhost:5000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmedInput,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to get AI response.");
      }

      const aiMessage = {
        id: Date.now() + 1,
        text: data.reply,
        sender: "ai",
      };

      setMessages((previousMessages) => [...previousMessages, aiMessage]);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while contacting the AI assistant.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="ai-chat-panel">
      <div className="ai-chat-header">
        <h3>AI Assistant</h3>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="ai-chat-empty">Ask the assistant anything.</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`ai-chat-message ${
                message.sender === "user" ? "user" : "ai"
              }`}
            >
              <span>{message.text}</span>
            </div>
          ))
        )}
      </div>

      {error && <div className="ai-chat-error">{error}</div>}

      <div className="ai-chat-input-row">
        <textarea
          className="ai-chat-input"
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
        />

        <button
          className="ai-chat-send"
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </aside>
  );
}

export default AIChatBox;
