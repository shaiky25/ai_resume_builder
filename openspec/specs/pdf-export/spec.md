# pdf-export Specification

## Purpose
Lets the user download their finished resume as a PDF, generated entirely in the browser with no server round trip.
## Requirements
### Requirement: In-browser PDF compilation
The system SHALL compile the current resume document into a PDF entirely in-browser using `@react-pdf/renderer`, without sending the document to a server.

#### Scenario: PDF export triggers a client-side download
- **GIVEN** a resume document with enough content to export
- **WHEN** the user triggers PDF export
- **THEN** a PDF file is generated in-browser and a client-side download is triggered, with no request made to the server or Supabase Storage

### Requirement: No server or storage involvement
PDF export SHALL NOT touch the server or Supabase Storage.

#### Scenario: Export works independent of network connectivity to the backend
- **GIVEN** the browser has no connectivity to the app's backend
- **WHEN** the user triggers PDF export
- **THEN** the export still succeeds, since compilation and download happen entirely client-side

