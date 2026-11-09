# CivicSetu offline drafts and synchronization

## Local draft lifecycle

Drafts are stored in the Expo SQLite database `civicsetu-drafts.db`, never in SecureStore. Each record has:

- a local `draft_*` identifier;
- an owning authenticated user's `public_id`;
- the editable complaint fields and local image URIs;
- `PENDING`, `FAILED`, `UNKNOWN`, or `SYNCED` state;
- last update time and non-sensitive error text;
- server `public_id` and `tracking_code` only after confirmed creation.

Draft queries are always scoped by owner ID. Logout does not expose drafts to the next account. Draft deletion requires explicit confirmation.

## Submission behavior

- Offline devices can save drafts, but no tracking code or server complaint ID is generated locally.
- Online submission is explicit from the report screen or by reopening a saved draft.
- A draft is persisted before attempting submission.
- A confirmed server response stores the real complaint identifiers, then the local draft is removed.
- Validation/server failures preserve the draft as `FAILED`.
- Timeout/network failures preserve the draft as `UNKNOWN`; the app does not blindly retry because the Django endpoint has no verified idempotency contract.
- Concurrent attempts for the same local draft are blocked in memory while the app process is alive.

Connectivity is advisory. A device marked online can still fail to reach Django. Synchronization is foreground-only and user-initiated; background execution and automatic retries are intentionally not promised.

## Attachment handling

Before submission, each stored image URI is checked with Expo FileSystem. Missing files move the draft to `FAILED` with the missing filename listed. The backend serializer accepts JPEG, PNG, and WEBP images up to 5 MB each; client-side file-size/type enforcement remains a follow-up device-tested improvement.

## Idempotency limitation

The inspected Django complaint model and create serializer do not expose an idempotency key or request-deduplication record. The mobile app therefore provides button-level/concurrent-attempt protection only and uses the safe `UNKNOWN` recovery state for ambiguous outcomes. It does not claim server-side duplicate prevention.
