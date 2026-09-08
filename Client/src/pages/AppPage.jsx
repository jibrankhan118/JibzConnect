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
  activeCall,
  unreadCounts,
  onLogout,
  onCallInitiated,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  refreshChannels,
}) {
  return (
    <div className="app">
      <Navbar
        user={user}
        onLogout={onLogout}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        isSidebarOpen={isSidebarOpen}
        socket={socket}
        token={token}
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

        {activeCall ? (
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

        <AIChatBox token={token} />
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

export default AppPage;
