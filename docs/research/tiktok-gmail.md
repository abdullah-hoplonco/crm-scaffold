# Research: TikTok Lead Generation webhooks + Gmail API

Checked 2026-09-17 against primary docs. TikTok pages were read through the portal's own doc-content API (the same text the portal page shows). Google pages were read from developers.google.com / support.google.com. The "last updated" stamps on the Google pages range from 2026-04 to 2026-09.

## TL;DR: what changes our design or demo

**TikTok**
- **How leads arrive:** a real-time webhook from the Subscription API. Call `POST /open_api/v1.3/subscription/subscribe/` with `subscribe_entity: "LEAD"`. You can scope it to an `advertiser_id` (covers every Instant Form in the account) or a `library_id`, and optionally narrow it to one `page_id`.
- **Payload shape:** `{ object: 1, entry: [ {id, lead_source, page_id, page_name, advertiser_id, advertiser_name, library_id, campaign_id/name, adgroup_id/name, ad_id/name, create_time, changes: [{field, value}]} ], time }`.
  - Deliveries are batched, up to 1000 updates per request, so **`parseWebhook` must return an array**.
  - Delivery is "at least once", so **dedupe on `entry[].id`**.
- **Large IDs lose precision in JS.** TikTok IDs are 19-digit integers (a docs example has `lead_id` 7126711421177430274). The webhook field table types `page_id`, `advertiser_id`, `campaign_id` and similar as `number`, so plain `JSON.parse` would corrupt them. **Parse the body with a bigint-safe parser and store every ID as a string.**
- **Signature check:** header `X-Open-Signature`, value = HMAC-SHA256 of the payload keyed with the **app secret**, as lowercase hex. TikTok signs the *unicode-escaped* payload, so **verify against the raw request body bytes**, never re-serialized JSON.
  - This is a different scheme from the Accounts API webhooks (`TikTok-Signature: t=…,s=…`). Don't copy that one.
- **Lead field names depend on the form.** Examples: `name`, `email`, `phone_number`, `gender`, `address`, `scheduled_time`. Custom questions appear to use their own labels. Map known keys and keep the raw `changes` array.
- **You can't fetch a lead by ID later.** `/lead/get/` (added May 2025) takes no `lead_id` parameter. The only other export is an async CSV download task, admin-only and region-split. **Treat the webhook payload as the source of truth.**
- **Testing is production-only.** `/page/lead/mock/create/` creates one test lead per form, but it needs a real ad account and Instant Form. The TikTok sandbox doesn't list any lead or subscription endpoints. **For the demo, use fixtures built from the documented sample.**
- **Access is company-only and slow.** Developer registration requires a company-domain email and company website ("unable to onboard … individual developers"), with review in about 3 business days. App review takes another 2–3 business days. The advertiser then authorizes through a URL plus an emailed code. If that token is revoked, the webhook subscription silently stops.

**Gmail**
- **Scope classes:** `gmail.readonly`, `gmail.modify`, `gmail.metadata` and `gmail.compose` are **restricted**. `gmail.send` is **sensitive**. Reading threads needs a restricted scope.
  - Going "In production" for real therefore means restricted-scope verification plus an **annual CASA security assessment** (several weeks).
  - CRM is an approved Gmail use case.
- **Refresh tokens expire after 7 days in Testing.** This applies to an app with user type External and status "Testing". **Plan a "Reconnect Gmail" flow for `invalid_grant`, and have reps re-consent shortly before any demo.** Testing also allows at most 100 manually listed test users and shows a warning screen at consent.
  - **Option: Internal user type.** Needs an organization-owned project and reps in the same Workspace organization. No warning screen, no 100-user cap, and the 7-day rule is stated only for External + Testing.
- **Refresh tokens also die when a user changes password** (for tokens with Gmail scopes). Users can also grant only some requested scopes (granular consent). **Check which scopes were actually granted.**
- **Push (`users.watch`) setup:**
  - Needs a Pub/Sub topic **in the same Cloud project**, with publish rights granted to `gmail-api-push@system.gserviceaccount.com`.
  - Must be renewed at least every 7 days (Google recommends daily).
  - A notification only carries `{emailAddress, historyId}`.
  - Google says notifications can be "delayed or dropped", so you need polling anyway. **For the demo, polling `history.list` every 60 s is enough and needs no Pub/Sub or public endpoint.**
