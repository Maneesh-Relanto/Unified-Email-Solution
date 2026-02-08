# Emailify - Industry Standards Roadmap

## Phase Overview: Email Feature Parity with Gmail/Outlook

### TIER 1: Core Email Reading (IN PROGRESS)
**Status**: Phase 1 ✅ Complete → Phase 2 🔄 In Progress

#### Phase 1: Email List Display ✅
- [x] Multi-provider inbox (Gmail + Outlook)
- [x] Email aggregation & sorting
- [x] Sender name, subject, date preview
- [x] Read/unread status indicator
- [x] Split-pane UI (list + detail)
- [x] Mobile responsive design
- [x] Pagination/load more

#### Phase 2: Email Detail View 🔄 (CURRENT)
- [ ] Full email body rendering
- [ ] HTML to safe rendering (DOMPurify)
- [ ] Plain text email formatting
- [ ] Attachment metadata display
- [ ] API endpoint: GET /api/email/:provider/:id
- [ ] Response format normalization (Gmail/Outlook)
- [ ] Comprehensive test coverage (40+ tests)

**Current Progress**: Building Phase 2 API endpoint + tests

---

### TIER 2: Email Actions (PLANNED)
**Estimated**: 30-40 tests

#### Phase 3: Email Manipulation
- [ ] Mark as read/unread
- [ ] Archive email
- [ ] Move to folder
- [ ] Delete email
- [ ] Report spam
- [ ] API endpoints for each action
- [ ] Undo/recovery for 30 seconds
- [ ] Batch operations

#### Phase 4: Email Organization
- [ ] Star/flag emails
- [ ] Create/manage labels/folders
- [ ] Auto-labeling rules
- [ ] Search within labels
- [ ] Custom folder structure

---

### TIER 3: Messaging (PLANNED)
**Estimated**: 50-60 tests

#### Phase 5: Email Threading/Conversations
- [ ] Group related emails by subject & participants
- [ ] Thread sorting (newest/oldest first)
- [ ] Expand/collapse conversations
- [ ] Jump to new messages in thread
- [ ] Show conversation context

#### Phase 6: Compose & Reply
- [ ] Reply/Reply All functionality
- [ ] Forward email
- [ ] Compose new email
- [ ] Rich text editor
- [ ] Attachment upload
- [ ] Signature management
- [ ] Draft saving
- [ ] Send delay option

---

### TIER 4: Advanced Features (FUTURE)
**Estimated**: 100+ tests

#### Phase 7: Search & Filtering
- [ ] Full-text search (subject, body, sender)
- [ ] Advanced search operators (from:, to:, has:attachment)
- [ ] Filter by date range
- [ ] Filter by size
- [ ] Save filters as views
- [ ] In-app search history

#### Phase 8: Notifications & Sync
- [ ] Real-time notifications for new emails
- [ ] WebSocket live sync
- [ ] Background sync every 5 min
- [ ] Offline draft support
- [ ] Sync status indicator
- [ ] Retry failed sync

#### Phase 9: Performance & Caching
- [ ] Email body caching with TTL
- [ ] Attachment preview caching
- [ ] Search index caching
- [ ] Rate limiting per provider
- [ ] Connection pooling
- [ ] Request batching

---

## Industry Standards Compliance Matrix

### Feature                     | Gmail | Outlook | Implementation
- Email List with metadata     | ✅   | ✅     | ✅ Phase 1
- Split-pane detail view       | ✅   | ✅     | ✅ Phase 1
- Full body + attachments      | ✅   | ✅     | 🔄 Phase 2
- HTML email rendering         | ✅   | ✅     | 🔄 Phase 2
- Read/unread toggle           | ✅   | ✅     | 📋 Phase 3
- Archive email                | ✅   | ✅     | 📋 Phase 3
- Star/flag emails             | ✅   | ✅     | 📋 Phase 4
- Labels/folders               | ✅   | ✅     | 📋 Phase 4
- Conversation threads         | ✅   | ✅     | 📋 Phase 5
- Compose & Reply              | ✅   | ✅     | 📋 Phase 6
- Search & Filter              | ✅   | ✅     | 📋 Phase 7
- Real-time sync               | ✅   | ✅     | 📋 Phase 8
- Offline support              | ✅   | ✅     | Future
- End-to-end encryption        | ⚠️   | ⚠️    | Future

