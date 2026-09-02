import { useEffect, useRef, useState } from "react";
import TypingIndicator from "./TypingIndicator";

function DirectChatWindow({ recipient, user, token, socket, onCallInitiated }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch conversation history when recipient changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/direct-messages/${recipient.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching DMs:", error);
      }
    };

    if (token && recipient) {
      fetchMessages();
    }
  }, [recipient, token]);

  // Receive direct messages from the shared authenticated socket.
  useEffect(() => {
    if (!socket || !user || !recipient) return;

    const handleReceiveDirectMessage = (newMsg) => {
      const isPartOfThisConversation =
        (newMsg.senderId === user.id && newMsg.recipientId === recipient.id) ||
        (newMsg.senderId === recipient.id && newMsg.recipientId === user.id);

      if (!isPartOfThisConversation) return;

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === newMsg.id);

        if (alreadyExists) {
          return prev;
        }

        return [...prev, newMsg];
      });
    };

    socket.on("receiveDirectMessage", handleReceiveDirectMessage);

    return () => {
      socket.off("receiveDirectMessage", handleReceiveDirectMessage);
    };
  }, [recipient, socket, user]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Send message
  const handleSend = () => {
    const text = message.trim();

    if (!text || !socket) return;

    socket.emit("sendDirectMessage", {
      recipientId: recipient.id,
      message: text,
    });

    setMessage("");

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("userTyping", {
      channelName: recipient.username,
      isTyping: false,
    });
  };

  // Send message with Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  // Handle message change with typing indicator
  const handleMessageChange = (e) => {
    setMessage(e.target.value);

    if (!socket || !recipient) return;

    socket.emit("userTyping", {
      channelName: recipient.username,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("userTyping", {
        channelName: recipient.username,
        isTyping: false,
      });
    }, 2000);
  };

  // Get sender username
  const getSenderUsername = (msg) => {
    if (msg.sender?.username) {
      return msg.sender.username;
    }

    if (msg.senderUsername) {
      return msg.senderUsername;
    }

    if (msg.sender === user.username) {
      return user.username;
    }

    if (msg.senderId === user.id) {
      return user.username;
    }

    return recipient.username;
  };

  // Voice call button
  const handleCall = () => {
    if (!socket || !recipient) return;

    console.log("Voice call requested for:", recipient.username);

    socket.emit("initiateCall", {
      recipientId: recipient.id,
      callerName: user.username,
      callerId: user.id,
    });

    onCallInitiated(recipient);
  };

  return (
    <main className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-title">
          <div className="channel-title-icon">
            {recipient.username.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2>{recipient.username}</h2>
            <span>Direct Message</span>
          </div>
        </div>

        {/* 1-to-1 Voice Call Button */}
        <button
          className="call-button"
          onClick={handleCall}
          title={`Call ${recipient.username}`}
        >
          📞 Call
        </button>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 && (
          <p
            style={{
              color: "#7f8ba3",
              textAlign: "center",
              marginTop: "40px",
            }}
          >
            No messages yet — say hi 👋
          </p>
        )}

        {messages.map((msg) => {
          const senderUsername = getSenderUsername(msg);

          return (
            <div className="message" key={msg.id}>
              <div className="message-avatar">
                {senderUsername.charAt(0).toUpperCase()}
              </div>

              <div className="message-content">
                <div className="message-top">
                  <strong>{senderUsername}</strong>

                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p>{msg.message}</p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Typing Indicator */}
      <TypingIndicator
        channelName={recipient.username}
        socket={socket}
        currentUserId={user.id}
      />

      {/* Message Composer */}
      <div className="message-composer">
        <button className="composer-icon" title="Emoji">
          😊
        </button>

        <input
          type="text"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipient.username}`}
        />

        <button className="send-button" onClick={handleSend}>
          Send
        </button>
      </div>
    </main>
  );
}

export default DirectChatWindow;
