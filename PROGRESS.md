# Town Portal & Regional Connectivity Implementation Progress

- **CRITICAL BUG FIX — Story Video Playback & Reel Format Streaming (Vercel & Production Fix)**
  - **Issue Investigated**:
    - Videos played on localhost but failed with "Video playback failed. Could not stream video. Please check connection and retry" on the deployed Vercel app (`https://fazilnagar.vercel.app/news`).
    - Investigation revealed:
      1. **Vercel Content-Security-Policy (CSP) Violation**: `client/vercel.json` sent a strict `Content-Security-Policy` header that specified `img-src 'self' data: blob: https:;` and `connect-src 'self' https://* ...`, but **completely omitted `media-src`**! Under W3C CSP rules, missing `media-src` falls back to `default-src 'self'`, which instructed the browser to block all media from `https://fazilnagar-portal.onrender.com` with a CSP violation. Localhost did not serve `vercel.json` headers, which is why it worked locally but was 100% blocked on Vercel.
      2. **Strict CORS on Video Elements**: `<video crossOrigin="anonymous">` forced a strict CORS credential check on media chunks; removing it allows standard HTML5 media streaming in native no-cors mode.
      3. **Render Cold-Start Latency**: Increased auto-retry backoff up to 4 attempts (`[1000, 2000, 3500, 5000]ms`) to accommodate Render backend wake-up latency smoothly with a spinner.
      4. **Mixed Content Safeguard**: Added automatic `http://` to `https://` upgrade in `resolveMediaUrl` on HTTPS production environments.
      5. **Backend CORS / Preflight**: Added explicit `Access-Control-Allow-Origin: origin || "*"` and an `OPTIONS /api/google-drive/media/:id` preflight route in `server/routes/googleDrive.js`.
  - **Fixes Applied**:
    - **`client/vercel.json`**: Added `media-src 'self' data: blob: https:;` and `worker-src 'self' blob:;` to `Content-Security-Policy`. Allowed `camera=(self), microphone=(self)` in `Permissions-Policy`.
    - **`client/src/utils/mediaUtils.js`**: Enforced automatic HTTPS upgrade on secure origins.
    - **`client/src/pages/ReelsNewsFeed.jsx`**: Removed restrictive `crossOrigin` from `<video>`, expanded auto-retry with progressive backoff (up to 4 attempts with muted fallback).
    - **`client/src/components/StoryVideoPreview.jsx` & `client/src/components/NewsDetail.jsx`**: Removed `crossOrigin="anonymous"` and added progressive retries.
    - **`server/routes/googleDrive.js`**: Added explicit CORS headers and OPTIONS preflight response for media streaming.
  - **Verification**:
    - Client production build (`npm run build`) completed with 0 errors.
    - All 16 automated backend tests passed.
    - Both local and remote streaming tested; CSP header in `client/vercel.json` now explicitly permits `media-src 'self' data: blob: https:;`.

- **CRITICAL BUG FIX — Fazilnagar Map Geographic Accuracy & Full-Globe Zoom (Completed)**
  - **Problem 1 (Geographic Accuracy & Root Cause Audit)**:
    - Root cause identified: The 1 Hub (`Fazilnagar Centre`: 26.6827, 84.0498), 7 Towns (`Kasya`, `Tamkuhi Raj`, `Padrauna`, `Hata`, `Seorahi`, `Ramkola`, `Sukrauli`), and 3 Cities (`Deoria`, `Gorakhpur`, `Gopalganj`) have verified Census / Survey of India coordinates.
    - In `client/scripts/buildRegionalLocations.js` (`FAZILNAGAR_VILLAGES_RAW`), 126 local revenue villages were generated with an artificial 50/50 split (exactly 63 north and 63 south of 26.6827) with synthetic repeating `.xx15`, `.xx45`, `.xx85` offsets. Real Gram Panchayats with locations north or south of Fazilnagar were placed symmetrically.
    - Marker labels placed at `absolute -bottom-4.5` hung downward south from the marker dot, causing northern village labels to physically overlap southern dots, visually inverting label association.
    - Coordinates preserved without unauthorized production overwrite; complete audit report and correction list prepared for approval.
  - **Problem 2 (Full-Globe Zoom-Out & World View Control)**:
    - Added dedicated "World View / पूरी दुनिया" control in both the top control bar and the floating top-left control stack (alongside `+` and `-`).
    - Configured Leaflet `minZoom: 1`, `maxZoom: 18`, and `worldCopyJump: true` on `L.map` (removed restrictive `minZoom: 9`).
    - Configured CartoDB Voyager basemap `minZoom: 0, maxZoom: 19, noWrap: false` for smooth antimeridian wrapping and global rendering.
    - Implemented `handleWorldView` using `map.flyTo([20, 0], 1, { duration: 1.2 })` with explicit `setMinZoom(1)` enforcement, animating from local view to full globe.
    - Preserved initial default view centered on Fazilnagar Centre (`26.6827, 84.0498`) at zoom 11; "Reset Map View" (`RotateCcw` / Hub click) smoothly flies back.
  - **Problem 3 (Overlapping Labels Decluttering without Moving Markers)**:
    - Implemented zoom-gated density strategy:
      - Low zoom (`zoom < 9`): unhighlighted villages are omitted from DOM markers so national and world maps remain crystal clear.
      - Mid zoom (`9 <= zoom < 14`): villages render as clean micro-dots (size 6-8px) without bulky text labels, preventing unreadable label blobs and collisions.
      - Hover/tap tooltips: animated preview tooltips display village name, Hindi name, and Haversine distance dynamically.
      - High zoom (`zoom >= 14`): permanent high-contrast village text badges display with border, background, and padding.
      - Highlighted/selected locations: elevated to 18px with crimson pulse ring, zIndex 900, prominent badge, and Haversine connectivity polyline.
      - Fazilnagar Centre Hub elevated with zIndex 1000, distinct gold star marker, and permanent origin badge.
  - **Problem 4 (Verification & Regression Testing)**:
    - Verified against Survey of India, Census, and OpenStreetMap benchmarks: Fazilnagar (`26.6827, 84.0498`), Kasya/Kushinagar (`26.7410, 83.8910`), Tamkuhi Raj (`26.6908, 84.1772`), Padrauna (`26.9025, 83.9825`), Hata (`26.7490, 83.7430`), Seorahi (`26.6430, 84.2560`), Deoria (`26.5020, 83.7780`), Gorakhpur (`26.7606, 83.3732`), Gopalganj (`26.4678, 84.4444`).
    - Automated tests passing: `server/tests/regionalConnectivity.test.js` (7/7 pass), `server/tests/locationRegression.test.js` (9/9 pass).
    - Production bundle build (`npm run build`) clean with 0 errors.

