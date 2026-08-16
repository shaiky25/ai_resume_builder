## REMOVED Requirements

### Requirement: Empty conversation shows an illustrated empty state
**Reason**: Superseded by the persona-onboarding picker (shown once, before the chat surface renders, for any user with no stored persona) and the static persona-voiced greeting rendered as the first message immediately after a persona is selected. An authenticated user's chat surface no longer has a message-less empty state to illustrate — it shows either the picker or the greeting.
**Migration**: No data migration needed; this is a UI-only removal. Existing users without a stored persona see the picker on their next login instead of the illustrated empty state; existing users with a stored persona see the static greeting as the first message in any new conversation.
