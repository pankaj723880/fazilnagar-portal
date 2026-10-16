# Town Messaging Implementation Progress

## Done Phases
- **Audit & Supabase Removal**
  - Audited and stripped `@supabase/supabase-js`, `client/src/supabase.js`, `SupabaseAuthContext.jsx`, SQL migrations, and Supabase env variables.
  - Re-anchored messaging directly to existing portal JWT auth and MongoDB Atlas user accounts.

- **Phase 1: Profiles and Authentication (MongoDB Atlas + Socket.IO)**
  - Enhanced MongoDB `users` schema with: `username` (unique, sparse), `avatar`, `area`, `bio`, `showEmail`, `findByEmail`, `whoCanMessage`, `lastSeenVisible`, `lastSeen`.
  - Added backend endpoints: `GET /api/profile/me`, `PATCH /api/profile/me`, and `POST /api/profile/avatar`.
  - Added Socket.IO server on Express backend (`server/socket.js`) authenticated via existing JWT tokens; client helper in `client/src/socket.js`.
  - Created `ProfileEdit.jsx` and `Messages.jsx` connected to Express API; guarded with `RequireMessagingAuth.jsx`.

- **Phase 2: User Search (Privacy-Aware Directory Discovery)**
  - Created `server/models/Block.js` with compound index (`{ blocker: 1, blocked: 1 }`).
  - Added search indexes to `server/models/User.js`: `{ name: 1 }`, `{ findByEmail: 1, email: 1 }`.
  - Implemented `GET /api/users/search` endpoint:
    - Debounced, minimum 2 characters query validation.
    - Matches display name or @username (case-insensitive with full Hindi/Devanagari support).
    - Exact email match supported only when `findByEmail: true`.
    - Automatically excludes caller and any blocked users (both directions).
    - Privacy-aware payload: masks email if `showEmail: true`, never leaks password, phone, role.
  - Created reusable `client/src/components/UserSearch.jsx` with 300 ms debounce.

- **Phase 3: One-to-One Real-Time Chat (MongoDB Atlas + Socket.IO)**
  - Created MongoDB collections & models:
    - `server/models/Conversation.js`: Direct/group conversations with status (active, pending, declined, blocked), initiator, lastMessage, and pin/archive flags.
    - `server/models/ConversationMember.js`: Per-member membership, role, status, unreadCount, and lastReadAt read states.
    - `server/models/Message.js`: Message content, type, replyTo reference, edit/deletion timestamps, and `clientMessageId` for reconnect deduplication.
    - `server/models/MessageDeletion.js`: Per-user "delete for me" records.
  - Added REST API routes in `server/routes/messages.js`:
    - `GET /api/messages/conversations`: Lists conversations with populated partner details and unread badges.
    - `POST /api/messages/conversations/direct`: Initiates or retrieves 1:1 conversation; enforces block checks and privacy-aware message requests.
    - `GET /api/messages/conversations/:id/messages`: Paginated message history (latest 30 by default, before cursor support, populates replyTo, auto marks read).
    - `POST /api/messages/conversations/:id/messages`: Sends message with clientMessageId deduplication, rate limiting, and room broadcast.
    - `POST /api/messages/conversations/:id/respond`: Accept, Decline, or Block pending message requests.
    - `POST /api/messages/conversations/:id/read`: Marks messages as read.
  - Real-time Socket.IO (`server/socket.js`):
    - `join_conversation`: Validates membership on server before allowing socket into `conv:${id}` room.
    - `send_message`: Persists to MongoDB, updates conversation, broadcasts to conversation room and recipient user rooms.
    - `typing` and `stop_typing` indicator broadcasts.
    - `mark_read`: Emits `conversation_read` and resets unread count.
  - Built frontend components:
    - `client/src/components/ConversationList.jsx`: Chat navigation with unread badges, timestamps, and separate Message Requests tab.
    - `client/src/components/ChatWindow.jsx`: Chat view with optimistic message sending, retry on failure, reply quotes, request banner (Accept/Decline/Block), and typing indicator.
    - Integrated into `client/src/pages/Messages.jsx` with responsive mobile/desktop layout and citizen search modal.
  - Automated tests: 7/7 Phase 3 chat tests passed (`npm run test:chat`), 37/37 regression tests passed (`npm test`), and client production build passed cleanly.

- **Phase 4: Blocking, Reporting and Moderation (Completed)**
  - Created `server/models/Report.js` (`reporter`, `targetUser`, `targetMessage`, `targetConversation`, `reason`, `details`, `status`, `moderatedBy`, `moderatedAt`, `moderatorNotes`).
  - Added REST API endpoints in `server/routes/messages.js`:
    - `POST /api/messages/block`: Upserts into `blocks` collection, switches direct conversation to `blocked`.
    - `POST /api/messages/unblock`: Removes block, restores conversation to `active`.
    - `GET /api/messages/blocked`: Returns citizens blocked by the caller.
    - `POST /api/messages/report`: Saves citizen report (spam, harassment, inappropriate, fraud, other) into `reports`.
    - `GET /api/messages/moderation/reports`: Admin-only paginated report listing with status filtering.
    - `PATCH /api/messages/moderation/reports/:id`: Admin-only report status update (action_taken, dismissed), moderator notes, and optional user suspension.
  - Built frontend UI:
    - `client/src/components/ReportModal.jsx`: Citizen report dialogue with reason selector and details text.
    - `client/src/components/ChatWindow.jsx`: Options dropdown (Report Citizen, Block Citizen), hover message report flag, and blocked conversation banner replacing message input.
    - `client/src/components/admin/AdminModerationCMS.jsx`: Admin moderation desk with status pills, search, report details, flagged message preview, moderator notes, and citizen suspension.
    - Mounted in `client/src/pages/AdminReview.jsx` and `AdminSidebar.jsx` under `SECURITY` (`tab=moderation-reports`).
  - Automated tests: 8/8 Phase 4 tests pass (`npm run test:moderation`), client production build passed cleanly.

## Next Phase
- **Phase 5: Edit and Delete (Soft Delete, Audit & Time Limits)**
  - Message editing with 15-minute time window, edit history flag (`isEdited: true`), and original body preservation.
  - "Delete for everyone" within time window (soft delete, tombstone placeholder).
  - "Delete for me" via `message_deletions` collection without affecting other participants.
  - Real-time Socket.IO sync for message edits and deletions (`message_edited`, `message_deleted`).

## Key File Paths
- Report Model: `server/models/Report.js`
- Block Model: `server/models/Block.js`
- Conversation Model: `server/models/Conversation.js`
- ConversationMember Model: `server/models/ConversationMember.js`
- Message Model: `server/models/Message.js`
- Messages Routes: `server/routes/messages.js`
- Report Modal: `client/src/components/ReportModal.jsx`
- Admin Moderation CMS: `client/src/components/admin/AdminModerationCMS.jsx`
- Admin Review Desk: `client/src/pages/AdminReview.jsx`
- ChatWindow Component: `client/src/components/ChatWindow.jsx`
- Phase 4 Test Suite: `server/tests/moderationPhase4.test.js`

## Database Architecture
- Database: MongoDB Atlas (`users`, `blocks`, `reports`, `conversations`, `conversation_members`, `messages`, `message_deletions`).
- Real-time Transport: Persistent Socket.IO on Render Express server with JWT handshake authentication.
