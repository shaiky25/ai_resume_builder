## Purpose

Surfaces the derived tailoring strategy's match coverage — matched and missing keywords or skills, and prioritized gaps — to the user in the UI, so they can see how well their resume currently fits their target job.

## ADDED Requirements

### Requirement: Baseline assessment displayed before rewrite guidance
The system SHALL display the baseline assessment — the match score out of 100, the top five missing keywords, and the three most significant red flags — to the user as soon as it is produced, before any rewrite guidance is shown.

#### Scenario: Baseline assessment available
- **GIVEN** a baseline assessment has been produced for the user's target job
- **WHEN** they view the resume workspace
- **THEN** the UI shows the match score out of 100, the top five missing keywords, and the three most significant red flags

#### Scenario: Baseline assessment not yet available
- **GIVEN** a target job was just set and no baseline assessment has been produced yet
- **WHEN** the user views the resume workspace
- **THEN** the UI shows the baseline assessment as pending rather than showing rewrite guidance or an empty/broken state

### Requirement: Match coverage displayed when a strategy exists
The system SHALL display the current tailoring strategy's match coverage (matched keywords/skills, missing keywords/skills, and prioritized gaps) to the user whenever a tailoring strategy exists for their target job.

#### Scenario: Strategy available
- **GIVEN** a user has a target job set and a tailoring strategy has been derived
- **WHEN** they view the resume workspace
- **THEN** the UI shows matched keywords/skills, missing keywords/skills, and prioritized gaps from the current tailoring strategy

### Requirement: Insights hidden when no target job is set
The system SHALL NOT display match insights when the user has no target job set.

#### Scenario: No target job set
- **GIVEN** a user has not set a target job
- **WHEN** they view the resume workspace
- **THEN** no match insights UI is shown

### Requirement: Low-relevance flag surfaced to the user
The system SHALL display a low-relevance notice to the user when the tailoring strategy has flagged the target job as having no reasonable relevance to the user's existing experience, instead of showing fabricated or misleading match coverage.

#### Scenario: Strategy flags a low-relevance target job
- **GIVEN** the tailoring strategy has flagged the target job as low-relevance
- **WHEN** the user views the resume workspace
- **THEN** the UI shows a low-relevance notice rather than matched keyword/skill coverage implying qualification

### Requirement: Insights reflect the latest tailoring strategy
The system SHALL update the displayed match insights to reflect the most recently derived tailoring strategy.

#### Scenario: New strategy computed after a turn
- **GIVEN** match insights are currently displayed from a prior tailoring strategy
- **WHEN** a new tailoring strategy is derived following a subsequent chat turn
- **THEN** the displayed match insights update to reflect the new strategy