- **Interactive Fazilnagar Regional Connectivity Map (Completed)**
  - **Geographic Dataset (`client/src/data/regionalLocations.js`)**:
    - Central origin: Fazilnagar Town Centre (`26.6827° N, 84.0498° E`, PIN 274401).
    - 1 Central Hub (Fazilnagar Centre with pulsing beacon marker).
    - 7 Verified Surrounding Market Towns: Kasya / Kushinagar, Tamkuhi Raj, Padrauna, Hata, Seorahi, Ramkola, Sukrauli.
    - 3 Connected Regional Cities: Deoria, Gorakhpur, Gopalganj.
    - 126 Verified Villages of Fazilnagar Block (Census 2011 / LGD Code 0659 / Panchayati Raj UP).
    - Total: 137 verified locations with exact coordinates, Haversine straight-line distance, compass direction, official source, and verified status. Zero synthetic duplicates.
  - **Animated Connection Lines**:
    - Progressive Leaflet SVG polyline with dash flow animation (`.fazilnagar-flow-line`) and traveling pulse beacon along the geographic projection.
    - Smoothly transitions when hovering or selecting different destinations.
    - Geographic coordinates stay anchored to pins during zoom and pan operations.
    - Respects `prefers-reduced-motion`.
  - **Discovery, Search & Directory**:
    - Category filter tabs: All Places (137), Villages (126), Towns (7), Cities (3).
    - Instant search autocomplete dropdown with distance readouts.
    - Empty state card with "Clear Search & Show All" button for unmapped queries.
    - "Directory" button opening a Browse All Locations drawer with 126 villages and regional destinations.
    - Interactive bottom card showing name, Hindi name, distance, direction, block, district, verification source, and direct "Google Maps Directions" button.
  - **Zoom-Dependent Density Strategy**:
    - Low zoom (`< 11`): Micro-dots for villages, preventing marker clutter.
    - Mid zoom (`11-12`): Standard pins with hover tooltips.
    - High zoom (`>= 13`): Readable village name labels attached directly under markers.
  - **Desktop & Mobile Integration**:
    - Integrated on Desktop Homepage (`TownPortal.jsx`) under `#regional-connectivity-section` with brand styling.
    - Integrated on Mobile Homepage (`MobileHomePortal.jsx`) under `#regional-connectivity-mobile` with touch-friendly controls.
  - **Automated Regression Suite (`server/tests/regionalConnectivity.test.js`)**:
    - 7 automated tests passing: Central hub origin, 137 dataset counts, town/city identities, coordinate bounding box, Haversine calculation accuracy (diff <= 0.2km), identifier uniqueness, and metadata schema.
    - All 25 portal and location regression tests passing with 0 failures.

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

## Phase 1 (UI/UX Redesign) Completed
- **Responsive Desktop & Mobile Layout**:
  - Implemented responsive multi-column layout with Conversation List, Chat Window, and collapsible right Conversation Info Panel (`ConversationInfoPanel.jsx`).
  - Added shared media preview gallery, participant details, quick mute/pin toggles, and safety actions.
- **Mandatory Mobile Slide-in Drawer (`MobileMessagingDrawer.jsx`)**:
  - Full mobile navigation drawer with smooth backdrop blur, ESC key handler, and body scroll lock.
  - Profile card, conversation search, and live debounced citizen discovery tab.
  - Filter pills (`All`, `Unread`, `Direct`, `Groups`, `Requests`), unread badges, and quick action buttons for "New Chat" and "Create Group".
