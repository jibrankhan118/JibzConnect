import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Sidebar from "./components/sidebar";
import ChatWindow from "./components/chatWindow";
import DirectChatWindow from "./components/DirectChatWindow";
import IncomingCallModal from "./components/IncomingCallModal";
import ActiveCallWindow from "./components/ActiveCallWindow";
import AuthForm from "./components/AuthForm";
import AppPage from "./pages/AppPage";

import "./App.css";

function AppContent() {
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const [users, setUsers] = useState([]);
  const [selectedDMUser, setSelectedDMUser] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);

  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCallRecipient, setOutgoingCallRecipient] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  const [unreadCounts, setUnreadCounts] = useState({});

  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("jibzconnect_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(
    () => sessionStorage.getItem("jibzconnect_token") || "",
  );

  useEffect(() => {
    if (user) {
      sessionStorage.setItem("jibzconnect_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("jibzconnect_user");
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      sessionStorage.setItem("jibzconnect_token", token);
    } else {
      sessionStorage.removeItem("jibzconnect_token");
    }
  }, [token]);

  // Keep one authenticated socket alive for direct messages and 1-to-1 calls.
  useEffect(() => {
    if (!token || !user) return;

    const newSocket = io("http://localhost:5000", {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("App socket connected:", newSocket.id);
    });

    newSocket.on("incomingCall", (call) => {
      setIncomingCall(call);
    });

    newSocket.on("callAccepted", ({ recipientId }) => {
      setOutgoingCallRecipient((recipient) => {
        if (recipient && recipient.id === recipientId) {
          setActiveCall({
            recipient,
            isInitiator: true,
          });

          return null;
        }

        return recipient;
      });
    });

    newSocket.on("callRejected", ({ recipientId }) => {
      setOutgoingCallRecipient((recipient) =>
        recipient?.id === recipientId ? null : recipient,
      );
    });

    newSocket.on("callEnded", () => {
      setActiveCall(null);
      setOutgoingCallRecipient(null);
      setIncomingCall(null);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token, user]);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (message) => {
      if (message.channel && message.channel !== selectedChannel?.name) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.channel]: (prev[message.channel] || 0) + 1,
        }));
      }
    };

    socket.on("receiveMessage", handleIncoming);

    return () => socket.off("receiveMessage", handleIncoming);
  }, [socket, selectedChannel?.name]);

  useEffect(() => {
    if (selectedChannel?.name) {
      setUnreadCounts((prev) => ({
        ...prev,
        [selectedChannel.name]: 0,
      }));
    }
  }, [selectedChannel?.name]);

  const fetchChannels = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/channels", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setChannels(data);

        setSelectedChannel((current) => {
          if (current) {
            const stillExists = data.find(
              (channel) => channel.id === current.id,
            );

            return stillExists || data[0] || null;
          }

          return data[0] || null;
        });
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };

  // Fetches every other registered user, for the Direct Messages list
  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchChannels();
      fetchUsers();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAuthSuccess = (loggedInUser, authToken) => {
    setUser(loggedInUser);
    setToken(authToken);

    navigate("/app", { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    setToken("");

    setChannels([]);
    setSelectedChannel(null);

    setUsers([]);
    setSelectedDMUser(null);

    setIncomingCall(null);
    setOutgoingCallRecipient(null);
    setActiveCall(null);

    navigate("/login", { replace: true });
  };

  const handleCallInitiated = (recipient) => {
    setOutgoingCallRecipient(recipient);
  };

  const handleCancelOutgoingCall = () => {
    if (socket && outgoingCallRecipient) {
      socket.emit("endCall", { recipientId: outgoingCallRecipient.id });
    }
    setOutgoingCallRecipient(null);
  };

  const handleAcceptCall = () => {
    if (!socket || !incomingCall) return;

    const caller = {
      id: incomingCall.callerId,
      username: incomingCall.callerName,
    };

    socket.emit("acceptCall", {
      callerId: incomingCall.callerId,
      recipientId: user.id,
    });

    setIncomingCall(null);

    setActiveCall({
      recipient: caller,
      isInitiator: false,
    });
  };

  const handleRejectCall = () => {
    if (!socket || !incomingCall) return;

    socket.emit("rejectCall", {
      callerId: incomingCall.callerId,
      recipientId: user.id,
    });

    setIncomingCall(null);
  };

  const handleEndCall = () => {
    setActiveCall(null);
    setOutgoingCallRecipient(null);
    setIncomingCall(null);
  };

  // Selecting a channel exits DM mode
  // and updates the URL.
  const handleSelectChannel = (channel) => {
    setSelectedDMUser(null);
    setSelectedChannel(channel);
    setIsSidebarOpen(false);

    navigate(`/app/channel/${encodeURIComponent(channel.name)}`);
  };

  // Selecting a DM user exits channel view
  // and updates the URL.
  const handleSelectDMUser = (dmUser) => {
    setSelectedDMUser(dmUser);
    setSelectedChannel(null);
    setIsSidebarOpen(false);

    navigate(`/app/dm/${dmUser.id}`);
  };

  return (
    <Routes>
      {/* LOGIN ROUTE */}
      <Route
        path="/login"
        element={
          !user || !token ? (
            <AuthForm onAuthSuccess={handleAuthSuccess} />
          ) : (
            <Navigate to="/app" replace />
          )
        }
      />

      {/* MAIN APPLICATION ROUTES */}
      <Route
        path="/app/*"
        element={
          user && token ? (
            <AppPage
              user={user}
              token={token}
              channels={channels}
              selectedChannel={selectedChannel}
              setSelectedChannel={handleSelectChannel}
              users={users}
              selectedDMUser={selectedDMUser}
              setSelectedDMUser={handleSelectDMUser}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              socket={socket}
              incomingCall={incomingCall}
              outgoingCallRecipient={outgoingCallRecipient}
              activeCall={activeCall}
              unreadCounts={unreadCounts}
              onLogout={handleLogout}
              onCallInitiated={handleCallInitiated}
              onCancelOutgoingCall={handleCancelOutgoingCall}
              onAcceptCall={handleAcceptCall}
              onRejectCall={handleRejectCall}
              onEndCall={handleEndCall}
              refreshChannels={fetchChannels}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ANY UNKNOWN URL */}
      <Route
        path="*"
        element={<Navigate to={user && token ? "/app" : "/login"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