- **`history.list` sync:** returns a 404 when `startHistoryId` is too old ("typically valid for at least a week", sometimes only hours). **On 404, do a full resync. Persist `historyId` per mailbox.**
- **Quotas (new in 2026):** from May 1, 2026, new projects get 6,000 units per user per minute, 1.2M units per project per minute, and an 80M units/day per-project billing threshold. Charges are planned "later in 2026" with 90 days' notice.
  - Unit costs: `history.list` = 2, `messages.get` = 20, `threads.get` = 40, `messages.send` = 100, `watch` = 100.
  - Polling 15 users once a minute costs about 30 units/min, which is negligible.
- **Replies that thread:** put `threadId` in the message resource, set `In-Reply-To` and `References` to the original's RFC `Message-ID` header (not the Gmail id), and keep the Subject matching. Send the message as `raw` = base64url of the RFC 2822 message.
- **Attachments:** `messages.send` accepts up to 35 MB (36,700,160 bytes, per the discovery doc) via `/upload`. Consumer Gmail's attachment limit is 25 MB. A small PDF quote fits in the JSON `raw` body.

---

## TikTok

### 1. Official ways to receive Instant Form leads in real time

**Answer.** TikTok API for Business (Marketing API v1.3) offers two routes:

- **(a) Real-time webhook.** Use the **Subscription API** (`/subscription/subscribe/`) with `subscribe_entity=LEAD`. It covers Instant Form leads and, since May 2025, direct-message leads.
- **(b) Bulk download.** Use the **Leads API** download task: `/page/lead/task/` → `/page/lead/task/download/`, which returns CSV/zip.

TikTok's "CRM integration" in Ads Manager is either a listed partner integration or "Custom API with Webhooks", which is the same Subscription API. CRMs can apply to be listed in Ads Manager with the CRM listing form.

**Sources**
- Use case "Obtain leads as advertisers": https://business-api.tiktok.com/portal/docs?id=1806817494948930
  > "You can use API to quickly access leads data in one of the following ways: Download leads; Subscribe to leads via webhooks" … "Webhooks enable you to integrate Lead Generation ads with your CRM system and receive real-time updates for both Instant Form and direct message leads."
- Use case "Export leads and postback CRM events" (for CRM partners): https://business-api.tiktok.com/portal/docs?id=1806817505894402
  - Required app permission scopes: Ad Account Management > Ad Account Information; Creative Management > Instant Page Management; Lead Management > Leads Retrieval; Lead Management > Test Leads; CRM Event Management > Read CRM Event Sets; Measurement > Report Conversion Event.
  - Step 4 is the "TikTok Ads Manager Listing form".
- "Subscribe to ad account Webhook events via Subscription API": https://business-api.tiktok.com/portal/docs?id=1810521739537409
- Create a subscription (endpoint reference): https://business-api.tiktok.com/portal/docs?id=1739092028876801
- Leads API group index: https://business-api.tiktok.com/portal/docs?id=1739047069984834
- Help Center, CRM integrations: https://ads.tiktok.com/help/article/available-crm-integrations-tiktok-lead-generation?lang=en ("Custom API with Webhooks … receive updates in real time").

**Subscription details that matter**
- Choose between `advertiser_id` and `library_id`, with an optional `page_id`.
  > "Using `advertiser_id` will subscribe you to all Instant Form leads … associated with the ad account. Including `page_id` will narrow down the notifications…"
- The request body carries `app_id`, `secret`, `callback_url`, and `subscription_detail.{access_token, advertiser_id, page_id?}`.
- With `advertiser_id` you need **Admin** on the ad account.
- > "If the `access_token` used to configure the Webhook is revoked … the Webhook subscription will no longer work, and no further Webhook events will be received."
- > "subscriptions are based on Subscription IDs … A page can be included in multiple subscriptions." Cancelling one doesn't affect the others, so duplicate subscriptions mean duplicate deliveries.

**2025–2026 changes**
- 2025-05-16: `lead_source` (`INSTANT_FORM` | `DIRECT_MESSAGE`) was added to subscribe/get and the mock endpoints.
- 2025-05-16: `/lead/get/` and `/lead/field/get/` were added.
- Source: What's New, https://business-api.tiktok.com/portal/docs?id=1740029165513730
- No lead-webhook changes appear in What's New for 2026 up to September 4, 2026.

