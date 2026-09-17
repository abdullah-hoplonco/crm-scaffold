---
name: HCO CRM
description: WhatsApp-first sales inbox and pipeline for UAE teams — calm, capable, local.
colors:
  lagoon-teal: "#0F5F66"
  lagoon-teal-ink: "#0B474C"
  lagoon-mist: "#E0EEEE"
  saffron: "#E3A21A"
  saffron-deep: "#B87708"
  saffron-mist: "#FCF0D8"
  deep-ink: "#0F2B31"
  deep-ink-raised: "#173F48"
  deep-ink-muted: "#8AAEB2"
  ledger-ink: "#13232A"
  ledger-grey: "#58696D"
  canvas: "#F3F6F6"
  surface: "#FFFFFF"
  hairline: "#D9E2E2"
  field-line: "#CFD9D9"
  signal-green: "#1E7A4B"
  signal-red: "#B4372F"
  signal-blue: "#2F5EA8"
  channel-whatsapp: "#1B9E55"
  channel-instagram: "#C13584"
  channel-facebook: "#1877F2"
  channel-tiktok: "#161B22"
  channel-email: "#5B6B7A"
typography:
  headline:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
  figure:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lagoon-teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.lagoon-teal-ink}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  source-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    typography: "{typography.label}"
  attention-count:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.pill}"
    padding: "0 6px"
    typography: "{typography.label}"
  nav-rail-item:
    backgroundColor: "{colors.deep-ink}"
    textColor: "#D5E5E6"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-rail-item-active:
    backgroundColor: "{colors.deep-ink-raised}"
    textColor: "{colors.surface}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: HCO CRM

## 1. Overview

**Creative North Star: "The Quiet Ledger"**

HCO CRM is kept like a good ledger: every enquiry, message, amount and follow-up written down exactly once, in the right place, legible at a glance. The interface is quiet so the record can speak.

- Surfaces are pale and flat, separated by hairlines rather than shadows.
- Colour is spent sparingly and always carries a meaning: Lagoon Teal means "act here", Saffron means "this needs you now", and the channel colours say where a person came from.
- The Deep Ink navigation rail anchors the page like a ledger's spine.

The personality is **calm, capable, local**. Calm comes from restraint (one accent, flat depth, generous but not loose spacing). Capable comes from precision:

- tabular AED figures
- exact Dubai-time timestamps
- states that are always explicit: ticks, window countdowns, overdue chips

Local comes from content: +971 numbers, AED, TRN, emirates and free zones, Arabic and English names side by side. The system is built for right-to-left later with logical properties throughout. It takes speed and restraint from Linear, trust around money from Stripe's dashboard, and calm, dense records from Attio.

It explicitly rejects three looks:

- the **generic SaaS template** (purple gradients, identical card grids, stock hero metrics)
- **a WhatsApp clone** (a green chat-app skin that hides that this is a sales tool)
- the **dark hacker / terminal look**

**Key Characteristics:**