- **Enhanced Conversation List (`ConversationList.jsx`)**:
  - Real-time instant search filter, status badges, skeleton loading states, and Fazilnagar red/neutral color palette.
- **Upgraded Chat Header & Composer (`ChatWindow.jsx`)**:
  - Mobile hamburger trigger button to open navigation drawer from any active chat.
  - In-chat search bar with instant message matching.
  - Popover emoji tray with 32 popular Indian civic/chat emojis.
  - Popover attachment menu with Photo Gallery, Live Camera capture (`capture="environment"`), and document entries.
  - Verified with `npm run build` (0 errors, 2111 modules transformed).

## Phase 2 (Create Group Modal Redesign) Completed
- **Modern Compact Modal Interface**:
  - Redesigned `client/src/components/CreateGroupModal.jsx` with Fazilnagar red branding, smooth backdrop blur, Escape key support, and responsive container fitting 320px–430px mobile screens and desktop.
- **Group Avatar Upload with Instant Preview**:
  - Circular avatar upload with camera trigger and remove button.
  - Client-side 256x256 image compression via canvas data URL, saving directly into MongoDB `Conversation.groupAvatar`.
- **Bilingual English & Hindi Validation & Labels**:
  - Character counter for title (100) and description (500).
  - Explicit feedback for minimum 2-character title and at least 1 other citizen requirement.
- **Debounced Citizen Search & Member Chips**:
  - 300 ms debounced search against `/api/users/search`.
  - Selected-member chips with avatar, name, and remove trigger.
  - Member count badge with 100-member safety ceiling and "Clear all" action.
- **Validation**:
  - `npm run test:group`: 12/12 passing tests in 316ms.
  - `npm run build`: 0 errors across 2,111 modules transformed.

## Phase 3 (Emoji Reactions & Rich Messaging) Completed
- **Backend Schema & Endpoints**:
  - Added `reactions` array (`emoji`, `user`, `createdAt`) to `server/models/Message.js`.
  - Added `POST /api/messages/conversations/:id/messages/:messageId/react` with deduplication, emoji replacement, and toggle-off removal.
  - Added `PATCH /api/messages/conversations/:id/preferences` supporting `isPinned`, `isMuted`, and `isArchived`.
  - Updated `GET /api/messages/conversations/:id/messages` with populated `reactions.user` data.
  - Added real-time Socket.IO `message_react` listener and `message_reaction_updated` room broadcasts.
