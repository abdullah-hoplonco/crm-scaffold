# DEMO.md — the client demo, click by click

Everything here runs on the deployed URL. It needs no server setup, no WhatsApp account and no Meta app: the demo workspace lives in the browser, and the Demo panel manufactures realistic leads and messages through the same path real channels will use.

**The demo workspace:** Noor Al Marsa Aesthetic & Dental Clinic, Dubai Marina — a fictional clinic. Owner Dr. Hessa Al Suwaidi, manager Omar Farouk, and three patient coordinators (Priya, Yousef, Maria).

---

## Before the meeting (2 minutes)

1. Open the deployed URL.
2. Sign in as **Dr. Hessa Al Suwaidi** (the owner) from the user list — one click, no password.
3. Go to **Demo panel** in the left rail and press **Reset demo data**. This restores the story with fresh timestamps, so "7 min ago" really is 7 minutes ago.
4. Open a second window and sign in as **Priya Nair** (a rep) — the demo panel has a button for exactly this.
5. Put the two windows side by side. Left: the panel (owner). Right: Priya's screen (the rep).

If a demo ever goes sideways, press **Reset demo data** and start again. Nothing is destroyed — it rebuilds the same clinic.

---

## The pitch in one line

> Every enquiry your ads and your WhatsApp bring, in one inbox, already assigned, with a deadline — and the owner can see which channel actually produces revenue.

Show it in this order. Each part ends with something the client can see happened.

---

## Part 1 — The pipeline (2 minutes)

**Where:** left rail → **Pipeline** (sign in as Hessa).

**Say:** "This is the clinic's week. Every column is a stage of a patient's decision, and the header of each column is the money sitting in it."

**Point at:**
- The line under the title: **19 open deals worth AED 241,050**, and **AED 102,025 weighted by each stage's chance to close**. The weighting is the stage probability — the owner sees a realistic forecast, not a wish list.
- Column totals in AED, and the percentage above each column.
- A card with the saffron flag **"No activity for 5 days"** — "nobody has touched this in five days, so it's flagged. That's the feature that stops deals quietly dying."
- The small coloured dot on each card — where the lead came from (Instagram, TikTok, WhatsApp, Facebook, email).

**Do:** drag a card from **New enquiry** to **Consultation booked**. The totals move, and the deal's timeline gains the entry.

**Then:** open the card. Show the timeline — every message, call, note and stage move, in order, with timestamps. "Nobody types a status again. It writes itself."

---

## Part 2 — Leads arrive by themselves (3 minutes, the heart of the demo)

**Both windows visible.**

**Say:** "Now watch what happens when someone enquires on Instagram."

**Do:** in the left window (Demo panel) press **New Instagram lead**.

**Look at the right window (Priya).** Within about a second:
- A notification: *"New Instagram lead: <name>"* with the enquiry text and an **Open** button.
- The lead at the top of the list, timestamped **Just now**.
- It is **already assigned** to Priya, and carries a saffron chip: **"Reply within 14 min"**.

**Say:** "That's round-robin assignment — the lead never sits in a pile waiting for a manager to hand it out. And it has a deadline from the second it arrives."

**Point at the badges:** Instagram, TikTok, WhatsApp, Facebook — "same inbox, but you always know where they came from."

**Point at "Existing patient"** on Layla Haddad's row: "She enquired before. We matched her on her phone number, so the rep sees she's a returning patient before she even opens the chat."

**Do:** open the new lead → **Open WhatsApp** → type a reply → send.
- The message appears in the thread with **sent → delivered → read** ticks.
- Above the composer: the **24-hour window** countdown. "WhatsApp only lets you reply freely for 24 hours after the customer's last message. After that the app switches to approved templates — and the rep can see exactly when that happens instead of guessing."

**Then:** press **Convert to deal** → the dialog is already filled in from the enquiry (name, phone, treatment, value). Confirm.

