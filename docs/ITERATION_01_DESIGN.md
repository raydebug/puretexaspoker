# Iteration 1: Player Chat Timestamp Display

## 1. DESIGN PHASE

### Requirements
- [ ] **Business Logic**: Display timestamp for each chat message in a human-readable format
- [ ] **Backend API**: Ensure chat messages include timestamp field in ISO format
- [ ] **Frontend UI**: Show relative time (e.g., "2 minutes ago") next to each message
- [ ] **Database**: Chat messages already have timestamp field in schema

### Test Strategy
- [ ] **Backend Unit Tests**: 
  - Test chat message creation includes timestamp
  - Test chat message retrieval preserves timestamp
  - Test timestamp format validation
- [ ] **Backend Integration Tests**:
  - Test WebSocket chat events include timestamp
  - Test chat history retrieval with timestamps
- [ ] **Selenium UI Tests**:
  - Test chat message displays with timestamp
  - Test timestamp updates over time
  - Test timestamp format consistency

### Technical Implementation Plan

#### Backend Changes
1. Verify `Message` model includes `createdAt` timestamp
2. Ensure chat service returns timestamp in responses
3. Add timestamp validation in chat routes

#### Frontend Changes
1. Add timestamp display component
2. Implement relative time formatting (e.g., "2 minutes ago")
3. Update chat message UI to show timestamps

#### Test Files to Create/Update
- `backend/src/__tests__/services/chatService.test.ts`
- `backend/src/__tests__/routes/chat.test.ts`
- `frontend/src/__tests__/components/ChatBox.test.tsx`
- `selenium/features/chat-timestamp-display.feature`

### Definition of Done
- [ ] All backend tests pass (unit + integration)
- [ ] All Selenium UI tests pass
- [ ] Chat messages display with human-readable timestamps
- [ ] Timestamps update correctly over time
- [ ] Code follows project patterns and conventions
- [ ] Ready for commit

### Expected Files Modified
```
backend/src/services/chatService.ts
backend/src/routes/chat.ts
frontend/src/components/ChatBox.tsx
frontend/src/utils/formatUtils.ts (new)
```

### Test Coverage Goals
- Backend: 95%+ line coverage for chat-related functions
- Frontend: 90%+ component test coverage
- E2E: 100% chat timestamp user journey coverage