- Pale teal-tinted canvas (#F3F6F6) with white working surfaces and hairline borders.
- One action colour (Lagoon Teal), one attention colour (Saffron), and semantic signals only where state demands it.
- A single typeface, IBM Plex Sans, in four weights. It has an Arabic sibling for the future RTL build.
- Money and counts in tabular figures; time always in Asia/Dubai.
- Flat by default: depth only for things that float (menus, dialogs, a card being dragged).
- Works equally on a 1440px desktop and a 390px phone with a bottom tab bar.

## 2. Colors

A restrained palette: teal-tinted neutrals, one action accent, one attention accent, and channel colours used as small, meaningful marks.

### Primary

- **Lagoon Teal** (#0F5F66): primary buttons, focus rings, active states, links, selected filters, outbound message tint (at low opacity). This is where the user acts. **Lagoon Teal Ink** (#0B474C) is its pressed/hover shade and the text colour on **Lagoon Mist** (#E0EEEE), the accent wash used for hovered rows and selected items.

### Secondary

- **Saffron** (#E3A21A): anything that needs the user now: unread and new-lead counts, the "Reply within 8 min" speed-to-lead chip, stale-deal flags ("No activity for 5 days"), the active marker on the navigation rail. **Saffron Deep** (#B87708) carries saffron-coloured text on light surfaces; **Saffron Mist** (#FCF0D8) is its background wash.

### Tertiary

- **Deep Ink** (#0F2B31): the desktop navigation rail and the sign-in brand panel only. **Deep Ink Raised** (#173F48) marks the active and hover rail item; **Deep Ink Muted** (#8AAEB2) carries secondary text and icons on the rail.

### Neutral

- **Ledger Ink** (#13232A): all primary text and headings.
- **Ledger Grey** (#58696D): secondary text, metadata, timestamps, helper copy. Never lighter than this for readable text.
- **Canvas** (#F3F6F6): the app background behind pages.
- **Surface** (#FFFFFF): panels, lists, tables, dialogs, message thread background.
- **Hairline** (#D9E2E2): borders and dividers. **Field Line** (#CFD9D9): input borders.

### Semantic signals

- **Signal Green** (#1E7A4B): won deals, successful connection, completed tasks.
- **Signal Red** (#B4372F): lost deals, overdue by a lot, failed message, destructive actions.
- **Signal Blue** (#2F5EA8): informational notes (e.g. "Demo connection").

### Channel marks

WhatsApp (#1B9E55), Instagram (#C13584), Facebook (#1877F2), TikTok (#161B22), Email (#5B6B7A), Manual (#8A6D3B), CSV (#475569). These only identify where a lead or conversation came from, as dots, small icons or thin chips.

### Named Rules

**The One Action Colour Rule.** Lagoon Teal is the only colour that means "do this". It never decorates. If two teal things compete on a screen, one of them is wrong.

**The Saffron Means Now Rule.** Saffron is reserved for time-sensitive attention: unread, new, due, stale. If it isn't urgent, it isn't saffron.

**The Small Channel Rule.** Channel colours appear at chip or dot size only, never as backgrounds, headers or large fills. The product is a sales tool, not a WhatsApp or Instagram skin.

## 3. Typography

**Display Font:** none, by design. Headings use the body family at heavier weights.
**Body Font:** IBM Plex Sans (fallback ui-sans-serif, system-ui, -apple-system, Segoe UI)

**Character:** one engineered humanist sans in four weights (400, 500, 600, 700). It reads like a well-set financial document: neutral, exact and quietly warm. IBM Plex Sans Arabic is the planned pairing for RTL.

### Hierarchy

- **Headline** (600, 1.5rem / 24px, line-height 1.25, -0.01em): page titles ("Pipeline", "Fatima Al Mansoori"). 1.25rem on phones.
- **Title** (600, 1rem, 1.4): section and panel titles, dialog titles, deal card titles (at 0.875rem).
- **Body** (400, 0.875rem / 14px, 1.5): the default for lists, tables, forms and messages. Long text (notes, message bodies, descriptions) caps at 65–75ch.
- **Label** (500, 0.75rem / 12px, 1.35, sentence case): chips, metadata, column counts, timestamps, form helper text.
- **Figure** (600, tabular figures): every AED amount, count and percentage. Always `AED 18,500`, never floats, never a bare number next to "AED" in a different weight.

### Named Rules

**The Sentence Case Rule.** Every label, button, tab, heading and chip is sentence case. All-caps tracked labels are prohibited.

**The Tabular Money Rule.** Any figure that can sit above or below another figure (column totals, card values, dashboard numbers, quote lines) uses tabular numerals so the digits line up like a ledger.

## 4. Elevation

The system is flat. Depth comes from tonal layering: Canvas behind, Surface in front, Hairline between, Lagoon Mist on hover and selection. Shadows exist only for things that genuinely float above the page, and they stay soft.

### Shadow Vocabulary

- **Float** (`box-shadow: 0 8px 24px rgba(15, 43, 49, 0.12), 0 1px 2px rgba(15, 43, 49, 0.06)`): dropdown menus, popovers, the notification panel, the template picker, toasts.
- **Lifted card** (`box-shadow: 0 12px 28px rgba(15, 43, 49, 0.18)`): a kanban card while it is being dragged, and nothing else.
- **Dialog** (`box-shadow: 0 24px 48px rgba(15, 43, 49, 0.20)` over a `rgba(15, 43, 49, 0.4)` scrim): modal dialogs and sheets.

### Named Rules

**The Flat-At-Rest Rule.** Panels, cards, list rows and inputs have no shadow at rest; a 1px Hairline border separates them. A shadow appears only when something floats (menu, dialog) or is being moved (dragged card).

**The No Nesting Rule.** A bordered panel never sits inside another bordered panel. Use a divider or spacing instead.

## 5. Components

The feel is **precise and quiet**: crisp edges, restrained colour, unmistakable focus states. Confidence comes through restraint.

### Buttons

- **Shape:** gently rounded (8px), 36px tall by default; 32px small, 40px large, square icon buttons at the same heights.
- **Primary:** Lagoon Teal fill, white text, 500 weight, 8px 16px padding. Label says exactly what happens ("Mark as won", "Send template").
- **Hover / Focus:** hover darkens to Lagoon Teal Ink; focus shows a 3px Lagoon Teal ring at 50% opacity outside the border. No transforms, no glow.
- **Outline:** white surface, Hairline border, Ledger Ink text; hover fills with Lagoon Mist.
- **Ghost:** no border or fill; Lagoon Mist on hover. Used in toolbars, icon buttons and the mobile "More" sheet.
- **Destructive:** Signal Red fill, only inside confirm dialogs.

### Chips

- **Source chip:** white pill, Hairline border, a coloured channel dot or small channel icon, label in Ledger Ink at 80% (12px, 500).
- **Attention count:** Saffron pill with Ledger Ink figures (11px, 600, tabular), e.g. unread 3, new leads 5.
- **Status pill:** tinted wash with matching deep text: New (Lagoon Mist / Lagoon Teal Ink), Overdue (Signal Red wash), Won (Signal Green wash), Stale (Saffron Mist / Saffron Deep).
- **Filter chip:** outline pill; selected state fills with Lagoon Mist and Lagoon Teal Ink text with a count.

### Cards / Containers

- **Corner style:** 10px for panels, 8px for kanban cards and list items.
- **Background:** Surface on Canvas.
- **Shadow strategy:** none at rest (see Elevation).
- **Border:** 1px Hairline.
- **Internal padding:** 16px for panels, 12px for kanban cards, 12px 16px for list rows.

### Inputs / Fields

- **Style:** white fill, 1px Field Line border, 8px radius, 36px height, 14px text, Ledger Grey placeholder.
- **Focus:** border shifts to Lagoon Teal with the 3px 50% teal ring.
- **Error:** Signal Red border and ring, with a helper line below that says how to fix it ("A TRN has 15 digits").
- **Disabled:** 50% opacity with the reason stated nearby. Example: the WhatsApp composer outside the service window explains the 24-hour rule and offers "Send template".

### Navigation

- **Desktop:** a 240px Deep Ink rail.
  - Brand mark and workspace name at the top.
  - Items with 16px icons in Deep Ink Muted and 14px labels.
  - Hover and active fill with Deep Ink Raised; the active item also gets a 2px Saffron marker.
  - Saffron count pills for Inbox unread and new Leads.
  - A divider before Settings and Demo panel; the user menu at the bottom.
- **Top bar:** 56px white bar with a Hairline bottom border, holding the "Demo data" dashed pill and the notification bell.
- **Mobile:** a white bottom tab bar (64px plus safe area) with Today, Leads, Inbox, Pipeline and More.
  - Active tab in Lagoon Teal.
  - Counts as small Saffron badges on the icons.
  - More opens a bottom sheet.

### Conversation thread (signature component)

- **Bubbles:** inbound on the start side on Surface with a Hairline border; outbound on the end side on a soft Lagoon Teal wash, never WhatsApp green.
- **Metadata:** time in Ledger Grey 12px under each bubble.
- **Ticks:** sent (one check), delivered (two checks), read (two checks in Lagoon Teal), failed (Signal Red).
- **Service window bar:** above the composer. Open: a quiet countdown line. Closed: a Saffron Mist bar explaining the rule, with the primary "Send template" action.

### Kanban board (signature component)

- **Columns:** Canvas background; the header shows stage name, count and a tabular AED total.
- **Cards:** white, 8px radius, Hairline border.
  - Title in Title weight at 14px; contact and company in Ledger Grey.
  - AED value in Figure style.
  - A compact source chip and the assignee avatar.
  - A Saffron "No activity for N days" flag when stale.
- **Dragging:** the card takes the Lifted card shadow; drop targets show a Lagoon Mist wash.

## 6. Do's and Don'ts

### Do:

- **Do** keep screens flat: Canvas (#F3F6F6) behind, white Surface panels with 1px Hairline (#D9E2E2) borders, shadows only on floating or dragged elements.
- **Do** use Lagoon Teal (#0F5F66) for the one primary action per view, and Saffron (#E3A21A) only for unread, new, due or stale.
- **Do** render every AED amount with tabular figures as `AED 18,500` and every timestamp in Asia/Dubai.
- **Do** write sentence-case labels that say what happens ("Send quote on WhatsApp"), with a toast that repeats the verb ("Quote sent").
- **Do** give every list and page explicit loading, empty and error states; an empty screen invites the next action.
- **Do** use logical spacing and alignment (start/end, ms/me, ps/pe) so the Arabic RTL build needs no redesign.
- **Do** keep text readable: Ledger Grey (#58696D) is the lightest colour allowed for text people need to read.

### Don't:

- **Don't** look like a generic SaaS template: no purple gradients, no identical card grids, no stock hero metrics.
- **Don't** become a WhatsApp clone: no green chat-app skin, no WhatsApp green (#25D366) backgrounds, no chat wallpaper. Channel colours stay chip-sized.
- **Don't** go dark hacker or terminal: no dark mode as the default, no neon accents, no monospace data labels.
- **Don't** use side-stripe accents (a coloured border-left or border-right thicker than 1px) on cards, rows or alerts. The only exception is the 2px Saffron active marker on the navigation rail.
- **Don't** use gradient text, glassmorphism, decorative blur, or all-caps tracked eyebrow labels.
- **Don't** nest bordered panels inside bordered panels.
- **Don't** show a raw float or an unformatted phone number: always `formatAed` and `+971 50 123 4567`.
