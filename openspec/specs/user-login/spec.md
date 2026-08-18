# user-login Specification

## Purpose

Lets a visitor create a new account or sign back into an existing one via Email/Password or Google, establishing a client-side authenticated session usable by the rest of the app.

## Requirements

### Requirement: Single login page toggles between sign-in and sign-up
The system SHALL provide one route that lets a visitor switch between a sign-in form and a sign-up form without navigating to a different URL.

#### Scenario: Visitor switches from sign-in to sign-up
- **WHEN** a visitor on the sign-in form selects the sign-up option
- **THEN** the form switches to sign-up fields without a full page navigation

### Requirement: Email/Password sign-up creates a new account
The system SHALL allow a visitor to create a new account with an email and password, and SHALL surface an error if the email is already registered.

#### Scenario: New email successfully creates an account
- **WHEN** a visitor submits sign-up with an email that has no existing account and a valid password
- **THEN** a new Supabase Auth account is created and the visitor is signed in

#### Scenario: Already-registered email is rejected with a clear error
- **WHEN** a visitor submits sign-up with an email that already has an account
- **THEN** the system displays an error explaining the account already exists, without creating a duplicate

### Requirement: Email/Password sign-in authenticates an existing account
The system SHALL allow a visitor to sign in with a previously registered email and password, and SHALL reject incorrect credentials with a clear error rather than a generic failure.

#### Scenario: Correct credentials sign the visitor in
- **WHEN** a visitor submits sign-in with the email and password of an existing account
- **THEN** the visitor is authenticated and a session is established

#### Scenario: Incorrect credentials are rejected
- **WHEN** a visitor submits sign-in with a wrong password or an email with no account
- **THEN** the system displays an authentication error and no session is established

### Requirement: Google OAuth sign-in authenticates or creates an account
The system SHALL allow a visitor to authenticate via Google OAuth as an alternative to Email/Password, from either the sign-in or sign-up view.

#### Scenario: Visitor completes Google sign-in
- **WHEN** a visitor selects "Continue with Google" and completes the Google consent flow
- **THEN** the visitor is authenticated and a session is established, creating the underlying account on first use

### Requirement: Successful authentication persists a client-side session and redirects home
The system SHALL persist the authenticated session in the browser so it survives a page reload, and SHALL redirect to the app's home route immediately after successful authentication (via any provider).

#### Scenario: Session survives a page reload
- **WHEN** a visitor is authenticated and reloads the page
- **THEN** the visitor remains authenticated without re-entering credentials

#### Scenario: Redirect to home after login
- **WHEN** authentication succeeds via Email/Password or Google
- **THEN** the visitor is redirected to the app's home route