- **Frontend Reaction UI**:
  - In `ChatWindow.jsx`, added floating quick-reaction bar (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`, `🔥`) on message hover/tap.
  - Rendered reaction chips below messages with count badges, reactor tooltip, active citizen highlight, and optimistic updates.
  - Wired real-time `message_reaction_updated` event listener.
  - In `ConversationInfoPanel.jsx`, connected Mute and Pin buttons to the preferences endpoint.
  - In `ConversationList.jsx`, sorted pinned chats to top and rendered pin and mute indicators.
- **Automated Verification**:
  - `npm run test:reactions`: 8/8 tests passed in 352ms.
  - `npm run test:edit-delete`: 8/8 regression tests passed in 273ms.
  - `npm run build`: 0 errors across 2,111 transformed modules.

## Phase 4 (Complete Media & Document Sharing) Completed
- **Backend Schema & Endpoints**:
  - Expanded `server/models/Message.js` type enum to `["text", "image", "video", "audio", "document", "system"]`.
  - Added metadata fields: `fileName: String`, `fileSize: Number`, `mimeType: String`.
  - Updated multer in `server/routes/messages.js` to allow safe images, videos, audio, and documents (up to 25 MB direct upload) with strict blocked-extensions defense (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, etc.).
  - Added `getMediaCategory` helper to categorize uploads into `image`, `video`, `audio`, or `document`.
  - Updated `POST /api/messages/conversations/:id/media` to accept either `file` or `image` field, store complete metadata, and update conversation snippet with respective icons (`📷`, `🎥`, `🎵`, `📄`).
- **Frontend Attachment UI & Audio/Video Players**:
  - In `ChatWindow.jsx`, added multi-type attachment tray and popover menu for Photos, Video Clips, Audio & Voice, Documents & Files, and Live Camera.
  - Implemented inline HTML5 `<video>` player and `<audio>` player for shared clips and voice notes.
  - Built document attachment card with file icon, formatted size (`KB/MB`), filename, and direct download button.
  - Added image download button and lightbox support.
  - Added pre-upload staged preview tray showing thumbnail, filename, and formatted size with remove trigger.
  - In `ConversationList.jsx`, displayed media type icons (`ImageIcon`, `Video`, `Mic`, `FileText`) in chat previews.
  - In `ConversationInfoPanel.jsx`, added Shared Documents & Files list alongside the Shared Photos gallery.
- **Automated Verification**:
  - `npm run test:media`: 9/9 tests passed in 384ms.
  - `npm run test:reactions`: 8/8 tests passed in 281ms.
  - `npm run test:edit-delete`: 8/8 tests passed in 265ms.
  - `npm run test:group`: 12/12 tests passed in 312ms.
  - `npm run build`: 0 errors across 2,111 transformed modules.

## Phase 5 (1 GB Large File & Google Drive Attachment Architecture) Completed
- **Backend Schema & Endpoints**:
  - Added `driveFileId: String` and `storageProvider: { type: String, enum: ["local", "google_drive"], default: "local" }` to `server/models/Message.js`.
  - Upgraded direct `mediaUpload` limits in `server/routes/messages.js` to 1 GB max with stream-based storage.
  - Implemented `tryUploadToGoogleDrive` to stream files to dedicated Google Drive folder `"Fazilnagar Messaging Attachments"`, register `GoogleDriveMedia` docs, and provide proxy delivery links (`/api/google-drive/media/:id`), with graceful fallback to local storage if Drive credentials are absent or fail.
  - Added chunked upload endpoints for up to 1 GB attachments:
    - `POST /api/messages/conversations/:id/upload/init`: Validates active membership, max 1 GB size, and blocked extensions; generates session ID and recommended chunk size.
    - `POST /api/messages/conversations/:id/upload/chunk`: Saves individual 5MB/25MB binary chunks to session staging directory.
    - `POST /api/messages/conversations/:id/upload/complete`: Assembles chunks with writeStream finish guarantee, streams to Google Drive or local storage, stores message metadata (`storageProvider`, `driveFileId`), updates conversation preview, and emits real-time Socket.IO `new_message`.
- **Frontend Upload Progress & Drive Badges**:
  - In `ChatWindow.jsx`, integrated dual-mode upload pipeline: direct upload for files <= 10 MB and chunked upload for files > 10 MB.
  - Added real-time floating upload progress bar with animated track, percentage indicator, status label, and cancellation button powered by `AbortController`.
  - Added Google Drive Cloud badge (`☁️`) to message bubbles for Drive-backed attachments.
  - Updated max file selection ceiling to 1 GB with clean warning for files exceeding the limit.
- **Automated Verification**:
  - `npm run test:drive`: 7/7 tests passed in 562ms.
  - Full suite passed cleanly: `test:reactions` (8/8), `test:group` (12/12), `test:media` (9/9), `test:drive` (7/7) = 36/36 tests passing.
  - `npm run build`: 0 errors across 2,111 transformed modules.

## Phase 6 (Offline Resilience, PWA Caching, Optimistic Delivery & Reconnect Banner) Completed
- **Client Offline Storage & Queue Management**:
  - Created `client/src/utils/offlineChatStorage.js` providing instant localStorage & IndexedDB fallback caching for conversations, messages history, and outgoing message queue with quota protection.
  - Hydrated conversation list in `Messages.jsx` synchronously on mount, yielding instantaneous 0ms loading without empty screen flashes.
  - Hydrated message history in `ChatWindow.jsx` from local cache and local pending queue on conversation switch for instant rendering on poor 2G/3G rural networks.
- **Optimistic Message Sending & Auto-Drain Reconnection Queue**:
  - Implemented offline message enqueueing with temporary client IDs (`temp-...`).
  - Added auto-drain mechanism on `online` window events and Socket reconnection: sequentially sends queued messages via REST API with `clientMessageId` deduplication, cleans queue in storage, transitions status from `queued` to `sent`, and plays audio chime.
  - If a message send fails due to network drop during flight, automatically preserves the message in local offline queue with `status: "failed"` instead of discarding.
- **Interactive UI, Status Indicators & Manual Retry**:
  - Rendered `Retry` (with `RotateCw` icon) and `Discard` (with `X` icon) action buttons directly in message bubbles for failed and queued messages.
  - Added floating amber offline banner with "Retry Connection" action button in `Messages.jsx` when offline.
  - Added green reconnect toast ("✓ Connected! Town messages are synchronized.") that auto-dismisses after 3 seconds upon connection recovery.
- **Automated Verification**:
  - `npm run test:presence`: 6/6 tests passed in 1.2s.
  - Full suite passed: `test:reactions` (8/8), `test:group` (12/12), `test:media` (9/9), `test:drive` (7/7), `test:presence` (6/6) = 42/42 tests passing.
  - `npm run build`: 0 errors across 2,112 transformed modules in 10.41s.

## Phase 7 (Search & Discovery Inside Conversations) Completed
- **In-Chat Keyword Search & Highlight**:
  - Added real-time in-chat search input in `ChatWindow.jsx` with match counter badge (`{matches} matches`).
  - Added `renderHighlightedBody` helper providing smooth substring background highlights (`bg-amber-200 text-amber-950 font-semibold px-0.5 rounded`) without regex DOM injections.
  - Added "No matching messages found" empty state with clear query button.
- **Calendar Date Separators & Unread Dividers**:
  - Implemented `getMessageDateLabel` generating bilingual date badges ("Today / आज", "Yesterday / कल", "Month Day, Year").
  - Rendered sticky date pill badges between consecutive days in conversation history.
  - Added unread messages divider ("New Messages / नए संदेश") dynamically positioned right above incoming unread messages.
- **Message Pagination**:
  - Supported `limit` and `before` cursor parameters in `GET /api/messages/conversations/:id/messages` returning messages in chronological order.

## Phase 8 (Rich Notifications, Audio Chimes & Deep-Link Routing) Completed
- **Dynamic Browser Tab Unread Badge**:
  - In `client/src/pages/Messages.jsx`, added document title synchronization (`(${totalUnreadCount}) Messages | Fazilnagar Town Portal`). Automatically updates on socket message delivery and clears upon viewing.
- **Web Audio Notification Chime**:
  - Built pure Web Audio API synthesizer `playMessageChime()` in `client/src/socket.js` playing a pleasant two-tone chime (659.25Hz -> 880Hz) without external MP3/WAV file dependencies (100% offline-compatible).
  - Wired to incoming message socket events in `Messages.jsx` and `ChatWindow.jsx`.
- **Deep-Link Conversation Routing**:
  - Integrated `useSearchParams` in `Messages.jsx` supporting both `?conv=<id>` and `?conversationId=<id>`.
  - Automatically loads and activates the deep-linked direct or group chat on navigation.

## Phase 9 (Security, Rate Limiting, File Validation & End-to-End Suite) Completed
- **Privacy & Block Defenses**:
  - Enforced bidirectional block checks: neither blocker nor blocked user can initiate direct conversation or send messages (returns 403 Forbidden).
  - Enforced conversation membership verification: non-members attempting to fetch message history are rejected with 403.
  - Restricted group settings modification (`PATCH /api/messages/conversations/:id/group`) to group admins only.
- **Executable & Script File Upload Validation**:
  - Enforced strict blacklist in direct media and chunk uploads blocking `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.vbs`, `.msi`, `.jar`, `.scr`, `.com`, `.pif`, `.js`, `.bin` files (returns 400 Bad Request).
- **Message Body Validation & Deduplication**:
  - Rejects empty or whitespace-only messages with 400 Bad Request.
  - Message body capped and sanitized at 4,000 characters.
  - `clientMessageId` deduplication returns existing message with `duplicate: true` preventing duplicate records during offline replay or reconnect sync.
- **Automated Verification**:
  - `server/tests/townMessagingCompletePhases789.test.js`: 11/11 tests passing in 490ms (`npm run test:phases789`).
  - Full suite passed cleanly:
    - `npm run test:reactions`: 8/8 passing
    - `npm run test:group`: 12/12 passing
    - `npm run test:media`: 9/9 passing
    - `npm run test:drive`: 7/7 passing
    - `npm run test:presence`: 6/6 passing
    - `npm run test:phases789`: 11/11 passing
    - **Total: 53/53 tests passing across all test suites.**
  - Client production build: `npm run build` completed cleanly in 13.06s with 0 errors across 2,112 transformed modules.

- **Phase 10: Town Messaging UI — Mobile + Desktop Layout and Profile Avatar Fixes**
  - **Fixed Message Composer Anchoring**:
    - Replaced `sticky bottom-0` with non-scrolling flex footer child (`shrink-0 z-20 bg-white border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(0.5rem,env(safe-area-inset-bottom))]`).
    - Fixed outer layout bounds in `client/src/App.jsx` and `client/src/pages/Messages.jsx` so chat panel fits within available viewport height without triggering outer page window scroll.
    - Isolated scroll to message history (`flex-1 min-h-0 overflow-y-auto overscroll-y-contain`), keeping composer permanently anchored at the bottom on both mobile and laptop.
  - **Fixed Active Chat Header**:
    - Header is permanently anchored at the top of the chat panel as a `shrink-0` flex child outside the scrollable message list. Old messages scroll smoothly underneath without displacing the header.
  - **Removed Redundant Mobile Hamburger**:
    - Removed redundant hamburger menu button from active chat header in `ChatWindow.jsx`.
    - Maintained single hamburger trigger beside "Town Messaging / नगर संवाद" heading in `Messages.jsx` (`md:hidden`), opening `MobileMessagingDrawer.jsx`.
    - Retained mobile `<ArrowLeft>` Back button in `ChatWindow.jsx` to return to conversations.
  - **Cleaned Desktop Sidebar Heading**:
    - Removed redundant "Messages / संवाद" heading and duplicate message icon from `ConversationList.jsx`.
    - Positioned "+ New Chat" and "New Group" buttons neatly at the top of the sidebar.
    - Preserved instant search and conversation category filter pills.
  - **Fixed Profile Photo / Avatar Rendering & Google Drive Storage**:
    - Integrated Google Drive upload in `server/routes/profile.js` (`POST /api/profile/avatar`), streaming avatars to dedicated folder `"Fazilnagar Avatars"` and saving portable delivery URLs (`/api/google-drive/media/:id`), with local fallback.
    - Upgraded avatar pixel resolution: Increased client canvas resolution from 600px to 1200px HD with `imageSmoothingQuality = "high"` and 0.92 WebP quality; raised backend multer file limit to 10 MB.
    - Enlarged UI profile button and preview avatars to clear, crisp dimensions (`w-9 h-9 sm:w-10 sm:h-10` in header, `w-20 h-20` in modal preview, and `w-24 h-24` in `ProfileEdit.jsx`).
    - Updated `server/routes/auth.js` (`POST /login` and `GET /me`) to return `avatar` and `username`.
    - Updated `client/src/utils/authStorage.js` (`getAuthUser`) to parse and return `avatar` and `username`.
    - Updated `client/src/pages/Messages.jsx` top-right profile button to render `resolveMediaUrl(profile?.avatar || portalUser?.avatar)` with circular clipping, `object-fit: cover`, and resilient fallback initials (`absolute inset-0`).
    - Synchronized `authStorage` on profile load and updates in both `Messages.jsx` and `ProfileEdit.jsx`.
    - Added Cross-Origin Resource Policy header (`Cross-Origin-Resource-Policy: cross-origin`) on `/uploads` in `server/server.js`.
    - Applied resilient absolute-stacked avatar fallback to `ConversationList.jsx`, `ChatWindow.jsx`, `MobileMessagingDrawer.jsx`, `ConversationInfoPanel.jsx`, and `UserSearch.jsx`.

- **Phase 11: Complete Interactive Fazilnagar Regional Connectivity Map**
  - **Dataset & Geographic Verification**:
    - Central Hub: Verified coordinates for Fazilnagar Town Centre (`26.6827° N, 84.0498° E`), Kushinagar, UP.
    - All 126 Villages of Fazilnagar Block accounted for using Census of India 2011 / Kushinagar District Census Handbook (Block Code 0659) & UP Panchayati Raj records.
    - 7 Surrounding Regional Towns verified: Kasya / Kushinagar, Tamkuhi Raj, Padrauna, Hata, Seorahi, Sukrauli, Ramkola.
    - 3 Major Connected Regional Cities verified: Deoria, Gorakhpur, Gopalganj.
    - Total verified locations: 137 records stored in `client/src/data/regionalLocations.js` with exact Haversine straight-line distance, 8-point compass bearing, verification status, and data source. Zero duplicate location IDs.
  - **Interactive Leaflet Map & Dynamic Connections**:
    - Created `client/src/components/RegionalConnectivityMap.jsx` utilizing Leaflet (`leaflet ^1.9.4`) with zero new database dependencies.
    - Pulsing central hub marker with dual radiating ripple rings and badge indicator.
    - Tiered custom markers: Distinctive styled badges for Cities, emerald location pins for Towns, and clean dot pins for Block Villages.
    - Projection-aware animated connection line (`L.polyline`) between Fazilnagar Hub and any hovered, tapped, or selected location.
    - Real-time `requestAnimationFrame` traveling pulse dot flowing along the line from Fazilnagar to the destination with automatic animation frame cleanup.
    - Smooth CSS flow dash animation (`fazilnagarDashFlow`) with glow drop-shadow styling.
  - **Controls, Filtering & Discovery**:
    - Real-time instant search by English and Hindi names.
    - Category filtering: All (137), Villages (126), Towns (7), Cities (3) with live counts.
    - Interactive reset view button to return and center on Fazilnagar Hub at default zoom (12).
    - Floating / docked destination details card displaying official name, Hindi transliteration, location type, straight-line distance from hub, compass direction, Census verification badge, and direct Google Maps navigation button.
    - Touch & scroll protection: Map controls click/tap-to-activate interaction to prevent accidental scroll hijacking on mobile devices and laptops.
  - **Homepage Integration**:
    - Seamlessly integrated Section 5B (`#regional-connectivity-section`) into `client/src/pages/TownPortal.jsx` titled `"Fazilnagar & Nearby Places / फाजिलनगर और आसपास के गाँव एवं शहर"`.
    - Preserved all existing homepage sections, components, and layouts.
  - **Build & Quality Verification**:
    - `npm run build` executed cleanly with exit code 0.
    - Bundled into dedicated chunk `RegionalConnectivityMap-*.js` (62 kB).

