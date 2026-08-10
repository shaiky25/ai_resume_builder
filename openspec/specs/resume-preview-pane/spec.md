# resume-preview-pane Specification

## Purpose
Shows the live, evolving resume document alongside the chat, without exposing a half-formed or empty draft before it's worth looking at.
## Requirements
### Requirement: Preview stays blurred until resume is ready
The live document preview pane SHALL render in a blurred state whenever `isResumeReady` (owned by the parent page) is false, and SHALL render unblurred when `isResumeReady` is true.

#### Scenario: Preview is blurred before enough content exists
- **GIVEN** `isResumeReady` is false because the resume does not yet have enough structured content
- **WHEN** the preview pane renders
- **THEN** the document preview is shown in a blurred state

#### Scenario: Preview unblurs once resume content is ready
- **GIVEN** the parent page sets `isResumeReady` to true
- **WHEN** the preview pane re-renders
- **THEN** the document preview is shown unblurred

### Requirement: Manual reveal overrides the blur
The user SHALL be able to manually reveal the blurred preview even when `isResumeReady` is false.

#### Scenario: User manually reveals a blurred preview
- **GIVEN** the preview pane is blurred because `isResumeReady` is false
- **WHEN** the user triggers the manual reveal action
- **THEN** the preview pane displays unblurred content despite `isResumeReady` being false

