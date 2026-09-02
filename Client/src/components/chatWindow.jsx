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

  const typingTimeoutRef = useRef(null);

  // Scroll references
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Keeps track of whether the user is near the bottom
  const isAtBottomRef = useRef(true);

  const channelName = selectedChannel?.name;
  const channelId = selectedChannel?.id;

  /*
   * FETCH CHANNEL MESSAGES
   */
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/messages?channel=${channelName}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();
        const msgs = Array.isArray(data) ? data : [];

        setMessages(msgs);
        fetchReactionsForMessages(msgs);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    if (token && channelName) {
      fetchMessages();
    }
  }, [channelName, token]);

  /*
   * FETCH REACTIONS
   */
  const fetchReactionsForMessages = async (msgs) => {
    try {
      const reactionMap = {};

      await Promise.all(
        msgs.map(async (msg) => {
          const res = await fetch(
            `http://localhost:5000/api/reactions/${msg.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
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

  /*
   * SOCKET EVENTS
   */
  useEffect(() => {
    if (!token || !user || !channelName) {
      return;
    }

    if (!socket) {
      return;
    }

    const handleConnect = () => {
      socket.emit("joinChannel", channelName);
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on("connect", handleConnect);
    }

    /*
     * RECEIVE NEW MESSAGE
     */
    const handleReceiveMessage = (newMessage) => {
      if (newMessage.channel !== channelName) {
        return;
      }

      setMessages((prev) => {
        const alreadyExists = prev.some((msg) => msg.id === newMessage.id);

        if (alreadyExists) {
          return prev;
        }

        return [...prev, newMessage];
      });

      setReactions((prev) => ({
        ...prev,
        [newMessage.id]: [],
      }));

      setTimeout(() => {
        socket.emit("markMessageRead", {
          messageId: newMessage.id,
          channelName,
        });
      }, 500);
    };

    socket.on("receiveMessage", handleReceiveMessage);

    /*
     * REACTION UPDATED
     */
    const handleReactionUpdated = ({
      messageId,
      reactions: updatedReactions,
    }) => {
      setReactions((prev) => ({
        ...prev,
        [messageId]: updatedReactions,
      }));
    };

    socket.on("reactionUpdated", handleReactionUpdated);

    /*
     * READ RECEIPT
     */
    const handleMessageReadReceipt = ({ messageId, readCount, totalUsers }) => {
      setReadReceipts((prev) => ({
        ...prev,
        [messageId]: {
          readCount,
          totalUsers,
        },
      }));
    };

    socket.on("messageReadReceipt", handleMessageReadReceipt);

    /*
     * INCOMING CHANNEL CALL
     */
    const handleIncomingChannelCall = (data) => {
      setIncomingChannelCall(data);
    };

    socket.on("incomingChannelCall", handleIncomingChannelCall);

    /*
     * CHANNEL CALL ENDED
     */
    const handleChannelCallEnded = () => {
      setActiveChannelCall(null);
      setIncomingChannelCall(null);
    };

    socket.on("channelCallEnded", handleChannelCallEnded);

    /*
     * CLEANUP SOCKET EVENTS
     */
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

  /*
   * DETECT WHETHER USER IS AT THE BOTTOM
   *
   * If the user scrolls upward, this becomes false.
   * If the user returns to the bottom, it becomes true.
   */
  const handleMessagesScroll = (e) => {
    const container = e.currentTarget;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    isAtBottomRef.current = distanceFromBottom < 50;
  };

  /*
   * AUTO-SCROLL
   *
   * Only scroll to the bottom if the user was already
   * near the bottom.
   *
   * If the user is reading older messages, do NOT
   * force them back to the bottom.
   */
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  /*
   * SEND MESSAGE
   */
  const handleSend = () => {
    const text = message.trim();

    if (text === "" || !user || !token || !socket || !channelName) {
      return;
    }

    socket.emit("sendMessage", {
      sender: user.username,
      message: text,
      channel: channelName,
    });

    setMessage("");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit("userTyping", {
      channelName,
      isTyping: false,
    });
  };

  /*
   * ENTER KEY
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  /*
   * USER TYPING
   */
  const handleMessageChange = (e) => {
    setMessage(e.target.value);

    if (!socket || !channelName) {
      return;
    }

    socket.emit("userTyping", {
      channelName,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("userTyping", {
        channelName,
        isTyping: false,
      });
    }, 2000);
  };

  /*
   * REACTION
   */
  const handleReaction = (messageId, emoji) => {
    if (!socket) {
      return;
    }

    socket.emit("toggleReaction", {
      messageId,
      emoji,
      channelName,
    });
  };

  /*
   * GROUP REACTIONS
   */
  const groupReactions = (messageId) => {
    const msgReactions = reactions[messageId] || [];
    const grouped = {};

    msgReactions.forEach((r) => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          userIds: [],
        };
      }

      grouped[r.emoji].count += 1;
      grouped[r.emoji].userIds.push(r.userId);
    });

    return Object.values(grouped).map((g) => ({
      ...g,
      reactedByMe: g.userIds.includes(user.id),
    }));
  };

  /*
   * START CHANNEL CALL
   */
  const initiateChannelCall = () => {
    if (!socket) {
      return;
    }

    socket.emit("initiateChannelCall", {
      channelName,
      callInitiatorId: user.id,
      callInitiatorName: user.username,
    });

    setActiveChannelCall(`${channelName}_${Date.now()}`);

    setIncomingChannelCall(null);
  };

  /*
   * JOIN CHANNEL CALL
   */
  const joinChannelCall = () => {
    if (!socket || !incomingChannelCall) {
      return;
    }

    socket.emit("joinChannelCall", {
      callId: incomingChannelCall.callId,
      channelName: incomingChannelCall.channelName,
      userId: user.id,
      userName: user.username,
    });

    setActiveChannelCall(incomingChannelCall.callId);

    setIncomingChannelCall(null);
  };

  /*
   * ACTIVE CALL SCREEN
   */
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

  /*
   * INCOMING CALL SCREEN
   */
  if (incomingChannelCall) {
    return (
      <ChannelCallModal
        call={incomingChannelCall}
        onJoin={joinChannelCall}
        onDecline={() => setIncomingChannelCall(null)}
      />
    );
  }

  /*
   * MAIN CHAT WINDOW
   */
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

        <div className="chat-header-actions">
          <button title="Search">🔍</button>

          <button
            onClick={initiateChannelCall}
            style={{
              padding: "8px 16px",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            📞 Call
          </button>

          <button title="Members" onClick={() => setShowMembers(true)}>
            👥
          </button>

          <button title="More">⋮</button>
        </div>
      </div>

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
            style={{
              position: "relative",
            }}
          >
            <div className="message-avatar">
              {msg.sender.charAt(0).toUpperCase()}
            </div>

            <div
              className="message-content"
              style={{
                flex: 1,
              }}
            >
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
