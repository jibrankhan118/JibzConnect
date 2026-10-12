# JibzConnect — Agentic AI Communication Platform

JibzConnect is a full-stack, real-time communication platform that combines direct messaging, channels, voice and video calling, user presence, notifications, and an **agentic AI assistant powered by Retrieval-Augmented Generation (RAG) and persistent AI memory**.

Unlike a conventional chatbot, JibzConnect's AI assistant can retrieve authorized application data and execute real application actions, including sending messages, creating channels, managing channel members, and initiating voice calls. Its memory system persists AI-related context in PostgreSQL, enabling continuity beyond a single conversation.

## Key Features

### 💬 Real-Time Communication

* Direct messaging between users
* Real-time message delivery using Socket.IO
* Channel creation and management
* Channel member management
* Admin and member roles
* Add and remove channel members
* Promote and demote channel members
* Message search and retrieval
* Message reactions
* Typing indicators
* Online/offline presence
* Real-time notifications
* Voice message recording and sending in direct messages and channels

### 📞 Voice & Video Calling

* Voice calling using WebRTC
* Video calling using WebRTC
* Real-time call signaling with Socket.IO
* Incoming and outgoing call handling
* Call acceptance and termination
* Active call interface
* AI-triggered voice call initiation through the existing calling workflow

### 👤 User Profile Management

* Dedicated profile page
* Profile viewing and editing
* Responsive profile interface
* Integration with the main application navigation

### 🤖 Agentic AI Assistant

JibzConnect integrates an application-aware AI assistant that combines conversational intelligence, live application data, RAG, persistent AI memory, and action execution.

**AI capabilities include:**

* Context-aware AI conversations
* Application-aware assistance
* RAG-based application knowledge retrieval
* Persistent AI memory backed by PostgreSQL
* AI conversation history
* User lookup
* Authorized direct-message retrieval
* Channel and channel-message retrieval
* Message search
* AI-powered message sending
* AI-powered channel creation
* AI-powered channel member management
* AI-powered channel deletion with confirmation
* AI-powered member removal with confirmation
* AI-triggered voice call initiation
* Browser-based voice input
* Manual AI response read-aloud
* Allowlisted action execution
* Confirmation for destructive actions

The assistant is designed to bridge conversational AI and real application functionality, allowing users to interact with JibzConnect through natural-language requests.

### 🧠 Persistent AI Memory

JibzConnect includes a persistent AI memory system backed by PostgreSQL.

* Stores AI-related memory persistently
* Maintains AI conversation history
* Supports continuity beyond the immediate conversation
* Combines persistent memory with recent conversational context
* Complements RAG-based knowledge retrieval and live application data access

Persistent memory, conversation history, and RAG serve different purposes: memory preserves relevant AI context, conversation history retains previous interactions, and RAG retrieves relevant information from the knowledge base.

### 📚 RAG & Knowledge System

The Retrieval-Augmented Generation pipeline provides knowledge retrieval grounded in stored application information.

* Application knowledge ingestion
* Document chunking
* Vector embeddings
* PostgreSQL vector storage using pgvector
* Similarity-based retrieval
* Access-controlled retrieval
* User access filtering for private information
* Channel and direct-message-aware knowledge retrieval
* Knowledge synchronization endpoint

The system uses embeddings and vector similarity to retrieve relevant knowledge for AI responses, with access filtering intended to protect private application data.

### ✉️ Transactional Email

JibzConnect uses SendGrid for transactional email delivery.

* Welcome emails after successful user registration
* Reusable email templates
* Server-side email service
* Environment-based email configuration
* Best-effort email delivery

Email delivery failure does not roll back an account that has already been successfully created.

### 🔐 Authentication & Security

* JWT authentication
* Protected REST APIs
* Authenticated AI requests
* User-scoped direct-message access
* Channel membership authorization
* Admin-only channel management operations
* Access-controlled knowledge retrieval
* Confirmation required for destructive AI actions
* Server-side storage of sensitive API credentials

## Technology Stack

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
* Sequelize ORM
* PostgreSQL
* JWT authentication
* SendGrid

### AI & RAG

* OpenRouter
* `openai/gpt-4o-mini` through OpenRouter
* Google Gemini embeddings
* PostgreSQL with pgvector
* Retrieval-Augmented Generation (RAG)
* Persistent AI memory
* Deterministic action routing
* Allowlisted tool registry

## AI Architecture

JibzConnect combines conversational AI, persistent memory, knowledge retrieval, live application data, and controlled action execution.

