# Security And Boundary Notes

## AI Boundary

This application coordinates work. It does not make autonomous business decisions.

All AI-related output is treated as draft. Any task involving AI draft content, external customer delivery, quote range, diagnosis conclusion, or ROI language must be reviewed before being marked done.

## Sensitive Data

Do not paste these into task fields by default:

- Personal identity information.
- Customer lists.
- Bank cards.
- Medical records.
- Financial account data.
- Confidential contracts.
- Bid documents.
- Passwords.
- API keys.

If a paid scoped project truly needs sensitive material, collect it through a separately approved process with NDA, minimum necessary scope, storage controls, and review record.

## Feishu Secrets

Keep these server-side:

- `FEISHU_APP_SECRET`
- `FEISHU_VERIFICATION_TOKEN`
- `FEISHU_ENCRYPT_KEY`

Do not expose them in client components, browser logs, card payloads, or Bitable fields.

## Current Demo Limitations

- The current implementation uses an in-memory demo store.
- Feishu user identity is mapped to seeded team members.
- Event idempotency is documented but not persisted.
- Real Bitable sync is not implemented yet.
- The app does not perform encryption/decryption for encrypted Feishu event callbacks yet.

Before production use, replace demo storage with a database and add persistent event IDs, authenticated internal sessions, and real user binding.