### 2. Webhook payload shape for a new lead

**Answer.** Documented sample, verbatim from the Subscription API guide (the `{{…}}` placeholders are TikTok's):

```json
{
  "object": 1,
  "entry": [
    {
      "id": {{id}},
      "page_id": {{page_id}},
      "page_name": "",
      "campaign_id": {{campaign_id}},
      "campaign_name": "{{campaign_name}}",
      "adgroup_id": {{adgroup_id}},
      "adgroup_name": "{{adgroup_name}}",
      "ad_id": {{ad_id}},
      "ad_name": "{{ad_name}}",
      "create_time": 1614239152,
      "changes": [
        { "field": "gender", "value": "Female" },
        { "field": "phone_number", "value": "15088888888" },
        { "field": "email", "value": "test_email_address@mail.com" },
        { "field": "address", "value": "123 Castro Ave. Mountain View, CA" },
        { "field": "name", "value": "Jane Doe" },
        { "field": "scheduled_time", "value": "Wednesday / 12:00 - 13:00" }
      ],
      "advertiser_id": {{advertiser_id}},
      "advertiser_name": "{{advertiser_name}}",
      "library_id": 0,
      "lead_source": "DIRECT_MESSAGE"
    }
  ],
  "time": 1614334356
}
```

The second sample, in the "Obtain leads as advertisers" guide, also has a top-level `"request_id"`.

**Field table** (https://business-api.tiktok.com/portal/docs?id=1810521739537409)

Top level:

| Field | Type | Meaning |
|---|---|---|
| `request_id` | number | Unique ID for a webhook request |
| `object` | integer | `1` = lead |
| `entry` | object[] | "Multiple changes from different objects that are of the same type may be batched together" |
| `time` | integer | Time the notification was sent, Unix seconds |

`entry[]`:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Lead ID |
| `lead_source` | string | `INSTANT_FORM` \| `DIRECT_MESSAGE` |
| `page_id` | number | Page ID of the Instant Form |
| `page_name` | string | Page name |
| `advertiser_id` | number | Advertiser ID |
| `advertiser_name` | string | Advertiser name |
| `library_id` | number | Form library ID |
| `campaign_id`, `campaign_name` | number, string | Campaign |
| `adgroup_id`, `adgroup_name` | number, string | Ad group |
| `ad_id`, `ad_name` | number, string | Ad |
| `create_time` | number | Lead created time, Unix seconds (e.g. 1743639757) |
| `changes[]` | object[] | `{field: string, value: object}`; every documented example uses string values |

**Parsing notes**
- **Types are inconsistent.** `id` is documented as a string but the samples leave it unquoted. The v1.2 → v1.3 migration tables say REST responses switched IDs to strings, but that statement covers endpoints, not the webhook body.
- **IDs can exceed 2^53.** For example, the mock-lead sample shows `"lead_id":7126711421177430274` and `"page_id":6873052183063953666`. Use bigint-safe parsing.
- **Batching:** "Event notifications are aggregated and sent in a batch with a **maximum** of 1000 updates. However batching cannot be guaranteed…"
- **Retries:** "the API will retry immediately, then try a few more times with decreasing frequency over the next 24 hours. Your server should handle deduplication…" Also: "Your endpoint should respond to all event notifications with 200 OK."
- **Delivery guarantee:** "TikTok is committed to providing 'at least once delivery' for webhooks."
- **Timestamp formats differ.** The webhook's `create_time` is Unix seconds. The REST `/lead/get/` `create_time` is `"YYYY-MM-DD HH:MM:SS"` in UTC+0.
- **No form-name or question metadata** arrives in the webhook beyond `page_name`. `/lead/field/get/` returns the form's field list (https://business-api.tiktok.com/portal/docs?id=1832112377641026).

### 3. Webhook verification / signature

**Answer.** Header **`X-Open-Signature`**, algorithm **HMAC-SHA256**, key = **app secret**. The documented example output is 64 lowercase hex characters.

**Source:** https://business-api.tiktok.com/portal/docs?id=1806817494948930 ("Validate payloads")
> "We sign all event notification payloads with a **HMAC-SHA256** signature and include the signature in the request's **X-Open-Signature header**." … "Input both your payload and your app's App Secret into an HMAC-SHA256 encryption function to get an encoded result string. This string is the signature." … "we generate the signature using an *escaped unicode* version of the payload, with lowercase hex digits. If you just calculate against the decoded bytes, you will end up with a different signature."

**Ambiguity**
- The docs don't say whether the body on the wire is already unicode-escaped.
- The most likely reading is to HMAC the raw body as received. If non-ASCII names fail verification, escape non-ASCII as `\uXXXX` (lowercase hex) before hashing.
- No timestamp or replay protection is documented for lead webhooks.
- The Accounts/Business Messaging "Webhooks API" uses a different scheme: `TikTok-Signature: t=<ts>,s=<hmac(ts + "." + body)>` with 72 h retries (https://business-api.tiktok.com/portal/docs?id=1759978341579777, https://business-api.tiktok.com/portal/docs?id=1759977800177665). **That scheme does not apply to lead subscriptions.**

### 4. Fetch a lead by ID afterwards; auth and scopes; sandbox or test leads

**Answer**
- **No documented fetch-by-lead-ID.**
  - `GET /open_api/v1.3/lead/get/` takes `lead_source`, `advertiser_id` or `library_id`, and `page_id` (required for `INSTANT_FORM`). It has **no `lead_id` parameter**, and the docs don't say which lead it returns.
  - Response: `data.lead_data` (keys = form questions) plus `data.meta_data.{lead_id, page_id, campaign_*, adgroup_*, ad_*, create_time, lead_source}`.
  - Permission: **Lead Management > Leads Retrieval**.
  - Source: https://business-api.tiktok.com/portal/docs?id=1832112833212434
- **Bulk export: `/page/lead/task/` then `/page/lead/task/download/`.**
  - Output is CSV (zip if over 10 MB).
  - > "only ad account admins can create and query lead download tasks or download the leads."
  - Leads are stored by region. Use header `x-lead-region: eu` for EEA/CH/UK and `x-lead-region: us` for the US. With no header you get only the rest of the world.
  - Source: https://business-api.tiktok.com/portal/docs?id=1739053563877378
- **Auth for all of these:**
  - Send header `Access-Token` with a long-term token from `/oauth2/access_token/`.
  - > "A long-term access token does not expire, but it'll become invalid if the advertiser cancels the authorization." (https://business-api.tiktok.com/portal/docs?id=1738373164380162)
  - Subscription endpoints need "No permission needed" but do need `app_id` + `secret` plus the advertiser's `access_token` (API Reference table: https://business-api.tiktok.com/portal/docs?id=1735713875563521).
- **Test leads exist; the sandbox doesn't cover them.**
  - `/page/lead/mock/create/`, `/page/lead/mock/get/` and `/page/lead/mock/delete/` require permission Lead Management > Test Leads and Admin on the ad account.
  - > "For each Instant Form, you can create one test lead. If you need to create a new test lead, you must delete the existing test lead … first." (https://business-api.tiktok.com/portal/docs?id=1739047132614722)
  - The guide presents these as the way to "make an end to end testing" after subscribing.
  - The sandbox (`https://sandbox-ads.tiktok.com/open_api`) "Endpoints supported in sandbox accounts" list covers ads, campaigns, reports, terms and identity only. **No lead or subscription endpoints** (https://business-api.tiktok.com/portal/docs?id=1738855331457026).

### 5. Access requirements

1. **Register as a developer.** Needs a company-domain email and a public company website.
   > "Currently, we are unable to onboard personal accounts or individual developers." "You will be notified of the review result in three business days."
   Source: https://business-api.tiktok.com/portal/docs?id=1738855176671234
2. **Create a developer app.** Select permission scopes and an advertiser redirect URL (up to 10, localhost allowed).
   > "The review may take **2 to 3 business days**." "Each developer can have up to five developer applications."
   Source: https://business-api.tiktok.com/portal/docs?id=1738855242728450
3. **Get advertiser authorization.** The advertiser opens the "Advertiser authorization URL", approves, and enters an emailed verification code. The redirect carries `auth_code`, valid for 1 hour and single-use, which you exchange for a long-term token.
   > "you can access the endpoints according to the permissions that are granted by the advertiser, not the permissions that you apply for".
   Sources: https://business-api.tiktok.com/portal/docs?id=1738373141733378, https://business-api.tiktok.com/portal/docs?id=1738373164380162
4. **Account role and ads.** Lead subscription by `advertiser_id` needs Admin on the ad account. The account needs Lead Generation ads and Instant Forms; the Lead Gen terms can be signed via `/term/confirm/`.

---

## Gmail API

### 6. Scopes and their classification

**Source:** https://developers.google.com/workspace/gmail/api/auth/scopes (updated 2026-09-10)

| Scope | Class | Notes |
|---|---|---|
| `gmail.send` | **Sensitive** | "Send email on your behalf." |
| `gmail.readonly` | **Restricted** | "View your email messages and settings." |
| `gmail.metadata` | **Restricted** | Labels and headers, "but not the email body". It still counts as restricted, so choosing it gains nothing over `readonly` on verification. |
| `gmail.modify` | **Restricted** | Read/compose/send, no permanent delete. Also lets us add labels. |
| `gmail.compose` | **Restricted** | Drafts plus send. |
| `https://mail.google.com/` | **Restricted** | Only needed for permanent delete. |
| `gmail.labels` | Non-sensitive | |

> "If you store restricted scope data on servers (or transmit), then you must go through a security assessment."

**Minimum set for us:** `gmail.readonly` + `gmail.send`, or `gmail.modify` alone.
- `watch`, `history.list` and `messages.get` accept `mail.google.com`, `modify`, `readonly` or `metadata`. `metadata` can't return bodies.
- `messages.send` accepts `mail.google.com`, `modify`, `compose` or `send`.

**Granular consent.** When more than one non-sign-in scope is requested, users see per-scope checkboxes, and "the application must check what scopes are granted by the users and can't assume users grant all requested scopes" (https://developers.google.com/identity/protocols/oauth2/resources/granular-permissions).

**Approved use.** CRM is an approved Gmail use case: "Applications that enhance the email experience for productivity purposes (such as applications for customer relationship management…)" (https://developers.google.com/workspace/workspace-api-user-data-developer-policy).

### 7. Testing vs In production

**Testing status** (https://support.google.com/cloud/answer/15549945, "Manage App Audience")
- > "limited to up to 100 test users listed in the OAuth consent screen."
- > "Google will display a warning message before allowing a specified test user to authorize scopes … consider the risks associated with granting access to their data to an unverified app."
- > "Authorizations by a test user will expire seven days from the time of consent. If your OAuth client requests an offline access type and receives a refresh token, that token will also expire."
- The only exception is when the app requests nothing beyond name/email/profile/openid.

**Refresh token rules** (https://developers.google.com/identity/protocols/oauth2, "Refresh token expiration")
- > "A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of 'Testing' is issued a refresh token expiring in 7 days…"
- Other invalidation causes on the same page:
  - The token was unused for 6 months.
  - "The user changed passwords and the refresh token contains Gmail scopes."
  - The limit of 100 refresh tokens per Google Account per client ID (the oldest is silently invalidated).
  - Time-based access expired.
  - An admin restricted the service.

**Unverified apps and exemptions**
- Unverified app screen and cap: "100 new users in total, after the app presents the unverified app screen". The cap applies over the project's lifetime and can't be reset (https://support.google.com/cloud/answer/7454865, https://support.google.com/cloud/answer/15549945).
- Exemptions (https://support.google.com/cloud/answer/13464323):
  - "Personal Use apps … (fewer than 100 users) … users will be allowed to click through 'unverified app' warning screens".
  - Development/Testing/Staging apps "are not subject to verification".
  - Internal apps in a Workspace/Cloud Identity organization: "will not be subject to the unverified app screen or the 100-user cap".

**In production with restricted scopes**
- Brand verification (about 2–3 business days), then restricted-scope review: demo video, scope justification, Limited Use compliance.
- Then **an annual security assessment by a Google-empanelled assessor using CASA**:
  > "the restricted scopes verification process can potentially take several weeks to complete" … "complete a security assessment at least every 12 months after your assessor's Letter of Assessment (LOA) approval date."
  Source: https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification (updated 2026-08-19)
- CASA now assigns "AL1 or AL2 assurance level", and the result is a "Letter of Validation" (LOV) (https://support.google.com/cloud/answer/13465431). ⚠ This AL1/AL2 wording is newer than the older "Tier 2/Tier 3" terms. The date of the change isn't stated.

### 8. `users.watch` (push)

**Sources:** https://developers.google.com/workspace/gmail/api/guides/push (updated 2026-09-15); https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch

**Setup**
- Create a Pub/Sub topic and a push or pull subscription.
- Grant publish rights to `gmail-api-push@system.gserviceaccount.com`. Domain-restricted-sharing org policy may block this and need an exception.
- Call `POST /gmail/v1/users/me/watch` with `{topicName, labelIds?, labelFilterBehavior?}`.
- > "the 'my-project-identifier' portion must exactly match your Google developer project id (the one executing this watch request)."
- The response is `{historyId, expiration (epoch ms)}`. "a successful watch call immediately sends a notification".

**Expiry**
> "You must call the watch method at least once every 7 days or you'll stop receiving updates for the user. We recommend calling watch once per day."

**Notification**
- It's a Pub/Sub message. `message.data` is base64url JSON: `{"emailAddress": "user@example.com", "historyId": "9876543210"}`.
- Then call `history.list` from your last stored historyId.
- Acknowledge with HTTP 200, otherwise Pub/Sub retries.
- Push endpoints can verify a Google-signed JWT in the `Authorization` header if authentication is enabled on the subscription (https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions).

**Limits**
- One event per second per watched user; anything beyond that is dropped.
- > "in rare situations, notifications might be delayed or dropped … fall back to periodically calling the history.list method".

**2025–26 change:** `labelFilterAction` is **deprecated** in favour of `labelFilterBehavior` ("caused incorrect behavior in some cases"). The enum values in the discovery doc are lowercase `include`/`exclude`, but the guide's example uses `"INCLUDE"`.

### 9. Polling with `users.history.list`

**Sources:** https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list; https://developers.google.com/workspace/gmail/api/guides/sync

**Request:** `GET /gmail/v1/users/me/history?startHistoryId=…&historyTypes=messageAdded&labelId=…&maxResults≤500&pageToken=…`
- `historyTypes` values: `messageAdded`, `messageDeleted`, `labelAdded`, `labelRemoved`.
- Results come back in chronological order.
- Returned messages "typically only have id and threadId fields populated", so follow up with `messages.get` or `threads.get`.

**Semantics**
> "Returns history records after the specified startHistoryId … History IDs increase chronologically but are not contiguous … If you receive no nextPageToken in the response, there are no updates to retrieve and you can store the returned historyId for a future request."

**Too old**
> "Supplying an invalid or out of date startHistoryId typically returns an HTTP 404 error code. A historyId is typically valid for at least a week, but in some rare circumstances may be valid for only a few hours. If you receive an HTTP 404 error response, your application should perform a full sync."

**Full sync:** call `messages.list` (or `threads.list`), batch `messages.get`, and store the historyId of the most recent message.

### 10. Quotas for polling every 60 s with about 15 users

**Source:** https://developers.google.com/workspace/gmail/api/reference/quota (updated 2026-09-10)

> "As of May 1, 2026, the usage limits for this API were updated. Google Cloud projects that made any use of this API between November 2025 and April 2026 will continue with their previously set usage quotas. Cloud projects created on or after May 1, 2026 are subject to the new API quotas."

**Limits**

| Limit | Value |
|---|---|
| Per project per minute | 1,200,000 units |
| Per user per project per minute | 6,000 units |
| Daily billing threshold, per project | 80,000,000 units (can't be raised) |
| Recipients per message | 500 |

- > "Exceeding the quota request limits is planned to incur charges to your Google Cloud billing account later in 2026."
- Also see https://developers.google.com/workspace/tools-safety: "Later in 2026, following 90 days of notice: Quota increase requests will require Google Cloud billing to be enabled."

**Unit costs:** `history.list` 2, `messages.list` 5, `messages.get` 20, `messages.attachments.get` 20, `threads.list` 10, `threads.get` 40, `messages.send` 100, `drafts.send` 100, `watch` 100, `stop` 50, `getProfile` 1.

**Estimate**
- Polling: 15 users × 1 `history.list`/min = 30 units/min, or about 43k units/day.
- Fetching: 200 new messages per user per day via `messages.get` ≈ 60k units/day.
- Sending: 50 sends per user per day ≈ 75k units/day.
- All of this is far below the limits.
- Consumer Gmail's separate sending cap is about 500 emails/day (https://support.google.com/mail/answer/22839).

### 11. Replies that thread correctly

**Sources:** https://developers.google.com/workspace/gmail/api/guides/threads, https://developers.google.com/workspace/gmail/api/guides/sending

> "To be part of a thread, a draft or message must meet the following criteria: The requested threadId must be specified as part of the … messages resource you supply with your request. The References and In-Reply-To headers must be set in compliance with the RFC 2822 standard. The Subject headers must match."

**Format**
> "The Gmail API requires MIME email messages compliant with RFC 2822 and encoded as base64URL strings."

Body: `POST /gmail/v1/users/me/messages/send` with `{"raw": "<base64url>", "threadId": "<gmail thread id>"}`.

**Implementation note (RFC 2822 §3.6.4, https://datatracker.ietf.org/doc/html/rfc2822#section-3.6.4)**
- `In-Reply-To` is the parent's `Message-ID` header value.
- `References` is the parent's `References` followed by the parent's `Message-ID`.
- Get these with `messages.get?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=Subject`.
- The Gmail message `id` is not the RFC `Message-ID`.

### 12. Sending a PDF attachment: size limits

**Size limit**
- The Gmail discovery document (revision 20260907, https://gmail.googleapis.com/$discovery/rest?version=v1) gives `users.messages.send` a `mediaUpload.maxSize` of **36,700,160 bytes (35 MB)**. Accepted type is `message/*`.
- Upload paths: `/upload/gmail/v1/users/{userId}/messages/send` (simple/multipart) and `/resumable/upload/…` (resumable).
- `messages.insert` and `import` allow 150 MB.
- The size is **not** stated on the current HTML reference page.

**Upload types** (https://developers.google.com/workspace/gmail/api/guides/uploads)
- > "Simple upload: uploadType=media. For quick transfer of smaller files, for example, 5 MB or less."
- Multipart: metadata such as `threadId` plus `message/rfc822` in one request.
- Resumable: "especially important with larger files".

**Consumer Gmail limit:** "For personal Gmail accounts, the limit is 25 MB". For Workspace accounts the admin sets it (https://support.google.com/mail/answer/6584). Base64 inflates attachments by about 33% inside the MIME message.

**Build:** a `multipart/mixed` MIME message with a `application/pdf; name=…` part, `Content-Transfer-Encoding: base64` and `Content-Disposition: attachment`. The guide has samples under "Send messages with attachments".

---

## Open / unverifiable

**TikTok**
- **Webhook ID types.** Are `entry[].id`, `page_id` and similar sent as JSON numbers or strings? The field table and samples disagree. Assume numbers and parse bigint-safe.
- **What gets signed.** The exact bytes behind `X-Open-Signature` (raw body vs. re-escaped) aren't spelled out, and there's no official code sample. Test with a real delivery.
- **Custom questions.** Field names in `changes[]` for custom questions aren't documented. The mock-lead example suggests the question label is used as the key (`"Availability"`).
- **`/lead/get/` behaviour.** It has no `lead_id` parameter, and the docs don't say which lead it returns or whether it needs `x-lead-region` for EU/US leads.
- **Mock leads and webhooks.** Whether `/page/lead/mock/create/` actually fires the subscribed webhook isn't stated explicitly; it's only implied by the "end to end testing" wording.
- **Callback URL rules.** No `callback_url` verification handshake (challenge/echo) is documented for lead subscriptions. HTTPS is implied ("delivered via HTTPS POST") but not stated as a hard requirement for `callback_url`.
- **Payload variants.** The docs show one payload with `request_id` and one without; no schema version header is documented for lead webhooks.

**Gmail / Google**
- **"In production" but unverified, with restricted scopes.** The docs say an unverified app is limited to 100 users with click-through warnings, but they don't state whether its refresh tokens are exempt from the 7-day expiry. The 7-day rule is documented only for External + Testing. Google may also block some unverified restricted-scope requests outright; confirm with a real consent flow.
- **Quota baseline for our project.** Existing projects keep their "previously set usage quotas". Check the actual limits in the Cloud console, because which bucket applies depends on the project's creation date and usage between Nov 2025 and Apr 2026.
- **JSON `raw` size cap.** The maximum size for the non-upload JSON `raw` body on `messages.send` isn't documented; only the `/upload` limit (35 MB) is. Use `/upload` for anything above a few MB.
- **CASA cost and timeline.** Current fees and turnaround aren't on Google's pages; the assessors publish them.
- **Billing details.** Charges above the daily threshold are "later in 2026" with 90 days' notice, and no pricing has been published as of 2026-09-17.