```text
User
  |
  v
React AI Chat Interface
  |
  v
Authenticated AI API
  |
  v
AI Request Processing
  |
  +-----------------------------+
  |                             |
  v                             v
Persistent AI Memory        Recent Chat History
(PostgreSQL)                 (Conversation Context)
  |                             |
  +--------------+--------------+
                 |
                 v
       Action / Data Routing
                 |
       +---------+----------+
       |         |          |
       v         v          v
   Application  Live Data   RAG Pipeline
     Actions    Retrieval       |
       |         |              v
       |         |         Vector Search
       |         |              |
       |         |              v
       |         |         Access Filtering
       |         |              |
       +---------+--------------+
                 |
                 v
             AI Model
                 |
                 v
            AI Response
```

### Action Execution

The backend uses deterministic request parsing and an allowlisted tool registry to route supported requests to application operations.

Supported actions include:

* Sending messages
* Creating and deleting channels
* Adding and removing channel members
* Retrieving channel and direct-message information
* Searching messages
* Looking up users
* Initiating voice calls through the existing frontend calling workflow

Destructive actions require confirmation.

**Current architecture:** JibzConnect is an agentic AI application with real action-execution capabilities, RAG, and persistent memory. Action routing is primarily deterministic rather than based on native LLM function calling. General multi-step planning and autonomous tool selection remain areas for future development.

## Real-Time Architecture

Socket.IO handles real-time messaging, notifications, presence, typing indicators, and call signaling.

```text
React Client
     |
     v
Socket.IO Client
     |
     v
Node.js + Socket.IO Server
     |
     +-- Messaging
     +-- Notifications
     +-- Presence
     +-- Typing Indicators
     +-- Call Signaling
              |
              v
            WebRTC
              |
              v
        Voice / Video Calls
```

## Project Structure

```text
JibzConnect/
|
+-- Client/
|   +-- src/
|       +-- components/
|       |   +-- AIChatBox.jsx
|       |   +-- ProfilePage.jsx
|       |   +-- VoiceMessageRecorder.jsx
|       |   +-- DirectChatWindow.jsx
|       |   +-- chatWindow.jsx
|       |
|       +-- pages/
|       +-- App.jsx
|
+-- Server/
    +-- controllers/
    +-- routes/
    +-- services/
    |   +-- aiTools.js
    |   +-- knowledgeSync.js
    |   +-- emailService.js
    |   +-- emailTemplates.js
    +-- models/
    +-- middleware/
    +-- server.js
    +-- .env.example
```

*Note: This is a representative overview of the project's main components, not an exhaustive listing of every file.*

## Environment Configuration

Create a `Server/.env` file using the project's environment template. Configure the required credentials and settings for your local environment.

For transactional email, configure:

```env
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=JibzConnect
CLIENT_URL=http://localhost:5173
```

* `SENDGRID_API_KEY` must contain your SendGrid API key.
* `SENDGRID_FROM_EMAIL` must be a sender verified in SendGrid.
* `SENDGRID_FROM_NAME` sets the displayed sender name.
* `CLIENT_URL` specifies the frontend URL used by the application.

Configure the remaining database, authentication, and AI environment variables according to `Server/.env.example` and the existing project configuration.

**Security note:** Never commit real API keys, passwords, JWT secrets, or other credentials. Keep secrets in server-side environment variables.

## Current AI Capability Status

| Capability                                | Status          |
| ----------------------------------------- | --------------- |
| General AI conversation                   | Implemented     |
| Application-aware assistance              | Implemented     |
| RAG-based knowledge retrieval             | Implemented     |
| Persistent AI memory using PostgreSQL     | Implemented     |
| AI conversation history                   | Implemented     |
| User lookup and authorized data retrieval | Implemented     |
| AI-powered message sending                | Implemented     |
| AI-powered channel creation               | Implemented     |
| AI-powered channel member management      | Implemented     |
| AI-powered channel deletion               | Implemented     |
| Destructive-action confirmation           | Implemented     |
| AI-triggered voice call initiation        | Implemented     |
| Browser-based voice input                 | Implemented     |
| Manual AI response read-aloud             | Implemented     |
| Native LLM function calling               | Not implemented |
| General multi-step autonomous planning    | Limited         |
| Automatic AI voice responses              | Not implemented |
| AI-controlled frontend navigation         | Not implemented |

## Development Roadmap

Ongoing and potential improvements include:

* More flexible multi-step agent planning
* LLM-native function calling
* Improved tool selection and execution feedback
* Further RAG retrieval optimization
* Enhanced persistent memory management
* Expanded responsive UI and accessibility
* More comprehensive API and end-to-end testing
* Further improvements to real-time calling

## Project Status

JibzConnect is an actively developed full-stack communication platform with an agentic AI assistant, persistent AI memory, RAG-based knowledge retrieval, and real application action execution.

The project brings together real-time collaboration, user-facing communication tools, and application-aware AI capabilities in a single platform.

## Author

**Jibran Jalil**

GitHub Repository: https://github.com/jibrankhan118/JibzConnect
