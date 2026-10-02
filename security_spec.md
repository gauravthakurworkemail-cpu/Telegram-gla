# Security Specification & Test Definitions

## 1. Data Invariants
1. **User Identity Invariant**: A user record must have a valid `userId`, a unique `username` (3-30 lowercase chars matching `^[a-z0-9_]+$`), a `firstName`, and a hashed password.
2. **Username Registry Invariant**: A username entry in `/usernames/{username}` must be an atomic reference to a single `userId`.
3. **Conversation Integrity Invariant**: A conversation must have at least 2 participants in `participantIds` list, and `updatedAt`.
4. **Message Integrity Invariant**: A message must have a valid `id`, matching `conversationId`, a `senderId`, `timestamp`, and text or media payload bounded within limits (text <= 4000 chars, valid message type).

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Empty Username**: `{ userId: "u1", username: "", firstName: "John" }` - Fails minLength validation.
2. **Special Characters in Username**: `{ userId: "u1", username: "user@invalid!", firstName: "John" }` - Fails regex match.
3. **Oversized Name**: `{ userId: "u1", username: "validuser", firstName: "A".repeat(200) }` - Fails maxLength boundary.
4. **Missing Password Hash**: `{ userId: "u1", username: "validuser", firstName: "John" }` - Missing required `passwordHash`.
5. **Junk Document ID**: Writing to `/users/INVALID%%%ID###` - Fails `isValidId()` regex guard.
6. **Oversized Message Body**: `{ id: "m1", conversationId: "c1", senderId: "u1", text: "A".repeat(10000) }` - Exceeds 4000 char maximum.
7. **Invalid Message Type**: `{ id: "m1", conversationId: "c1", senderId: "u1", type: "executable_malware" }` - Fails enum constraint.
8. **Orphaned Message**: `{ id: "m1", conversationId: "", senderId: "u1" }` - Missing valid conversation parent reference.
9. **Null Sender ID**: `{ id: "m1", conversationId: "c1", senderId: null, text: "hello" }` - Identity violation.
10. **Empty Participant Array**: `{ id: "c1", participantIds: [] }` - Less than minimum required participants.
11. **Negative Unread Count**: `{ id: "c1", unreadCounts: { "u1": -5 } }` - Invalid state value.
12. **Malformed Media Size**: Media payload exceeding allowable payload size limit.