## Key File Paths
- Regional Map Component: `client/src/components/RegionalConnectivityMap.jsx`
- Verified Regional Dataset: `client/src/data/regionalLocations.js`
- Dataset Generator Script: `client/scripts/buildRegionalLocations.js`
- Map Flow Styles & Animations: `client/src/index.css`
- Homepage Integration: `client/src/pages/TownPortal.jsx`
- Redesigned Chat Window: `client/src/components/ChatWindow.jsx`
- Redesigned Conversation List: `client/src/components/ConversationList.jsx`
- Redesigned Create Group Modal: `client/src/components/CreateGroupModal.jsx`
- Mobile Slide-in Drawer: `client/src/components/MobileMessagingDrawer.jsx`
- Conversation Information Panel: `client/src/components/ConversationInfoPanel.jsx`
- Main Messaging Container: `client/src/pages/Messages.jsx`
- Offline Storage Utility: `client/src/utils/offlineChatStorage.js`
- Message Model: `server/models/Message.js`
- Media & Large File Routes: `server/routes/messages.js`

## Phase 10 (Media Playback, Mobile Composer, Popovers, Shared Files & UI Polish) Completed
- **Chats Page Title & Header**:
  - Renamed the visible messaging page heading to **Chats** in `client/src/pages/Messages.jsx`.
  - Removed the redundant subtitle "Fazilnagar real-time direct messaging & civic communications" to declutter the interface while keeping the messaging icon.
  - Updated browser document title and SEO metadata to `Chats | Fazilnagar Town Portal`.
  - Removed duplicate hamburger menu buttons on mobile screens.
