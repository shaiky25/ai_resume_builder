## Purpose

Derives a job-specific tailoring strategy — keyword/skill gap coverage and prioritized rewrite guidance — from the user's target job description and structured resume data, so subsequent chat rewrites are directed at that specific job rather than generic improvement.

## ADDED Requirements

### Requirement: Baseline assessment produced before any rewrite guidance
When a user sets a new or changed target job, the system SHALL first produce a baseline assessment — a match score out of 100, the top five missing keywords, and the three most significant red flags a hiring manager would notice — before generating any rewrite guidance for that target job.

#### Scenario: Target job newly set or changed
- **GIVEN** a user sets a target job for the first time, or replaces an existing target job with a new one
- **WHEN** the system derives results for that target job
- **THEN** it first produces a baseline assessment consisting of a match score out of 100, the top five missing keywords, and the three most significant red flags, before any rewrite guidance is generated or applied

#### Scenario: Rewrite guidance withheld until baseline exists
- **GIVEN** a target job has just been set and no baseline assessment has yet been produced for it
- **WHEN** the system would otherwise generate rewrite guidance for that target job
- **THEN** rewrite guidance generation is deferred until the baseline assessment has been produced

### Requirement: Tailoring strategy derived when a target job is set
The system SHALL derive a tailoring strategy comparing the user's target job description against their structured resume data after each chat turn that completes successfully, when the user has a target job set.

#### Scenario: Turn completes successfully with a target job set
- **GIVEN** an authenticated user has a target job set
- **WHEN** a chat turn finishes streaming its response to the client without error
- **THEN** the system derives a tailoring strategy reflecting keyword/skill coverage and prioritized rewrite guidance based on the target job description and the current structured resume data

### Requirement: Tailoring strategy persisted per user
The system SHALL persist the derived tailoring strategy scoped to the authenticated user whose conversation produced it.

#### Scenario: Derivation succeeds
- **WHEN** a tailoring strategy is successfully derived for a user's turn
- **THEN** it is stored, scoped to that user's `user_id`, replacing the previously stored strategy

### Requirement: No tailoring strategy applied without a target job
The system SHALL NOT derive or apply a tailoring strategy when the user has no target job set.

#### Scenario: No target job set
- **GIVEN** an authenticated user has not set a target job
- **WHEN** a chat turn finishes streaming its response
- **THEN** no tailoring strategy is derived or persisted for that turn

### Requirement: Tailoring guidance repositions existing experience without fabrication
The tailoring strategy SHALL only reference skills, experience, and accomplishments already present in the user's structured resume data, and SHALL NOT invent or attribute experience, skills, or credentials the user does not have.

#### Scenario: Strategy repositions existing experience toward the target job
- **GIVEN** a user's structured resume data contains experience relevant to the target job
- **WHEN** the tailoring strategy is derived
- **THEN** the guidance reframes that existing experience toward the target job's language, without introducing experience absent from the structured resume data

#### Scenario: Target job requires experience the user does not have
- **GIVEN** the target job description requires skills or experience absent from the user's structured resume data
- **WHEN** the tailoring strategy is derived
- **THEN** the missing items are surfaced as gaps rather than fabricated as matched experience

### Requirement: Low-relevance target job is flagged rather than force-matched
When the user's structured resume data has no reasonable relevance to the target job description, the system SHALL flag the mismatch rather than produce a tailoring strategy that repositions unrelated experience as if it qualified.

#### Scenario: Target job unrelated to any existing experience
- **GIVEN** the user's structured resume data shares no meaningful overlap with the target job description's core responsibilities or required skills
- **WHEN** the tailoring strategy is derived
- **THEN** the system flags the target job as a low-relevance match instead of generating rewrite guidance that repositions unrelated experience as qualifying

### Requirement: Rewrite guidance uses an accomplishment-metric-method structure
The tailoring strategy's rewrite guidance for experience bullets SHALL structure suggestions as an accomplishment, the metric it was measured by, and the method used to achieve it, and SHALL naturally incorporate the target job's missing keywords into that structure only where grounded in the user's actual, existing experience.

#### Scenario: Rewrite guidance follows accomplishment-metric-method structure
- **GIVEN** a tailoring strategy is derived for an experience entry relevant to the target job
- **WHEN** the rewrite guidance for that entry is generated
- **THEN** it identifies the accomplishment, the metric it was measured by, and the method used to achieve it

#### Scenario: Missing keywords incorporated only where grounded in existing experience
- **GIVEN** the target job description includes keywords absent from the user's current resume wording
- **WHEN** rewrite guidance is generated for an experience entry that genuinely involved that keyword's underlying skill or tool
- **THEN** the guidance incorporates that keyword naturally into the entry's rewritten language

### Requirement: Rewrite guidance flags red flags for removal or reframing
The tailoring strategy SHALL identify resume red flags relative to the target job — such as unexplained gaps, irrelevant or outdated content, and vague or unquantified statements — and SHALL include guidance to remove or reframe them.

#### Scenario: Red flag identified
- **GIVEN** the user's structured resume data contains content that reads as a red flag for the target job, such as an unexplained gap or an unquantified, vague bullet
- **WHEN** the tailoring strategy is derived
- **THEN** the guidance flags that content and includes instruction to remove or reframe it

### Requirement: User confirmation required before applying suggested changes
The system SHALL ask the user whether they want to apply the suggested resume changes, and SHALL NOT apply those changes to the resume until the user confirms.

#### Scenario: Suggestions ready, confirmation requested
- **GIVEN** rewrite guidance has been generated for the target job
- **WHEN** the guidance is ready to present to the user
- **THEN** the system asks the user whether they want to apply the suggested changes, before making any change to the resume

#### Scenario: User confirms
- **GIVEN** the system has asked the user whether to apply the suggested changes
- **WHEN** the user confirms
- **THEN** the system applies the suggested changes to the resume

#### Scenario: User has not yet responded
- **GIVEN** the system has asked the user whether to apply the suggested changes
- **WHEN** the user has not yet responded
- **THEN** the resume content is left unchanged

### Requirement: Optimization satisfaction determined before export is available
The system SHALL determine whether the user is satisfied with the optimized resume, either because the user explicitly asks to export or download it, or because the system deduces satisfaction from the user's answers to relevant readiness questions, and SHALL treat this determination as a precondition for export when the user has a target job set.

#### Scenario: User explicitly asks to export
- **GIVEN** a user has a target job with suggested changes applied
- **WHEN** the user explicitly asks to export or download the resume
- **THEN** the system determines the user is satisfied for the purpose of enabling export

#### Scenario: System deduces satisfaction from readiness questions
- **GIVEN** a user has a target job with suggested changes applied
- **WHEN** the system asks relevant readiness questions and the user's answers indicate they are satisfied with the resume
- **THEN** the system determines the user is satisfied for the purpose of enabling export, without the user needing to explicitly ask

#### Scenario: Satisfaction not yet determined
- **GIVEN** a user has a target job with suggested changes applied, and has neither asked to export nor answered readiness questions in a way that indicates satisfaction
- **WHEN** export controls would otherwise render
- **THEN** the system has not determined the user is satisfied, and export remains unavailable

### Requirement: Derivation failure does not fail the chat turn
A failure to derive or persist the tailoring strategy SHALL NOT cause the chat turn itself to fail or withhold the assistant's response from the user.

#### Scenario: Derivation fails after a successful chat response
- **WHEN** the assistant's response has already been delivered to the user but tailoring-strategy derivation or persistence fails
- **THEN** the user still receives the completed chat response, and no partial or corrupt tailoring strategy is written for that turn