---

## Phase 2: Email Detail API Specification

### Endpoint
```
GET /api/email/:provider/:emailId
```

### Response Format (Unified)
```json
{
  "id": "gmail-msg-12345 | outlook-msg-abc123",
  "from": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "to": [
    { "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "cc": [],
  "bcc": [],
  "subject": "Email Subject",
  "date": "2024-02-08T10:30:00Z",
  "read": false,
  "providerName": "Gmail|Outlook",
  "headers": {
    "messageId": "<unique-message-id>",
    "inReplyTo": null,
    "references": []
  },
  "body": {
    "plain": "Plain text version of email...",
    "html": "<html>Sanitized HTML...</html>"
  },
  "attachments": [
    {
      "id": "attachment-1",
      "filename": "document.pdf",
      "size": 1024000,
      "contentType": "application/pdf",
      "downloadUrl": "/api/email/attachment/:attachmentId"
    }
  ],
  "flags": {
    "starred": false,
    "archived": false,
    "spam": false,
    "trash": false
  }
}
```

### Error Responses
```json
{ "error": "email_not_found", "status": 404 }
{ "error": "invalid_provider", "status": 400 }
{ "error": "authentication_failed", "status": 401 }
{ "error": "rate_limit_exceeded", "status": 429 }
```

---

## Test Coverage Targets

### Phase 2 Test Files (40+ tests)
1. `email-detail-api.test.ts` (20 tests)
   - GET /api/email/:provider/:id endpoint
   - Response format validation
   - Error handling
   - Authentication checks

2. `email-body-rendering.test.ts` (12 tests)
   - HTML sanitization (DOMPurify)
   - Plain text preservation
   - Safe tag whitelisting
   - Script injection prevention

3. `email-provider-normalization.test.ts` (10 tests)
   - Gmail API response transform
   - Outlook/Graph API response transform
   - Field mapping consistency
   - Date format normalization

---

## API Endpoint Summary

### Current (Phase 1) ✅
- `GET /api/email/oauth/all` - All emails from all providers
- `GET /api/email/oauth/provider/:email` - Emails from specific provider
- `GET /api/email/auth/status` - OAuth auth status

### Phase 2 (Building) 🔄
- `GET /api/email/:provider/:emailId` - Full email detail

### Phase 3+ (Planned) 📋
- `PUT /api/email/:provider/:emailId/read` - Mark as read
- `POST /api/email/:provider/:emailId/archive` - Archive
- `DELETE /api/email/:provider/:emailId` - Delete
- `PUT /api/email/:provider/:emailId/star` - Star/flag
- `POST /api/email/:provider/:emailId/reply` - Reply
- `POST /api/email/search` - Search emails
- `GET /api/email/labels` - List labels
- `POST /api/email/labels` - Create label

---

## Security Considerations

### Phase 2 Priorities
1. **HTML Sanitization**: DOMPurify to prevent XSS
2. **API Authentication**: OAuth token validation
3. **Rate Limiting**: 100 req/min per user
4. **Data Validation**: Zod schema validation
5. **CORS**: Whitelist trusted domains

### Future Phases
1. **Encryption**: MessageBox-at-rest encryption
2. **PII**: Automatic redaction in logs
3. **Permission Scopes**: Minimal read-only by default
4. **Audit Logging**: Track all email access

---

## Architecture Decision Log

### Split-pane vs Modal (Phase 1)
**Decision**: Split-pane (Gmail pattern)
**Rationale**: Better UX, maintains context, professional appearance

### API-based vs Streaming (Phase 2)
**Decision**: REST API with pagination
**Rationale**: Simpler auth, better caching, standard patterns

### HTML Rendering vs PDF (Attachments)
**Decision**: Safe HTML + attachment metadata
**Rationale**: 95% of emails are HTML, better UX

### Threading vs Flat List (Phase 5)
**Decision**: Server-side threading with client option to disable
**Rationale**: Industry standard, reduces noise