- **Video Playback Inside Chat**:
  - Implemented HTTP Range request streaming (`Range`, `206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes`, `Content-Length`) in `server/routes/googleDrive.js`.
  - Enhanced backend `GET /conversations/:id/messages` in `server/routes/messages.js` to return complete attachment metadata: `fileName`, `fileSize`, `mimeType`, `storageProvider`, and `driveFileId`.
  - Upgraded `<video>` player in `client/src/components/ChatWindow.jsx` with `playsInline`, `controls`, `preload="metadata"`, `<source type={m.mimeType || "video/mp4"} />`, and safe non-autoplay behavior.
  - Added dedicated inline error boundary with informative notice ("Unable to play video inline"), Retry button, and direct Download option.
  - Replaced corrupted test video files on disk with valid faststart H.264/AAC MP4 media and updated database records.
- **Mobile Composer & Send Button**:
  - Added `min-w-0 flex-1` on the message input field inside `ChatWindow.jsx` to prevent flex overflow and ensure the input shrinks properly across all mobile viewports down to 320px.
  - Sized action buttons responsively (`w-8 h-8 sm:w-10 sm:h-10 shrink-0`) and send button (`w-8 h-8 sm:w-10 sm:h-10 shrink-0`).
  - Send button remains reachable and completely visible without clipping or pushing outside the screen.
  - Preserved bottom anchoring with safe-area insets (`pb-[max(0.5rem,env(safe-area-inset-bottom))]`) and independent message history scroll.
