# Meta research: WhatsApp Cloud API (test number) + Lead Ads (dev-mode app)

Researched 2026-09-17 against the current docs on developers.facebook.com (WhatsApp docs now live under `/documentation/business-messaging/whatsapp/...`, and Lead Ads docs under `/documentation/ads-commerce/...`). I fetched each page's "View as Markdown" version and quoted from it. Where the current docs say nothing, this file says so. The only older source used is one Wayback Machine snapshot of Meta's own earlier doc, and it is labelled as such.

---

## TL;DR: things that change our design or demo

- **Target Graph API `v26.0`** (released 2026-07-29). The docs' code samples still use v23.0 or v25.0. Marketing API v24.0 stops working on 2026-10-06.
- **A WhatsApp contact can't be keyed by phone number alone (changed April 2026).** Every `messages` webhook now includes a business-scoped user ID (BSUID): `contacts[].user_id` and `messages[].from_user_id`. For users who adopt a WhatsApp username, `from` and `wa_id` can be **left out**. Store the BSUID, the phone number when present, and `profile.username`. Since July 2026 you can also send to a BSUID via `recipient`.
- **Biggest demo risk: the Lead Ads Testing Tool doc says "you cannot use the tool in developer mode".** That conflicts with another page that says dev-mode role users can read leads submitted by role users. Plan a fallback: `POST /{form_id}/test_leads` with a Page token, and/or the webhook "Test" button in the App Dashboard. Otherwise we have to switch the app to Live.
- **Dev mode limits webhooks.** Graph webhooks: a dev-mode app only gets App Dashboard test notifications or events started by people with a role on the app. WhatsApp: "some webhooks will not be sent if your app is in Dev mode". The docs don't list which ones, but `messages` test webhooks work in both modes.
- **A dev-mode app can't read leads unless someone with a role on the app submitted them.** Real leads from strangers need Live mode, App Review and Business Verification.
- **Test number limits are no longer in the current docs.** Meta's older doc (archived Feb 2025) said: up to **5** recipient numbers, each verified with a code sent in WhatsApp. No doc, old or new, says whether *arbitrary* senders can message the test number or trigger webhooks.
- **Free-form (non-template) sends only work inside the 24h customer service window.** Outside it you get error `131047`. Starting **2026-10-01**, service (non-template) messages are **billable**. The docs don't say how that affects test numbers, which need no payment method.
- **A template with a DOCUMENT header needs a Resumable Upload API handle** (`POST /{app-id}/uploads` with a User token). The WABA media upload does not work for this. Template review takes up to 24h.
- **Inbound media:** the webhook now includes `url` (gradual rollout from 2025-11-12). Media URLs expire after **5 minutes**, and webhook media IDs after **7 days**. Downloads need the Bearer token. Documents (including PDFs) can be up to **100 MB**.
- **The `leadgen` webhook only carries IDs.** You must call `GET /{leadgen_id}`. The lead node has a `platform` field (type string, per Meta's official SDK), but its **values (fb/ig) aren't documented**. Testing-tool leads are "organic leads that are not associated with any ad", so expect no ad or campaign IDs.
- **The leadgen webhook sample sends IDs as JSON *numbers*.** Lead IDs are 15 to 17 digits, which is past JavaScript's safe integer limit. Parse IDs as strings or bigints.
- **Plan for duplicate webhook deliveries and deduplicate.** WhatsApp retries for up to 7 days, Page/leadgen webhooks for 36h. Deduplicate on `wamid` and `leadgen_id`. Both webhook types use `X-Hub-Signature-256` (HMAC-SHA256 of the payload with the app secret).
- **Store `leadgen_id`.** It is the `lead_id` that the Conversions API for CRM needs later.
- **WhatsApp account model is changing (H2 2026 to H1 2028).** The WABA ID becomes the "Messaging Account" ID. By H1 2028, APIs that take `phone_number_id` in the path must use a new WAAC ID instead. Nothing to do for the demo, but don't hard-wire `phone_number_id` as a permanent key.

---

## WhatsApp Cloud API

### 1. Graph API version to target
**Answer:** `v26.0`.
- "The latest Graph API version is: v26.0". v26.0 was introduced July 29, 2026 ("Available Until TBD"). v25.0: Feb 18, 2026 (available until July 29, 2028). v24.0: Oct 8, 2025. v23.0: May 29, 2025. Marketing API v24.0 is "Available until October 6, 2026". https://developers.facebook.com/docs/graph-api/changelog
- The WhatsApp doc samples still use `v23.0` (Get Started) and `v25.0` (most reference pages). Meta's official Python Business SDK is pinned to `'API_VERSION': 'v26.0'`. https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/apiconfig.py
- **Changed 2025–2026:** v23, v24, v25 and v26 were all released in this period.

### 2. Test phone number constraints
- **Current docs:** only say test assets exist and have relaxed limits. "a test WhatsApp Business account and test business phone number are automatically created for you… they have relaxed messaging limits and don't require a payment method on file in order to send template messages." https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- **Current Get Started page:** has no recipient cap and no verification step. It only says "Add a To phone number that will receive the test message." https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- **Meta's older doc (Wayback snapshot, 2025-02-24):**
  - "With this number, you can send free messages to up to 5 recipient phone numbers."
  - "The recipient number will receive a confirmation code in WhatsApp that can be used to verify the number… Repeat this process if you'd like to add another recipient, up to 5 in total."
  - https://web.archive.org/web/20250224210757/https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/
  - **So:** recipients had to be pre-verified, with a cap of 5. The current docs neither confirm nor deny this.
- **Can any WhatsApp user message the test number, and does the webhook fire for unverified senders?** **No doc covers this, old or new.** The only documented flow is an allow-listed recipient replying ("Once you receive the message you sent, make sure to reply back", Get Started). The current error-code list has no "recipient not in allowed list" entry. https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes

### 3. Templates on the test WABA
- **Default templates:** the current docs only name `hello_world`: "The temporary access token you created to send the `hello_world` template message expires quickly" (Get Started). The archived 2025 doc said Meta "Creates a set of pre-approved message templates" but named only `hello_world`. **The full default set isn't documented.**
- **Custom templates on a test WABA:** no doc says test WABAs are excluded or treated differently. The standard flow applies: `POST /<WABA_ID>/message_templates`. "Templates must have a status of `APPROVED` before they can be sent". Limits: 250 templates per WABA for unverified portfolios, and 100 creations per hour. https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
- **DOCUMENT header:**
  - Supported: `"format": "<FORMAT>"`, which can be "`IMAGE`, `VIDEO`, `GIF`, or `DOCUMENT`".
  - "You must upload all media with the Resumable Upload API", and put the handle in `example.header_handle`. https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/components
  - Resumable Upload steps:
    1. `POST /v26.0/<APP_ID>/uploads?file_name&file_length&file_type` with a **User access token**. Returns `{"id":"upload:<SESSION>"}`.
    2. `POST /upload:<SESSION>` with header `Authorization: OAuth <token>` and `file_offset: 0`. Returns `{"h":"<HANDLE>"}`.
    3. Allowed types: pdf, jpeg, jpg, png, mp4.
    - https://developers.facebook.com/docs/graph-api/guides/upload
- **Approval:** "It can take up to 24 hours for an approval decision to be made." A `message_template_status_update` webhook is sent. https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review

### 4. Customer service window and pricing (only the parts that decide whether free-form is allowed)
- "When a WhatsApp user messages you or calls you, a 24-hour timer called a customer service window starts. If the user messages or calls you again before the timer expires, the timer resets to 24 hours. While the window is open, you can send any of the service message types… When the window closes, you can only send pre-approved template messages." https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
- Error if you miss the window: `131047`, "More than 24 hours have passed since the recipient last replied to the sender number." (error-codes page above)
- **Per-message pricing (changed 2025):** "Effective July 1, 2025, Meta charges on a per-message basis… Non-template messages can only be sent within an open customer service window." https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- **2026 change:** "Effective October 1, 2026, Meta will charge for service messages, which have not been charged since November 2024", and "for utility messages sent in response to users within an open 24-hour customer service window." The allowed-message rules themselves don't change. https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- **Undocumented:** whether test numbers without a payment method can still send non-template messages after 2026-10-01.

### 5. Webhooks
**Verification handshake:**
- The request is `GET <CALLBACK_URL>?hub.mode=subscribe&hub.challenge=<…>&hub.verify_token=<…>`.
- "compare the `hub.verify_token` value… If the request is valid, respond with HTTP status `200` and the `hub.challenge` value."
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint

**Signature:**
- Header `X-Hub-Signature-256: sha256=<SHA256_PAYLOAD_HASH>`: "HMAC-SHA256 hash, calculated using the post body payload and your app secret as the secret key… Compare… (everything after `sha256=`)." Compute it over the raw body bytes.
- Retries: "retried immediately, then a few more times with decreasing frequency over the next 7 days. Your server should handle deduplication". Batches can hold up to 1000 updates. Payloads can be up to 3 MB. (same page, plus https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- **Dev mode:** "Make sure your app is in **Live** mode; some webhooks will not be sent if your app is in **Dev** mode." (webhooks overview). "`messages` test webhooks work in both modes." https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/set-up-whatsapp-echo-bot
- **Permissions:** `whatsapp_business_messaging` for `messages` webhooks, `whatsapp_business_management` for everything else (webhooks overview).

**Field locations:**
- Business number: `entry[].changes[].value.metadata.phone_number_id` and `.display_phone_number`.
- WABA ID: `entry[].id`.
- Sender profile name: `value.contacts[].profile.name`. Also `profile.username` if the user has one (BSUID doc).
- Sender IDs: `value.contacts[].wa_id`, `messages[].from`, `contacts[].user_id` and `messages[].from_user_id`.
- Inbound messages have a `messages` array. Outbound status updates have a `statuses` array. https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages

**Inbound text (copied from docs):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "102290129340398",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550783881",
              "phone_number_id": "106540352242922"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Sheena Nelson"
                },
                "wa_id": "16505551234"
              }
            ],
            "messages": [
              {
                "from": "16505551234",
                "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=",
                "timestamp": "1749416383",
                "type": "text",
                "text": {
                  "body": "Does it come in another color?"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```
Source: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/text

**Inbound image and document:** same envelope as text. Only the `messages[]` entry changes:
- Image: `"type":"image","image":{"caption","mime_type","sha256","id","url"}`. https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/image
- Document: `"type":"document","document":{"caption","filename","mime_type","sha256","id","url"}`. Example values: `"filename": "receipt.pdf", "mime_type": "application/pdf"`. https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/document
- The `url` property "is being released to developers gradually over several weeks, starting November 12, 2025" (**2025 change**).

**Status (copied from docs, "sent"):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "102290129340398",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550783881",
              "phone_number_id": "106540352242922"
            },
            "statuses": [
              {
                "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQUFERjg0NDEzNDdFODU3MUMxMAA=",
                "status": "sent",
                "timestamp": "1750030073",
                "recipient_id": "16505551234",
                "conversation": {
                  "id": "72b14d6bd5407799e66f64d1b338e567",
                  "expiration_timestamp": "1750116480",
                  "origin": {
                    "type": "marketing"
                  }
                },
                "pricing": {
                  "billable": true,
                  "pricing_model": "PMP",
                  "type": "regular",
                  "category": "marketing"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```
**Status webhook details:**
- `status` values: `sent`, `delivered`, `read`, `failed`, `played`.
- "delivered" can be skipped: when a message is delivered and read at the same time, "the 'delivered' webhook is not sent".
- `failed` includes `statuses[].errors[]` with `code`, `title`, `message`, `error_data.details` and `href`. Example error code: `131049`.
- For webhooks v24.0+, `conversation` is "Omitted entirely… unless webhook is for a free entry point conversation".
- `pricing_model` is `PMP`. `CBP` only appears on webhooks sent before 2025-07-01.
- Doc bug: the "read" example on that page actually shows `"status": "sent"`.
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status
- System- and account-level errors come in `value.errors[]` instead. https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/errors

**BSUID / usernames (2026 change, affects the contact model):**
- "BSUIDs began appearing in webhooks in early April 2026."
- "If a WhatsApp user enables the username feature, their phone number will not be included in webhooks, unless you have interacted with the user before". The conditions: a message or call within 30 days, or the user is in the contact book.
- Format example: `US.13491208655302741918`.
- Status webhooks (sent, delivered, read) add `contacts[]` with `user_id`, and `statuses[].recipient_user_id`. `failed` omits `contacts`.
- You can test these payload variants with the App Dashboard "Test" link.
- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids

**Webhook subscription on the WABA:** Partner docs say "You must individually subscribe to every WABA" via `POST /<WABA_ID>/subscribed_apps`. https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-webhooks. The docs don't say whether a direct developer's test WABA is auto-subscribed. If no webhooks arrive, call that endpoint.

### 6. Media
**Download inbound media:**
- `GET /<MEDIA_ID>` (optional `?phone_number_id=`) returns `{messaging_product,url,mime_type,sha256,file_size,id}`.
- "Media URLs **expire after 5 minutes**". "Media IDs in webhooks expire after 7 days."
- Then `curl '<MEDIA_URL>' -H 'Authorization: Bearer …'`. "If you omit your token, the request will fail." A 404 means you need a new URL.
- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media

**Upload:**
- `POST /<PHONE_NUMBER_ID>/media`, multipart: `-F 'messaging_product=whatsapp' -F 'file=@<FILE>;type=<MIME_TYPE>'`. Returns `{"id":"<MEDIA_ID>"}`.
- The parameter table also lists `type` as **Required**, but the sample passes it only inside the `file` part. Send both to be safe.
- Uploaded media "persist for 30 days".

**Send a document:**
- `"type":"document","document":{"id":"<MEDIA_ID>" | "link":"<URL>","caption","filename"}`.
- "we recommend using `id`". `link` is marked "(not recommended)". Linked media is cached 10 minutes.
- Caption max 1024 characters.
- https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages

**Size limits:**
- PDF `application/pdf` **100 MB**, and the same for txt, xls(x), doc(x) and ppt(x).
- Images: 5 MB. Audio and video: 16 MB.
- Inbound over 100 MB triggers error `131052`.

### 7. Access tokens for the test setup
- **Temporary token:** the API Setup panel "always generates a new User access token… user access tokens expire quickly, so you will have to keep generating a new one every few hours." The current docs don't say "24h". https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens
- **Permanent token:** create a system user in Business Settings, assign the app (Manage app) and the WABA, then "Generate token… choose a token expiration preference". Permissions: `business_management`, `whatsapp_business_management`, `whatsapp_business_messaging` (same page, plus Get Started step 5).
- **App Review:** "If you are a direct developer and only access your own business data, you do not need to undergo App Review or obtain **Advanced access** for any permissions." https://developers.facebook.com/documentation/business-messaging/whatsapp/permissions
- **Business verification:** neither WhatsApp page makes it a prerequisite for a system user token. The general system-users doc does say:
  - "To create a system user access token, this app must have Standard Access."
  - Standard access allows **1 system user + 1 admin system user**.
  - It also says "Have the Meta app go through an app review (and Business verification) for the permissions the system user wants access to". That conflicts with the WhatsApp permissions page. For WhatsApp direct developers, the WhatsApp-specific text is the one to follow.
  - https://developers.facebook.com/docs/business-management-apis/system-users/overview
- **Dev mode:** no doc explicitly says whether system user tokens work while the app is in Development mode. Get Started has you create one right after creating the app, before any Live switch.

### 8. Mark as read and typing indicators
- **Mark as read:** `POST /<PHONE_NUMBER_ID>/messages` with `{"messaging_product":"whatsapp","status":"read","message_id":"<wamid>"}`. Returns `{"success":true}`. "Mark incoming messages as read within 30 days… the API also marks earlier messages in the conversation as read." https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read
- **Typing indicator:** same endpoint and body, plus `"typing_indicator":{"type":"text"}`. This also marks the message as read. "dismissed once you respond, or after 25 seconds". https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators

### 9. Listing templates
- Endpoint: `GET /<WABA_ID>/message_templates`. Query params: `fields`, `limit`, `after`, `before`.
- Available fields: `id, ad_account_id, ad_adset_id, ad_campaign_id, ad_id, bid_spec, category, components, correct_category, cta_url_link_tracking_opted_out, degrees_of_freedom_spec, display_format, health_status, is_primary_device_delivery_only, is_sms_fallback_enabled, language, last_updated_time, library_template_name, message_send_ttl_seconds, name, parameter_format, previous_category, quality_score, rejected_reason, source, status, sub_category`.
- https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api
- **Approved only:** the guide shows `?fields=name,category,status&status=approved`, but `status` isn't in the reference's param table. https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management
- **Permission:** `whatsapp_business_management`, "needed to access… template management". (permissions page)
- **Rate limit:** 200 requests/hour per app per WABA, or 5000/hour for an active WABA with a registered number. (about-the-platform)

---

## Meta Lead Ads

### 10. Lead Ads Testing Tool
- **URL:** https://developers.facebook.com/tools/lead-ads-testing (still live; it redirects to Business login).
- **What the doc says:**
  - "You can use this tool to create and delete test leads for your forms; **however, you cannot use the tool in developer mode**."
  - "You can create one test lead per form."
  - "The drop-down lists all the pages you have advertiser access to." You then pick a form, click Create Lead, then Track Status.
  - "The leads created using this tool are organic leads that are not associated with any ad."
  - https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/testing-troubleshooting
- **Requirements (as documented):**
  - Advertiser access on the Page.
  - An existing form.
  - For webhook delivery, the app installed on the Page (see Q14).
  - "developer mode" isn't defined. It most likely means the app being in Development mode, which is our case.
- **API alternative (same page):**
  - `POST /{FORM_ID}/test_leads`. Optional `field_data`, `custom_disclaimer_responses`.
  - Requirements: no existing test lead on the form, a "page role of `Advertiser` or above", and a Page access token.
  - Read with `GET /{FORM_ID}/test_leads`. Delete with `DELETE /{LEAD_ID}` ("Only the owner of the lead can delete the lead").
  - Also: "You can test your leads via the Test button… inside the Webhooks dashboard for the app."

### 11. `leadgen` webhook (Page object)
- Subscribe the app to the **Page** object, field **leadgen**.
- Value fields (Page webhook reference): `adgroup_id` (id), `ad_id` (id), `created_time` (datetime), `leadgen_id` (id), `page_id` (id), `form_id` (id). https://developers.facebook.com/docs/graph-api/webhooks/reference/page
- Example copied from the docs. Note the IDs are JSON numbers, and `created_time` is a unix int:
```json
{
   "object": "page",
   "entry": [
       {
           "id": 153125381133,
           "time": 1438292065,
           "changes": [
               {
                   "field": "leadgen",
                   "value": {
                       "leadgen_id": 123123123123,
                       "page_id": 123123123,
                       "form_id": 12312312312,
                       "adgroup_id": 12312312312,
                       "ad_id": 12312312312,
                       "created_time": 1440120384
                   }
               }
           ]
       }
   ]
}
```
  (The source shows two `changes` entries; one is shown here.) https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/
- **Signature and retries (Graph webhooks in general):**
  - `X-Hub-Signature-256: sha256=…`: "Generate a SHA256 signature using the payload and your app's App Secret."
  - Retries "over the next 36 hours".
  - https://developers.facebook.com/docs/graph-api/webhooks/getting-started
- **Latency:** "real-time pings occur on events with a delay of up to a few minutes." https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving

### 12. Retrieving a lead
- **Call:** `GET /v26.0/{leadgen_id}` (docs sample uses v25.0). Documented response keys: `created_time` (ISO string, e.g. `"2015-02-28T08:49:14+0000"`), `id`, `ad_id`, `form_id`, and `field_data: [{name, values:[…]}]`.
- **Extra fields:** checkbox answers are not in `field_data`. Use `fields=custom_disclaimer_responses`. https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving
- **Full field list:** the reference page (`UserLeadGenInfo`, linked from the adgroup leads reference) returns 404 today. Meta's official auto-generated SDK lists the Lead fields:
  - Fields: `ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name, created_time, custom_disclaimer_responses, field_data, form_id, home_listing, id, is_organic (bool), partner_name, platform (string), post, post_submission_check_result, retailer_item_id, vehicle`.
  - https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/lead.py
  - Linking page: https://developers.facebook.com/documentation/ads-commerce/graph-api/reference/adgroup/leads
- **`platform`:** the field **exists** (type string). **No Meta source I found documents its values**, so I can't confirm "fb" or "ig", and **I can't tell what value Testing Tool leads get.**
- **Instagram leads:** "The leads generated via the ad still belong to the Facebook Page." So Instagram leads arrive through the same Page `leadgen` webhook. https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads
- **Organic leads:** "If any entries lack Ad IDs or Adgroup IDs… The lead is generated from organic reach… `is_organic`… displays `1`" (CSV export context), "The lead may be submitted from an Ad Preview", or the requester lacks advertiser access on the ad account. (retrieving page)
- **Ad-level fields** (`ad_id`, `campaign_id`) need a token from "a person who can advertise on the ad account and on the Page".

### 13. Permissions, dev mode, Business Verification
- **Webhook guide list:** `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`, `ads_management`. The token must be a Page access token from someone who can do the `ADVERTISE` task.
  - One page spells it `lead_retrieval`, which is a typo.
  - https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration
- **Retrieving page (all lead and ad data)** adds `pages_manage_ads`.
- **`leads_retrieval` dependencies:** "Ads Management Standard Access, ads_management, ads_read, business_management, pages_manage_ads, pages_read_engagement, pages_show_list". https://developers.facebook.com/docs/permissions
- **Dev mode with role users, no App Review:**
  - "Apps in Development mode can only request permissions from role users, and only permissions with standard or advanced access levels." https://developers.facebook.com/docs/development/build-and-test/app-modes
  - "All Business, Consumer, and Gaming apps are automatically approved for Standard Access for all permissions and features." https://developers.facebook.com/docs/graph-api/overview/access-levels
  - Caveat: that page says it is "only applicable to apps created using an App Type". Newer "use case" apps aren't covered explicitly.
- **Lead-specific dev-mode rule:** "You can't retrieve leads if your app is in Development mode. For testing purposes, Development mode app users can access leads submitted by someone with a role in that same app." (lead-ads overview)
- **Business Verification:** "Business Verification is required to get Advanced Access" (access-levels). Nothing requires it for Standard Access or dev mode. The Lead Ads overview asks for App Review with `leads_retrieval` and `pages_manage_ads`, then "After approval, you will be asked to complete Business Verification". That applies to Live use.
- **Page connected to a business portfolio or ad account?** **No doc requires it** for forms or test leads. Ad-level fields need ad account advertiser access. Leads Access Manager (Q14) is a business-portfolio feature.

### 14. Subscribing the app to a Page, and lead access
- **Subscribe:** `POST https://graph.facebook.com/{page-id}/subscribed_apps?subscribed_fields=leadgen&access_token={page-access-token}` returns `{"success": "true"}`. Check with `GET /{page-id}/subscribed_apps`.
- "Webhook notifications will only be sent if your Page has installed your Webhooks configured-app, and if the Page has not disabled the App platform in its App Settings." (webhooks-for-leadgen)
- **Default access:** "If the Page admin did not customize leads and has not granted access permission with the Leads Access Manager, then all Page admins will have leads access permission. If leads access permission is customized by the business admins, then it depends on the business admin's configuration". (retrieving page)
- "To read lead data, you need Page Admin access or flexible permissions." (lead-ads overview)
- **Help Center** (pages are client-rendered; the text below comes from search-result snippets of Meta's own pages, not a full-page fetch):
  - Only people with full control of the business portfolio can enable leads access.
  - "Customize access" auto-assigns access to existing Page admins and integrated CRMs.
  - CRMs can be assigned under Business settings > Integrations > Leads access.
  - https://www.facebook.com/business/help/618808448980683 and https://www.facebook.com/business/help/540596413257598
- **Practical reading:** if nobody has customized Leads Access, a Page admin's token should work without extra grants. If it has been customized, our app/CRM must be assigned. I couldn't fetch the full Help Center text to confirm how an *unreviewed dev-mode app* shows up in that CRM list.

### 15. Are webhooks delivered in Development mode?
- **Graph webhooks (applies to Page `leadgen`):** "Apps in development mode can only receive test notifications initiated through the app dashboard or notifications initiated by people who have a role on the app." https://developers.facebook.com/docs/graph-api/webhooks
- **Test leads created by an app role user** (Testing Tool or `test_leads`) should therefore be delivered. But see the Q10 warning that the tool "cannot [be used] in developer mode".
- **Real leads from non-role users:** not delivered in dev mode, and not retrievable either (Q13).

### 16. 2025–2026 changes relevant to us
- **Messenger lead ads (v24.0, Oct 2025):** "The ability to create lead ads that generate leads in Messenger with the API is being deprecated" (`POST /{page-id}/messenger_lead_forms`). This doesn't affect Instant Form leadgen retrieval. https://developers.facebook.com/documentation/ads-commerce/marketing-api/marketing-api-changelog/version24.0
- **Marketing and Graph API v25/v26 changelogs:** no changes to lead retrieval or the `leadgen` webhook. https://developers.facebook.com/documentation/ads-commerce/marketing-api/marketing-api-changelog/version26.0 and https://developers.facebook.com/docs/graph-api/changelog/version26.0
- **Graph v26.0 protocol changes:** "Requests that include `date_format` return an error"; `pretty` and `debug` are ignored.
- **Webhooks mTLS (v25.0 changelog):** a new Meta CA certificate from March 31, 2026. This only matters if we enforce mTLS. https://developers.facebook.com/docs/graph-api/changelog/version25.0
- **Conversions API for CRM (Conversion Leads):**
  - Events need `action_source: system_generated`, `custom_data.event_source: crm` and `lead_event_source`.
  - `lead_id` is recommended and "must be… valid… or else the system will reject the event". You get it "from the `leadgen_id` field in the leadgen Webhook response". **Persist `leadgen_id`.**
  - I found no dated 2025–2026 change notice on these pages.
  - https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration/payload-specification and https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration/how-to-find-the-lead-id
- **Lead retention:** a web-search snippet from a Meta Business Help Center lead-download article says lead data is available for 90 days. I couldn't confirm which article (candidates: https://www.facebook.com/business/help/734933888443065, https://www.facebook.com/business/help/794345304231812), and none were full-fetched. The rate limit is "200 multiplied by 24 then multiplied by the number of leads created in the past 90 days" per Page per 24h. (retrieving page)

---

## Open / unverifiable

1. **Test number recipients:** is the 5-recipient cap and pre-verification still enforced? The current docs are silent; only the Feb 2025 archive states it.
2. **Inbound from strangers:** can a non-allow-listed WhatsApp user message the test number, and does the `messages` webhook fire? Not documented anywhere.
3. **Dev-mode WhatsApp webhooks:** which ones are suppressed? The docs only say "some".
4. **Default templates:** the full set on the test WABA beyond `hello_world` isn't documented. Test WABAs aren't explicitly excluded from custom template creation, but that isn't explicitly confirmed either.
5. **Test numbers after 2026-10-01:** can they still send non-template messages without a payment method once service messages are billable? Not documented.
6. **Direct-developer auto-subscription:** does a direct developer's test WABA need `POST /<WABA_ID>/subscribed_apps`, or is it subscribed automatically? Not stated.
7. **System user tokens in dev mode:** are they fully functional while the app is in Development mode? Implied by the Get Started flow, never stated. The system-users doc mentions App Review/Business Verification, which conflicts with the WhatsApp permissions page.
8. **Lead Ads Testing Tool vs dev mode:** "cannot use the tool in developer mode" conflicts with "Development mode app users can access leads submitted by someone with a role". This has to be tested hands-on. If it fails, try `POST /{form_id}/test_leads` or switch to Live.
9. **`platform` field:** the enum values (e.g. `fb`/`ig`) and what Testing Tool leads return are undocumented. `is_organic` for test leads is also not explicitly documented; it's only implied by "organic leads that are not associated with any ad".
10. **Real payload ID types:** the `leadgen` webhook sample uses JSON numbers, but the reference only says "id". Handle both numbers and strings.
11. **Leads Access Manager:** how an unreviewed dev-mode app appears in "CRM systems" and whether it must be assigned. The Help Center pages couldn't be fully fetched.
12. **Use-case apps:** the access-levels doc applies to "App Type" apps. The dev-mode Standard Access behaviour for `leads_retrieval` on newer "use case" apps isn't described explicitly.
13. **Business portfolio / ad account:** no doc says whether the Page must belong to a business portfolio or be linked to an ad account just to create forms and test leads.
