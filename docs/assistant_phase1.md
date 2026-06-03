# Rentify AI Concierge Phase 1

## Folder Structure

```text
back/src/modules/assistant/
  assistantController.js
  assistantRepository.js
  assistantRoutes.js
  assistantSchemas.js
  assistantService.js
  assistantTools.js
  assistantTypes.d.ts
docs/supabase/assistant_phase1.sql
front/src/services/assistant.js
```

## Required NPM Package

Backend:

```bash
cd back
npm install openai
```

## Endpoint

`POST /api/assistant/chat`

Headers:

```text
Authorization: Bearer <jwt>
Content-Type: application/json
```

Body:

```json
{
  "message": "Show me my upcoming reservations",
  "conversationId": "optional-uuid",
  "context": [
    { "role": "user", "content": "I need an automatic car in Paris" },
    { "role": "assistant", "content": "What dates are you considering?" }
  ]
}
```

Response:

```json
{
  "conversationId": "uuid",
  "message": {
    "role": "assistant",
    "content": "Here are your reservations...",
    "createdAt": "2026-06-03T12:00:00.000Z"
  },
  "toolsUsed": ["getReservations"]
}
```

## Environment Variables

```text
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_MODEL=gpt-5
ASSISTANT_PROVIDER=openai
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ASSISTANT_ENABLE_DB_LOGGING=false
ASSISTANT_MAX_CONTEXT_MESSAGES=12
ASSISTANT_MAX_TOOL_ROUNDS=3
```

Use `ASSISTANT_PROVIDER=mock` for local demos without OpenAI API credits. Mock mode calls the same read-only Rentify tools with simple keyword routing.
Use `ASSISTANT_PROVIDER=gemini` with `GEMINI_API_KEY` to run the same assistant through the Gemini API.

`ASSISTANT_ENABLE_DB_LOGGING=false` keeps Phase 1 from writing conversation rows by default. Set it to `true` after applying `docs/supabase/assistant_phase1.sql` if backend-side conversation logging is desired.

## Read-Only Tools

The model can call these tools only:

```text
getReservations()
searchVehicles(filters)
getVehicleDetails(vehicleId)
getUserProfile()
```

JWT context is injected by `authenticateToken`; the model never supplies `userId`. User-specific tools always use `req.user.id`.

## RAG Readiness

`docs/supabase/assistant_phase1.sql` adds:

```text
assistant_conversations
assistant_messages
assistant_knowledge_documents
match_assistant_knowledge(...)
```

`assistant_knowledge_documents.embedding` uses `vector(1536)` as a starter embedding dimension. Change this dimension if your embedding model uses a different size.

## Frontend Example

```js
import { sendAssistantMessage } from '../services/assistant';

const response = await sendAssistantMessage({
  token,
  message: 'Find a hybrid SUV in Tunis under 90 per day',
  conversationId,
  context: messages.slice(-8),
});
```

## Security Notes

- The assistant route is JWT protected.
- Tool execution ignores model-provided user identifiers.
- Tools are read-only and isolated in `assistantRepository.js`.
- Existing write-capable reservation model helpers are intentionally not used by assistant tools.
- Tool arguments are validated with Zod.
- Tool rounds are capped with `ASSISTANT_MAX_TOOL_ROUNDS`.
- The system prompt tells GPT-5 not to claim bookings, cancellations, payments, uploads, approvals, or profile edits.
- Optional DB logging writes only to assistant audit tables, not business tables.

## Phase 2 Extension Path

Add action tools in a separate write-capable registry, for example:

```text
assistantActionTools.js
assistantActionPolicies.js
assistantActionAuditRepository.js
```

Recommended requirements before action tools:

```text
explicit user confirmation
idempotency keys
policy checks per role/action
transactional audit records
dry-run previews
rate limits
human escalation for payments/disputes
```