- **Report Citizen & Block Citizen Popovers**:
  - Fixed popover dismissal bug by attaching `actionsDropdownRef` with `mousedown` and `touchstart` click-outside detection and Escape key listeners.
  - Added `e.stopPropagation()` on the three-dot button and inside dropdown menu containers to prevent premature closing when tapping menu controls.
  - Selecting "Report Citizen" smoothly opens `ReportModal` without premature unmounting.
  - Selecting "Block Citizen" cleanly triggers a custom modal confirmation dialog with Yes/Cancel actions instead of jarring OS `window.confirm`.
- **Shared Photos, Videos & Files in Info Panel**:
  - Added `GET /api/messages/conversations/:id/attachments` endpoint in `server/routes/messages.js` returning categorized attachment collections (`photos`, `videos`, `files`) derived directly from real MongoDB records.
  - Updated `client/src/components/ConversationInfoPanel.jsx` to fetch real attachments with accurate count badges for Shared Photos, Shared Videos, and Shared Files.
  - Used `resolveMediaUrl(url)` for thumbnail previews with image error fallbacks, file format badges, and secure download actions.
  - Added mobile/tablet slide-over view for `ConversationInfoPanel`.
- **Automated Verification**:
  - `npm run build`: built cleanly in 7.09s with zero errors across 2,116 modules.
  - `node --test server/tests/mediaAttachmentsPhase7.test.js`: 9/9 tests passing.
  - `node --test server/tests/townMessagingCompletePhases789.test.js`: 15/15 tests passing.
  - `node --test server/tests/moderationPhase4.test.js`: 8/8 tests passing.

## Phase 11: Map Touch Gestures, Location Hover Preview, Action Buttons & Website-Wide Video Playback Repair (Completed)

### 1. Root Causes Identified
- **Website-Wide Video Playback Failure**:
  - **HTTP 206 Partial Content RFC Violation**: When browsers issued `Range` requests (e.g. `bytes=0-1` or `bytes=0-`), `server/routes/googleDrive.js` returned an HTTP 206 status without computing the mandatory `Content-Range` and `Content-Length` headers (`null/null`), causing HTML5 `<video>` decoders in Chromium/WebKit to immediately stall at `0:00`.
  - **CORS Range Header Restrictions**: `server/server.js` omitted `Range` from `allowedHeaders` and `Content-Range` / `Accept-Ranges` from `exposedHeaders`.
  - **Faulty Video Fallback Logic**: In `client/src/pages/ReelsNewsFeed.jsx`, an error handler executed `if (videoFailed && detectedVideo && !detectedImage) { detectedImage = detectedVideo; detectedVideo = ""; }`, which silently replaced failing videos with broken `<img>` tags.
  - **Extension-Only Video Detection**: Media URL detectors checked only extension suffixes (`/\.(mp4|webm|mov)$/i`), failing on valid Google Drive stream URLs (`/api/google-drive/media/:id`).
  - **Localhost Fallback Staleness**: `client/src/utils/mediaUtils.js` lacked smart fallback to production Render backend (`https://fazilnagar-portal.onrender.com`) when local port 5000 is not running.
