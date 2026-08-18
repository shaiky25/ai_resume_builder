## Purpose

Lets anonymous visitors see what the product does without signing in, while ensuring only authenticated users can actually chat with the agent.

## ADDED Requirements

### Requirement: Anonymous visitors see a landing/demo view, not the chat interface
The system SHALL render a landing view (including a walkthrough demonstrating how the chat-to-resume flow works) at the app's home route for a visitor with no authenticated session, instead of the chat interface.

#### Scenario: Anonymous visitor lands on the demo view
- **GIVEN** a visitor with no authenticated session
- **WHEN** they load the app's home route
- **THEN** they see the landing view with the product walkthrough, not the chat interface

### Requirement: Authenticated visitors see the chat interface
The system SHALL render the chat interface at the app's home route for a visitor with an authenticated session, instead of the landing view.

#### Scenario: Authenticated visitor lands on the chat interface
- **GIVEN** a visitor with an authenticated session
- **WHEN** they load the app's home route
- **THEN** they see the chat interface, not the landing view

### Requirement: Starting a chat while anonymous redirects to login
The system SHALL redirect an anonymous visitor to the login route when they attempt to start a chat (e.g. submitting a message), rather than allowing the attempt to proceed unauthenticated.

#### Scenario: Anonymous visitor tries to send a message
- **GIVEN** a visitor with no authenticated session viewing the landing view
- **WHEN** they attempt to send a chat message
- **THEN** they are redirected to the login route and no message is sent

#### Scenario: Returning to the chat interface after login
- **GIVEN** an anonymous visitor was redirected to login while trying to start a chat
- **WHEN** they complete authentication
- **THEN** they land on the app's home route and see the chat interface
