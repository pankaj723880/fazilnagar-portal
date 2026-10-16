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

- **Phase 5: Edit and Delete (Completed)**
  - REST API endpoints in `server/routes/messages.js`:
    - `PATCH /api/messages/conversations/:id/messages/:messageId`: 15-minute edit limit, sender authorization, updates message text, sets `isEdited: true`, updates conversation last message preview, emits `message_edited` via Socket.IO.
    - `DELETE /api/messages/conversations/:id/messages/:messageId`: Supports `deleteType: "me"` (persisted in `message_deletions`) and `deleteType: "everyone"` (sender within 60 minutes or admin, soft-deletes with `"This message was deleted"` tombstone, updates preview, emits `message_deleted`).
  - Frontend UI in `client/src/components/ChatWindow.jsx`:
    - Real-time Socket.IO listeners for `message_edited` and `message_deleted`.
    - Message bubble `(edited)` tag and tombstone placeholder rendering.
    - Hover action toolbar with Edit (pencil) within 15 min and Delete (trash) triggers.
    - Active editing banner with original text and cancel action.
    - Delete confirmation modal offering "Delete for everyone" and "Delete for me".
  - Automated tests: 8/8 Phase 5 tests pass (`npm run test:edit-delete`), 8/8 Phase 4 regression tests pass (`npm run test:moderation`).

- **Phase 6: Group Messaging (Town Community Groups - Completed)**
  - REST API endpoints in `server/routes/messages.js`:
    - `POST /api/messages/conversations/group`: Validates group name (min 2 chars) and selected members, checks block restrictions, sets creator as admin and others as members, creates initial system message, emits `conversation_created`.
    - `GET /api/messages/conversations/:id/members`: Returns populated active members and roles (only accessible to active members).
    - `POST /api/messages/conversations/:id/members`: Admin-only endpoint to add new members, creates system message, notifies group and new members in real time.
    - `DELETE /api/messages/conversations/:id/members/:memberId`: Admin can remove members; any member can leave group; auto-promotes next member to admin if only admin departs; emits `member_left` and updates preview.
    - `PATCH /api/messages/conversations/:id/group`: Admin-only update for group name, description, and avatar; emits `group_updated`.
  - Frontend UI components:
    - `client/src/components/CreateGroupModal.jsx`: Modal for group title, description, and debounced multi-citizen search/selection.
    - `client/src/components/GroupDetailsModal.jsx`: Modal displaying group metadata, member roster with Admin badges, inline Add Member drawer (admin-only), Remove Member triggers (admin-only), and Leave Group action.
    - `client/src/components/ConversationList.jsx`: Added "New Group" header button, "Groups" filter tab, and group conversation cards with avatars and tags.
    - `client/src/components/ChatWindow.jsx`: Group header with quick info trigger, options dropdown for Group Details & Leave Group, and sender name tags on incoming group messages.
    - `client/src/pages/Messages.jsx`: Connected group creation and real-time socket events (`conversation_created`, `conversation_left`, `group_updated`).
  - Automated tests: 12/12 Phase 6 tests pass (`npm run test:group`), 8/8 Phase 5 tests pass (`npm run test:edit-delete`), 8/8 Phase 4 tests pass (`npm run test:moderation`).

- **Phase 7: Media, Attachments & Image Sharing (Completed)**
  - REST API endpoint in `server/routes/messages.js`:
    - `POST /api/messages/conversations/:id/media`: Multer multipart upload with 5 MB limit, strict MIME filter (JPEG, PNG, WebP), stored in `server/uploads/messages/`, creates `type: "image"` message with optional caption, updates conversation preview (`📷 Photo`), increments unread counters, and emits real-time socket events.
  - Frontend UI components:
    - `client/src/components/ChatWindow.jsx`: Photo attachment trigger button, hidden file input, active attachment preview tray with thumbnail and remove button, inline photo rendering in message bubbles, and full-screen image Lightbox modal with zoom and direct download.
  - Automated tests: 6/6 Phase 7 tests pass (`npm run test:media`), 12/12 Phase 6 tests pass (`npm run test:group`), 8/8 Phase 5 tests pass (`npm run test:edit-delete`).

- **Phase 8: Offline PWA, Presence & Delivery Polish (Completed)**
  - REST API & Real-time Presence:
    - In-memory `onlineUsers` Map in `server/socket.js` tracking active socket sets per citizen.
    - Emits `user_online` and `user_offline` broadcasts to all connected clients on connection transitions.
    - Socket listener `get_online_users` providing active citizen list on demand.
    - Added `GET /api/messages/presence` endpoint in `server/routes/messages.js` for initial presence state synchronization.
  - Audio Notifications:
    - Pure Web Audio API synthesis `playMessageChime()` in `client/src/socket.js` playing two-tone pleasant notification chime (659Hz -> 880Hz) without any external audio asset dependencies (100% offline-compatible).
    - Wired to incoming message socket events in `client/src/pages/Messages.jsx` when message is from another citizen.
  - Presence UI:
    - `client/src/components/ConversationList.jsx`: Real-time green presence badge on direct chat avatars.
    - `client/src/components/ChatWindow.jsx`: Dynamic "Online" status with pulsing green indicator vs "Offline" label in 1-to-1 chat header.
  - Offline PWA & Outbox Queueing:
    - `client/src/components/ChatWindow.jsx`: Browser `online` / `offline` event monitoring with amber banner alert when disconnected.
    - Outgoing messages created when offline are saved with `status: "queued"` and clock badge.
    - Automatic queue flush replay when network connection is restored or socket reconnects.
  - Automated tests: 6/6 Phase 8 tests pass (`npm run test:presence`), 6/6 Phase 7 tests pass (`npm run test:media`), 12/12 Phase 6 tests pass (`npm run test:group`), 8/8 Phase 5 tests pass (`npm run test:edit-delete`).
  - Production build: `npm run build` completed cleanly in 6.07s with zero errors.

## All 8 Phases Successfully Completed
The Fazilnagar Town Portal messaging architecture is fully implemented and operating 100% without Supabase on MongoDB Atlas + Socket.IO + Express on Render and React + Vite on Vercel.

## Key File Paths
- Report Model: `server/models/Report.js`
- Block Model: `server/models/Block.js`
- Conversation Model: `server/models/Conversation.js`
- ConversationMember Model: `server/models/ConversationMember.js`
- Message Model: `server/models/Message.js`
- MessageDeletion Model: `server/models/MessageDeletion.js`
- Messages Routes: `server/routes/messages.js`
- Create Group Modal: `client/src/components/CreateGroupModal.jsx`
- Group Details Modal: `client/src/components/GroupDetailsModal.jsx`
- ChatWindow Component: `client/src/components/ChatWindow.jsx`
- ConversationList Component: `client/src/components/ConversationList.jsx`
- Phase 7 Test Suite: `server/tests/mediaAttachmentsPhase7.test.js`

## Database Architecture
- Database: MongoDB Atlas (`users`, `blocks`, `reports`, `conversations`, `conversation_members`, `messages`, `message_deletions`).
- Real-time Transport: Persistent Socket.IO on Render Express server with JWT handshake authentication.