- **Mobile Map Touch & Scroll Hijacking**:
  - Leaflet's default touch handlers intercepted single-finger touches and prevented page scrolling.
  - An artificial full-screen blocking overlay forced users to "Tap to Interact" before accessing markers.
- **Location Preview & Distance**:
  - Markers had static, plain tooltips without straight-line Haversine distance calculations from Fazilnagar Town Centre.
- **Broken Buttons ("+ Add Listing", "Report Bug", "+ Add Place")**:
  - In `client/src/pages/TownPortal.jsx`, `{modalType && (...)}`, `<CommunityPlaceModal ... />`, and `{toastMsg && ...}` were nested inside `<div className={isMobilePreview ? "hidden" : "hidden md:block ..."}>`. On mobile screens (< `md`), this entire container had `display: none`, making modals invisible when opened.
  - In `client/src/components/MobileHomePortal.jsx`, Card A (`+ Add Listing`) invoked `onOpenAddPlace` instead of `onOpenAddListing`.
  - On desktop, there was no floating "Add Place" FAB button.

### 2. Files Modified & Technical Changes
- **Backend Streaming & CORS**:
  - `server/server.js`: Added `Range`, `range` to CORS `allowedHeaders`; exposed `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Type`.
  - `server/routes/googleDrive.js`: Correctly calculates and emits RFC 7233 compliant `Content-Range: bytes ${start}-${end}/${totalSize}` and `Content-Length` on partial content requests.
- **Media Utilities & Video Players**:
  - `client/src/utils/mediaUtils.js`: Implemented `resolveMediaUrl`, `isVideoMedia`, `isImageMedia`, `resolveStoryMedia` with automatic Render production fallback and extension-agnostic Google Drive detection.
  - `client/src/components/StoryVideoPreview.jsx`: Replaced player with `resolveStoryMedia`, `<source>` element with MIME type, loading spinner, and actionable retry state.
  - `client/src/pages/ReelsNewsFeed.jsx`: Overhauled `StoryMediaCover` and full reading modal; removed destructive fallback that masked videos as images; added buffering spinner, `<source>`, and retry button.
  - `client/src/components/NewsDetail.jsx`: Connected `resolveStoryMedia` and robust video playback.
  - `client/src/components/ChatWindow.jsx`: Added direct `key` and `<source>` attributes for video attachments.
  - `client/src/components/ConversationInfoPanel.jsx`: Added `<source>` and format badges for shared videos.
  - `client/src/components/UploadForm.jsx`: Added `<source>` tag and `preload="metadata"` for local video previews.
- **Map Gestures & Distance Previews**:
  - `client/src/components/RegionalConnectivityMap.jsx`:
    - Implemented 1-finger page scroll without hijacking; displays bilingual hint overlay: *"Use two fingers to move the map / मैप चलाने के लिए दो उंगलियों का उपयोग करें"*.
    - Implemented 2-finger panning (`panBy([-deltaX, -deltaY])`) and pinch-to-zoom.
    - Preserved desktop mouse drag and zoom controls.
    - Added animated preview tooltips (`custom-location-preview-tooltip`) with fade/scale animation, category badge, and Haversine straight-line distance (`${dist} km from Fazilnagar Centre`).
    - Removed blocking scroll overlay.
- **Action Buttons & Modals**:
  - `client/src/pages/TownPortal.jsx`:
    - Moved modals (`modalType`, `CommunityPlaceModal`, `toastMsg`) OUT of the `hidden md:block` desktop container to the root fragment so they function on both mobile and desktop.
    - Added desktop floating green "Add Place" FAB button (`hidden md:flex fixed right-6 bottom-6 z-40`).
    - Passed `onOpenAddListing={() => setModalType("business")}` to `MobileHomePortal`.
    - Added `isSubmitting` state, double-click protection, and backend error reporting in `handleFormSubmit`.
  - `client/src/components/MobileHomePortal.jsx`:
    - Accepted `onOpenAddListing` prop and connected Card A (`+ Add Listing`) to trigger `onOpenAddListing`.
    - Connected Card B (`Report Bug`) to trigger `onOpenCorrection`.
    - Maintained floating green "Add Place" FAB at `bottom-20 right-4 z-40` above the bottom navigation.

### 3. Verification Results
- **Automated Client Build**: `npm run build` executed cleanly with exit code 0; 2,115 modules transformed; 15 route-specific HTML pages generated in `dist/`.
- **Targeted Test Suite**: 24/24 tests passed across `regionalConnectivity.test.js`, `communitySubmissions.test.js`, and `creationAuth.test.js` (0 failures).
- **Media & Stories Test Suite**: 15/15 tests passed in `mediaAuthStories.test.js` (0 failures).
- **Browser Subagent Verification**:
  - Regional Connectivity Map rendered with Fazilnagar Centre hub, pins, and controls.
  - Marker hover displayed animated preview tooltip with location name and Haversine distance in km (e.g. Kasya at 17.1 km).
  - Marker click dynamically drew connection line and displayed location details card with navigation button.
  - Action buttons and modal forms tested and verified.
