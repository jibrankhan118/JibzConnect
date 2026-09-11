import { useState } from "react";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import ChatWindow from "../components/chatWindow";
import DirectChatWindow from "../components/DirectChatWindow";
import IncomingCallModal from "../components/IncomingCallModal";
import ActiveCallWindow from "../components/ActiveCallWindow";
import AIChatBox from "../components/AIChatBox";

function AppPage({
  user,
  token,
  channels,
  selectedChannel,
  setSelectedChannel,
  users,
  selectedDMUser,
  setSelectedDMUser,
  isSidebarOpen,
  setIsSidebarOpen,
  socket,
  incomingCall,
  outgoingCallRecipient,
  activeCall,
  unreadCounts,
  onLogout,
  onCallInitiated,
  onCancelOutgoingCall,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  refreshChannels,
}) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="app">
      <Navbar
        user={user}
        onLogout={onLogout}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        isSidebarOpen={isSidebarOpen}
        socket={socket}
        token={token}
        onOpenAI={() => setIsAIChatOpen(true)}
        isAIChatOpen={isAIChatOpen}
      />

      <div className="content">
        <Sidebar
          channels={channels}
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          users={users}
          selectedDMUser={selectedDMUser}
          setSelectedDMUser={setSelectedDMUser}
          token={token}
          refreshChannels={refreshChannels}
          socket={socket}
          unreadCounts={unreadCounts}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {outgoingCallRecipient ? (
          <main style={outgoingCallWindowStyle}>
            <h2>Calling {outgoingCallRecipient.username}</h2>
            <p style={{ color: "#cbd5e1" }}>Ringing...</p>
            <button onClick={onCancelOutgoingCall} style={cancelCallButtonStyle}>
              ✕ Cancel Call
            </button>
          </main>
        ) : activeCall ? (
          <ActiveCallWindow
            recipient={activeCall.recipient}
            socket={socket}
            isInitiator={activeCall.isInitiator}
            onEndCall={onEndCall}
          />
        ) : selectedDMUser ? (
          <DirectChatWindow
            recipient={selectedDMUser}
            user={user}
            token={token}
            socket={socket}
            onCallInitiated={onCallInitiated}
          />
        ) : selectedChannel ? (
          <ChatWindow
            selectedChannel={selectedChannel}
            user={user}
            token={token}
            refreshChannels={refreshChannels}
            socket={socket}
          />
        ) : (
          <main className="chat-window">
            <p style={{ padding: "20px" }}>Loading channels...</p>
          </main>
        )}

        <AIChatBox
          token={token}
          user={user}
          socket={socket}
          onCallInitiated={onCallInitiated}
          isOpen={isAIChatOpen}
          onOpenChange={setIsAIChatOpen}
        />
      </div>

      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall}
          onAccept={onAcceptCall}
          onReject={onRejectCall}
        />
      )}
    </div>
  );
}

const outgoingCallWindowStyle = {
  flex: 1,
  background: "linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
};

const cancelCallButtonStyle = {
  padding: "14px 32px",
  fontSize: "16px",
  backgroundColor: "#f97316",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

export default AppPage;
