# JibzConnect

A full-stack real-time communication platform with direct messaging, channels, voice/video calling, notifications, presence, and an AI-powered action assistant with RAG capabilities.

## Features

### 💬 Real-Time Communication

* Direct messaging between users
* Real-time message delivery using Socket.IO
* Channel creation and management
* Channel member management
* Admin and member roles
* Add/remove channel members
* Promote/demote channel members
* Message search and retrieval
* Message reactions
* Typing indicators
* Online/offline presence
* Real-time notifications

### 📞 Voice & Video Calling

* Voice calling using WebRTC
* Video calling using WebRTC
* Real-time call signaling with Socket.IO
* Incoming and outgoing call handling
* Call acceptance and termination
* Active call interface

### 🤖 AI Assistant & Agenting

* AI-powered chat assistant
* Application-aware AI assistance
* RAG-based application knowledge retrieval
* Access-controlled retrieval of channels, messages, and direct messages
* AI conversation history
* AI user lookup
* AI-powered message sending
* AI-powered channel creation
* AI-powered channel member management
* AI-powered channel deletion with confirmation
* AI-powered member removal with confirmation
* AI-triggered voice call initiation
* Deterministic action routing with an allowlisted tool registry
* Browser-based voice input
* Manual AI response read-aloud

### 🧠 RAG / Knowledge System

* Application knowledge ingestion
* Document chunking
* Vector embeddings
* PostgreSQL vector storage
* Similarity-based retrieval
* User access filtering for private data
* Channel and DM-aware knowledge retrieval
* Knowledge synchronization endpoint

### 🔐 Authentication & Security

* JWT authentication
* Protected REST APIs
* Authenticated AI requests
* User-scoped direct message access
* Channel membership authorization
* Admin-only channel management actions
* Confirmation required for destructive AI actions

## Technologies

### Frontend

* React.js
* JavaScript
* CSS
* Socket.IO Client
* WebRTC
* Browser Speech Recognition
* Browser Speech Synthesis

### Backend

* Node.js
* Express.js
* Socket.IO
* Sequelize
* PostgreSQL
* JWT Authentication

### AI & RAG

* OpenRouter
* OpenAI GPT-4o-mini
* Google Gemini Embeddings
* PostgreSQL `pgvector`
* Retrieval-Augmented Generation (RAG)

## AI Architecture

JibzConnect uses an application-aware AI architecture combining conversational AI, RAG, live application data, and action execution.

```text
User
 │
 ▼
React AI Chat
 │
 ▼
AI API
 │
 ▼
Authentication
 │
 ▼
Action / Data Routing
 ├── Application Actions
 │    ├── Send Message
 │    ├── Create Channel
 │    ├── Manage Members
 │    ├── Delete Channel
 │    └── Start Voice Call
 │
 ├── Live Application Data
 │    ├── Channels
 │    ├── Direct Messages
 │    ├── Channel Messages
 │    └── Message Search
 │
 └── RAG
      ├── Knowledge Retrieval
      ├── Vector Search
      └── Access Filtering
 │
 ▼
LLM
 │
 ▼
AI Response
```

The current implementation is an **early functional action agent with RAG**. It supports real application actions and protected application-data retrieval, while action routing is primarily handled through deterministic backend parsing and an allowlisted tool registry.

## Project Structure

```text
JibzConnect/
│
├── Client/
│   └── React frontend
│
└── Server/
    ├── controllers/
    ├── routes/
    ├── services/
    ├── models/
    ├── middleware/
    └── server.js
```

## Core AI Components

```text
Client/src/components/AIChatBox.jsx
Client/src/App.jsx

Server/routes/aiRoutes.js
Server/controllers/aiController.js
Server/services/aiTools.js

Server/services/knowledgeSync.js
Server/controllers/knowledgeController.js
Server/routes/knowledgeRoutes.js
Server/models/KnowledgeDocument.js
```

## Real-Time Architecture

JibzConnect uses **Socket.IO** for real-time communication and signaling.

```text
React Client
     │
     ▼
Socket.IO Client
     │
     ▼
Node.js + Socket.IO Server
     │
     ├── Messaging
     ├── Notifications
     ├── Presence
     ├── Typing Indicators
     └── Call Signaling
              │
              ▼
          WebRTC
              │
              ▼
       Voice / Video Call
```

## Security

The application uses authentication and authorization throughout the platform.

* JWT-protected API routes
* Authenticated AI requests
* User-scoped DM retrieval
* Channel membership verification
* Admin authorization for channel management
* Protected message search
* Access-controlled RAG retrieval
* Confirmation before destructive AI actions

## Current AI Agent Capabilities

| Capability                       | Status     |
| -------------------------------- | ---------- |
| General AI conversation          | ✅          |
| Application knowledge via RAG    | ✅          |
| User lookup                      | ✅          |
| DM retrieval                     | ✅          |
| Channel retrieval                | ✅          |
| Message search                   | ✅          |
| Send DM through AI               | ✅          |
| Create channel through AI        | ✅          |
| Add channel member through AI    | ✅          |
| Remove channel member through AI | ✅          |
| Delete channel through AI        | ✅          |
| Voice call initiation through AI | ✅          |
| Voice input                      | ✅          |
| Read Aloud                       | ✅          |
| Persistent AI history            | ✅          |
| Destructive-action confirmation  | ✅          |
| General multi-step planning      | ⚠️ Limited |
| LLM-native function calling      | ❌          |
| Automatic AI voice responses     | ❌          |
| AI frontend navigation           | ❌          |

## Development Status

JibzConnect is an actively developed full-stack project focused on combining real-time communication with application-aware AI agent capabilities.

Current development areas include:

* AI agent improvements
* RAG optimization
* Responsive UI
* Real-time calling
* Application-aware AI actions
* QA and API testing
* Improved multi-step agent workflows

## Author

**Jibran Jalil**

GitHub: [JibzConnect](https://github.com/jibrankhan118/JibzConnect)