**Say:** "The rep typed nothing that the lead already told us. That's the whole product in one screen."

Show the new card on the kanban in **New enquiry**.

---

## Part 3 — The owner's view (2 minutes)

**Where:** sign in as Hessa → left rail → **Dashboard**.

**Say:** "This is what the owner actually buys."

**Point at "What stands out":**
- *"TikTok sent 46 leads and none became a deal."*
- *"Instagram brought the most deals: 8 from 41 leads, 2 already won."*
- *"5 open deals worth AED 59.2K have had no activity for 3 days or more."*

**Say:** "The numbers are picked by fixed rules from the last 30 days — no AI, nothing to configure. The dashboard's job is to tell you where to spend money: TikTok is burning budget and returning nothing, Instagram is your real channel."

**Then the other widgets:** leads by source with won/deal/no-deal split, open pipeline AED, won this month, and rep activity — who is actually messaging patients.

**Then:** sign in as Priya → **Today**.

**Say:** "This is the rep's home screen on their phone. Not a report — a to-do list. Tasks due, patients waiting for a reply, and deals going cold."

---

## Part 4 — Quote to close (2 minutes)

**Do:** open the won-stage deal (or the Invisalign deal) → **Quotes** → **New quote**.

- Add line items, or take the suggested treatment.
- Point at the live totals: **subtotal, VAT 5%, total in AED**, and the clinic's **TRN**.
- **Save**, then **Download PDF** — show the document: real UAE quotation with TRN, validity, itemised prices, VAT, amount in words, and a footer citing Federal Decree-Law No. 8 of 2017.

**Do:** **Send on WhatsApp** (works because the patient replied within 24 hours). The PDF lands in the chat as a document.

**Say:** "The quote goes out on the channel the patient actually reads, from the number they already have, and it's on the timeline forever."

**Then:** mark the deal **Won** and return to the dashboard — "won this month" moved.

---

## Part 5 — Bringing their own data in (2 minutes)

**Where:** **Contacts** → **Import**.

1. Drop a spreadsheet, or press **Use sample file**.
2. Columns are auto-mapped (Patient name → Full name, Mobile → Phone).
3. The review step flags each row: **new**, **duplicate** (matched on phone, naming the existing contact), or **invalid**, with the reasons. Nothing is written yet.
4. Import, then read the summary: how many were created, how many already existed, how many need fixing.

**Say:** "It checks against the contacts you already have by phone number, so you import your book once and stop creating duplicates forever."

**Finish with:** left rail → **Settings** → show the workspace TRN, the team, the channels, and **Lead assignment**. "Everything the owner needs to run this without us."

---

## What is real and what is simulated

Be straight about this if asked — it is a strength, not a confession.

| Real today | Simulated today |
|---|---|
| Every screen, every rule, every total | The leads and messages come from the Demo panel, not from Meta |
| The lead pipeline: matching, round-robin assignment, deadlines, conversion | WhatsApp delivery ticks are played back by the simulator, not by Meta |
| UAE field-level details: AED, 5% VAT, TRN, emirates, free zones, +971 numbers | Channel connections in Settings show a demo connect flow |
| The API contract and data model that the real backend implements | Sign-in is a user picker (real sessions arrive with the backend) |
| Phone-number matching and duplicate detection | The spreadsheet import writes to the browser, not a server |

**The next phase** wires the same screens to a real server and the official WhatsApp Cloud API — using Meta's test number first. Nothing on screen is thrown away: the screens only know the API contract, so they switch to live data without a redesign.

---

## If something goes wrong

| Symptom | Fix |
|---|---|
| Numbers look stale ("5 days ago" on a fresh lead) | Demo panel → **Reset demo data** |
| The rep window doesn't update live | Make sure both windows are in the same browser (live updates are per browser) |
| A page looks empty | Reload it; if it persists, reset the demo data |
| You lost the rep window | Demo panel → **Open as a rep in a new window** |
