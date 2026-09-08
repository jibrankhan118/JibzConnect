import { useEffect, useState, useRef } from "react";
import ChannelMembers from "./ChannelMembers";
import ChannelCallModal from "./ChannelCallModal";
import ChannelActiveCallWindow from "./ChannelActiveCallWindow";
import TypingIndicator from "./TypingIndicator";
import ChannelActivity from "./ChannelActivity";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

function ChatWindow({ selectedChannel, user, token, refreshChannels, socket }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [reactions, setReactions] = useState({});
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [incomingChannelCall, setIncomingChannelCall] = useState(null);
  const [activeChannelCall, setActiveChannelCall] = useState(null);
  const [readReceipts, setReadReceipts] = useState({});

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const channelName = selectedChannel?.name;
  const channelId = selectedChannel?.id;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/messages?channel=${channelName}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await response.json();
        const msgs = Array.isArray(data) ? data : [];
        setMessages(msgs);
        fetchReactionsForMessages(msgs);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    if (token && channelName) fetchMessages();
  }, [channelName, token]);

  useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
  }, [channelId]);

  const fetchReactionsForMessages = async (msgs) => {
    try {
      const reactionMap = {};
      await Promise.all(
        msgs.map(async (msg) => {
          const res = await fetch(
            `http://localhost:5000/api/reactions/${msg.id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const data = await res.json();
          reactionMap[msg.id] = Array.isArray(data) ? data : [];
        }),
      );
      setReactions(reactionMap);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    if (!token || !user || !channelName || !socket) return;

    const handleConnect = () => socket.emit("joinChannel", channelName);
    if (socket.connected) handleConnect();
    else socket.on("connect", handleConnect);

    const handleReceiveMessage = (newMessage) => {
      if (newMessage.channel !== channelName) return;
      setMessages((prev) => {
        const alreadyExists = prev.some((msg) => msg.id === newMessage.id);
        if (alreadyExists) return prev;
        return [...prev, newMessage];
      });
      setReactions((prev) => ({ ...prev, [newMessage.id]: [] }));
      setTimeout(() => {
        socket.emit("markMessageRead", {
          messageId: newMessage.id,
          channelName,
        });
      }, 500);
    };
    socket.on("receiveMessage", handleReceiveMessage);

    const handleReactionUpdated = ({
      messageId,
      reactions: updatedReactions,
    }) => {
      setReactions((prev) => ({ ...prev, [messageId]: updatedReactions }));
    };
    socket.on("reactionUpdated", handleReactionUpdated);

    const handleMessageReadReceipt = ({ messageId, readCount, totalUsers }) => {
      setReadReceipts((prev) => ({
        ...prev,
        [messageId]: { readCount, totalUsers },
      }));
    };
    socket.on("messageReadReceipt", handleMessageReadReceipt);

    const handleIncomingChannelCall = (data) => setIncomingChannelCall(data);
    socket.on("incomingChannelCall", handleIncomingChannelCall);

    const handleChannelCallEnded = () => {
      setActiveChannelCall(null);
      setIncomingChannelCall(null);
    };
    socket.on("channelCallEnded", handleChannelCallEnded);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("reactionUpdated", handleReactionUpdated);
      socket.off("messageReadReceipt", handleMessageReadReceipt);
      socket.off("incomingChannelCall", handleIncomingChannelCall);
      socket.off("channelCallEnded", handleChannelCallEnded);
      socket.emit("leaveChannel", channelName);
    };
  }, [channelName, token, user, socket]);

  const handleMessagesScroll = (e) => {
    const container = e.currentTarget;
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    isAtBottomRef.current = distanceFromBottom < 100; // Increased threshold
  };

  useEffect(() => {
    if (isAtBottomRef.current && bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [messages]);

  const handleSend = () => {
    const text = message.trim();
    if (text === "" || !user || !token || !socket || !channelName) return;
    socket.emit("sendMessage", {
      sender: user.username,
      message: text,
      channel: channelName,
    });
    setMessage("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("userTyping", { channelName, isTyping: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    if (!socket || !channelName) return;
    socket.emit("userTyping", { channelName, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("userTyping", { channelName, isTyping: false });
    }, 2000);
  };

  const handleReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit("toggleReaction", { messageId, emoji, channelName });
  };

  const groupReactions = (messageId) => {
    const msgReactions = reactions[messageId] || [];
    const grouped = {};
    msgReactions.forEach((r) => {
      if (!grouped[r.emoji])
        grouped[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
      grouped[r.emoji].count += 1;
      grouped[r.emoji].userIds.push(r.userId);
    });
    return Object.values(grouped).map((g) => ({
      ...g,
      reactedByMe: g.userIds.includes(user.id),
    }));
  };

  const initiateChannelCall = () => {
    if (!socket) return;
    socket.emit("initiateChannelCall", {
      channelName,
      callInitiatorId: user.id,
      callInitiatorName: user.username,
    });
    setActiveChannelCall(`${channelName}_${Date.now()}`);
    setIncomingChannelCall(null);
  };

  const joinChannelCall = () => {
    if (!socket || !incomingChannelCall) return;
    socket.emit("joinChannelCall", {
      callId: incomingChannelCall.callId,
      channelName: incomingChannelCall.channelName,
      userId: user.id,
      userName: user.username,
    });
    setActiveChannelCall(incomingChannelCall.callId);
    setIncomingChannelCall(null);
  };

  const handleAIAnalysis = async () => {
    if (!token || !channelName) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/ai/analyze-channel/${channelName}?limit=100`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();
      if (data.success) {
        setAiAnalysis(data.analysis);
      } else {
        setAiError(data.message || "Failed to analyze conversation");
      }
    } catch (error) {
      console.error("Error analyzing channel:", error);
      setAiError("An error occurred while analyzing the conversation");
    } finally {
      setAiLoading(false);
    }
  };

  if (activeChannelCall) {
    return (
      <ChannelActiveCallWindow
        channelName={channelName}
        callId={activeChannelCall}
        user={user}
        socket={socket}
        onEndCall={() => setActiveChannelCall(null)}
      />
    );
  }

  if (incomingChannelCall) {
    return (
      <ChannelCallModal
        call={incomingChannelCall}
        onJoin={joinChannelCall}
        onDecline={() => setIncomingChannelCall(null)}
      />
    );
  }

  return (
    <main className="chat-window">
      <div className="chat-header">
        <div className="chat-title">
          <div className="channel-title-icon">#</div>
          <div>
            <h2>{channelName}</h2>
            <span>{messages.length} messages · Team channel</span>
          </div>
        </div>

        <div className="chat-header-buttons">
          <button className="call-button" onClick={initiateChannelCall}>
            📞 Call
          </button>

          <button
            className="ai-analyze-button"
            onClick={handleAIAnalysis}
            disabled={aiLoading}
            title="Analyze channel tone"
          >
            {aiLoading ? "⏳ Analyzing..." : "🤖 Analyze"}
          </button>

          <div className="chat-header-actions">
            <button title="Search">🔍</button>
            <button title="Members" onClick={() => setShowMembers(true)}>
              👥
            </button>
            <button title="More">⋮</button>
          </div>
        </div>
      </div>

      {(aiAnalysis || aiError) && (
        <div className="ai-analysis-section">
          {aiError ? (
            <div className="ai-error">
              <strong>Error:</strong> {aiError}
            </div>
          ) : (
            <>
              <div className="analysis-item">
                <span className="analysis-label">Overall Tone:</span>
                <span className="analysis-value">{aiAnalysis.overallTone}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Summary:</span>
                <span className="analysis-value">{aiAnalysis.summary}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Recent Trend:</span>
                <span className="analysis-value">{aiAnalysis.recentTrend}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Key Points:</span>
                <ul className="key-points-list">
                  {aiAnalysis.keyPoints &&
                    aiAnalysis.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                </ul>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Tone Breakdown:</span>
                <div className="tone-breakdown">
                  <div className="tone-item">
                    Calm: {aiAnalysis.toneBreakdown.calm}%
                  </div>
                  <div className="tone-item">
                    Friendly: {aiAnalysis.toneBreakdown.friendly}%
                  </div>
                  <div className="tone-item">
                    Neutral: {aiAnalysis.toneBreakdown.neutral}%
                  </div>
                  <div className="tone-item">
                    Frustrated: {aiAnalysis.toneBreakdown.frustrated}%
                  </div>
                  <div className="tone-item">
                    Aggressive: {aiAnalysis.toneBreakdown.aggressive}%
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <ChannelActivity
        channelName={channelName}
        socket={socket}
        currentUserId={user.id}
      />

      <div
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
      >
        {messages.map((msg) => (
          <div
            className="message"
            key={msg.id}
            onMouseEnter={() => setHoveredMessageId(msg.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
            style={{ position: "relative" }}
          >
            <div className="message-avatar">
              {msg.sender.charAt(0).toUpperCase()}
            </div>

            <div className="message-content" style={{ flex: 1 }}>
              <div className="message-top">
                <strong>{msg.sender}</strong>
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p>{msg.message}</p>

              {groupReactions(msg.id).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    marginTop: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  {groupReactions(msg.id).map(
                    ({ emoji, count, reactedByMe }) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        style={{
                          padding: "3px 9px",
                          borderRadius: "12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          color: "#d1d5db",
                          backgroundColor: reactedByMe ? "#3b4a6b" : "#1c2538",
                          border: reactedByMe
                            ? "1px solid #6b6be6"
                            : "1px solid #303b55",
                        }}
                      >
                        {emoji} {count}
                      </button>
                    ),
                  )}
                </div>
              )}

              {msg.userId === user.id && readReceipts[msg.id] && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#7f8ba3",
                    marginTop: "4px",
                  }}
                >
                  ✓ Read by {readReceipts[msg.id].readCount} of{" "}
                  {readReceipts[msg.id].totalUsers}
                </div>
              )}
            </div>

            {hoveredMessageId === msg.id && (
              <div
                style={{
                  position: "absolute",
                  top: "-42px",
                  right: "8px",
                  display: "flex",
                  gap: "4px",
                  padding: "6px 10px",
                  background: "#1c2538",
                  border: "1px solid #303b55",
                  borderRadius: "20px",
                  zIndex: 10,
                }}
              >
                {ALLOWED_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "18px",
                      cursor: "pointer",
                      padding: "2px 4px",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <TypingIndicator
        channelName={channelName}
        socket={socket}
        currentUserId={user.id}
      />

      <div className="message-composer">
        <button className="composer-icon" title="Attachment">
          +
        </button>
        <button className="composer-icon" title="Emoji">
          😊
        </button>
        <input
          type="text"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
        />
        <button className="voice-button" title="Voice">
          🎤
        </button>
        <button className="send-button" onClick={handleSend}>
          Send
        </button>
      </div>

      {showMembers && (
        <ChannelMembers
          channelId={channelId}
          channelName={channelName}
          token={token}
          currentUser={user}
          onClose={() => setShowMembers(false)}
          refreshChannels={refreshChannels}
        />
      )}
    </main>
  );
}

export default ChatWindow;
