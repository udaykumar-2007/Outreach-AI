# Outreach AI - API Documentation

The Outreach AI platform exposes a Node/Express REST API and Socket.io WebSocket server. Authenticated endpoints require a Supabase JWT passed as a Bearer token in the `Authorization` header.

---

## 1. Authentication Middleware

Every route prefixed with `/api` (excluding public portfolios) validates the client JWT:
```http
Authorization: Bearer <SUPABASE_JWT_TOKEN>
```
If missing or expired, the server returns a `401 Unauthorized` error payload.

---

## 2. REST Endpoints

### 2.1 Profile

#### `GET /api/profile`
Retrieves the profile metadata of the current authenticated user. If a profile doesn't exist, one is automatically initialized.
* **Success (200 OK)**:
  ```json
  {
    "id": "user-uuid",
    "full_name": "Jane Doe",
    "role": "freelancer",
    "bio": "Software Architect",
    "skills": ["React", "Node.js"],
    "work_samples": [],
    "is_busy": false,
    "active_platforms": { "linkedin": true, "twitter": true, "upwork": true }
  }
  ```

#### `PUT /api/profile`
Updates profile properties. Validated with Zod.
* **Payload**:
  ```json
  {
    "full_name": "Jane Doe",
    "bio": "Expert System Engineer",
    "skills": ["TypeScript", "Playwright"],
    "is_busy": true
  }
  ```
* **Success (200 OK)**: Returns the updated profile object.

---

### 2.2 Campaigns

#### `GET /api/campaigns`
Lists all campaigns created by the user.
* **Success (200 OK)**: Array of campaigns.

#### `POST /api/campaigns`
Creates a campaign and enqueues a profile scanning job in `scan-queue`.
* **Payload**:
  ```json
  {
    "platform": "linkedin",
    "target_keywords": ["hiring React", "tech recruiter"],
    "target_role": "Recruiter"
  }
  ```
* **Success (211 Created)**: Returns the new campaign.

#### `PATCH /api/campaigns/:id`
Toggles campaign status (active/paused). Re-enqueues scanner if set to active.
* **Payload**:
  ```json
  {
    "active": false
  }
  ```

---

### 2.3 Leads & CRM

#### `GET /api/leads?platform=&status=`
Queries leads. Filters by platform and status are optional.
* **Query Parameters**:
  - `platform`: `linkedin` | `twitter` | `upwork`
  - `status`: `discovered` | `evaluated` | `messaged` | `interested` | `rejected` | `converted`
* **Success (200 OK)**: Array of leads sorted by `match_score` descending.

#### `GET /api/leads/:id/messages`
Gets chat/outreach notes history for a candidate lead.
* **Success (200 OK)**: Array of messages sorted by `created_at` ascending.

#### `POST /api/leads/:id/reply`
Sends a human manual response to a candidate thread, which enqueues an automation job to `outreach-queue`.
* **Payload**:
  ```json
  {
    "content": "Let's schedule a call this Thursday at 2 PM EST."
  }
  ```
* **Success (211 Enqueued)**: Returns the recorded message object.

---

### 2.4 Portfolio

#### `POST /api/portfolio/generate`
Triggers Gemini web design models to generate an HTML/CSS layout based on active skills and work samples. Enqueues to `portfolio-queue`.
* **Success (211 Enqueued)**:
  ```json
  {
    "message": "Portfolio generation started. You will be notified once complete.",
    "jobId": "portfolio-user-id"
  }
  ```

#### `GET /api/portfolio/:slug` (Public, no auth)
Fetches a portfolio. If `Accept: text/html` is passed, returns a completed rendered HTML document. Otherwise, returns a JSON object.
* **Success (200 OK)**: HTML string OR JSON payload:
  ```json
  {
    "slug": "jane-doe",
    "html_code": "...",
    "css_code": "...",
    "is_published": true
  }
  ```

---

### 2.5 Analytics

#### `GET /api/analytics`
Compiles data for dashboard charts and widgets.
* **Success (200 OK)**:
  ```json
  {
    "summary": {
      "totalLeads": 40,
      "acceptanceRate": 25,
      "messagesSent": 22,
      "activeClientSlots": 3
    },
    "messagesByDay": [
      { "day": "Mon", "sent": 4, "received": 2 }
    ],
    "conversionByPlatform": [
      { "platform": "LinkedIn", "leads": 20, "interested": 5, "converted": 2 }
    ]
  }
  ```

---

## 3. WebSocket Server (Socket.io)

Clients connect and join a room named after their Supabase User ID (`user_<id>`).
The following events are pushed in real-time:

| Event | Payload Data | Description |
| :--- | :--- | :--- |
| `LEAD_FOUND` | `{ lead }` | Triggered when crawler finds a lead candidate |
| `LEAD_SCORED` | `{ lead }` | Triggered when Gemini scoring completes |
| `MESSAGE_SENT` | `{ message, leadId }` | Triggered when automation/human message is sent |
| `MESSAGE_RECEIVED` | `{ message, leadId }` | Triggered when prospect reply is scraped |
| `SENTIMENT_CLASSIFIED` | `{ message, leadId }` | Pushed when Gemini sentiment is graded |
| `PORTFOLIO_GENERATED` | `{ slug, is_published }` | Pushed when custom web assets are design-completed |
| `CAMPAIGN_PAUSED` | `{ campaignId, reason }` | Triggered when block / security check stops scraper |
| `JOB_FAILED` | `{ leadId, error }` | Surfaced when tasks encounter automation errors |
