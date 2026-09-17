# WhatsApp-First Sales CRM

A sales inbox with a deal pipeline for small UAE B2B sales teams. Enquiries arrive from ads and messaging, reps reply on the channel the enquiry came from, and every touch lands on a timeline.

## Language

### Tenancy and people

**Workspace**:
One subscribing business and everything it owns in the CRM (e.g. "Al Noor Trading LLC").
_Avoid_: Tenant, organisation, account, company

**User**:
A person who logs in to exactly one Workspace, with exactly one Role.
_Avoid_: Member, agent, seat

**Owner**:
A User with the `owner` Role: the business owner who buys the product, sees everything and controls settings and exports.
_Avoid_: Admin, record owner

**Manager**:
A User with the `manager` Role who sees every record in the Workspace but not settings or exports.
_Avoid_: Team lead, supervisor

**Rep**:
A User with the `rep` Role who works the Leads, Conversations and Deals assigned to them or unassigned.
_Avoid_: Agent, salesperson, seller

**Assignee**:
The User responsible for a Lead, Contact, Company, Deal, Conversation or Task.
_Avoid_: Owner, record owner, assigned rep

### Customers

**Lead**:
An unqualified inbound enquiry that has not yet become a Contact and Deal.
_Avoid_: Prospect, enquiry record, opportunity

**Lead Source**:
Where a Lead came from: Facebook, Instagram, TikTok, WhatsApp, email, manual entry or CSV.
_Avoid_: Channel, origin, adapter

**Simulated**:
Produced by the Simulator rather than a real channel; applies to Leads, Conversations and Messages.
_Avoid_: Fake, test, mock

**Conversion**:
Turning a Lead into a new Deal for a new or existing Contact.
_Avoid_: Qualification, promotion

**Contact**:
A real person the Workspace sells to.
_Avoid_: Customer, client, person

**WhatsApp User ID**:
Meta's stable per-business identifier for a WhatsApp user, used to recognise them when no phone number is present.
_Avoid_: wa_id, BSUID, WhatsApp number

**Company**:
The business a Contact works for, carrying UAE registration details.
_Avoid_: Account, organisation, client, workspace

**Emirate**:
One of the seven UAE emirates where a Company is registered.

**Jurisdiction**:
Whether a Company is licensed on the UAE mainland or in a Free Zone.

**TRN**:
The UAE Tax Registration Number of a Workspace or Company, printed on Quotes.
_Avoid_: VAT number, tax ID

### Selling

**Pipeline**:
The ordered set of Stages a Deal moves through.
_Avoid_: Funnel, board

**Stage**:
A step in a Pipeline, of type open, won or lost.
_Avoid_: Status, column, phase

**Deal**:
A specific sales opportunity with one Contact, valued in AED, sitting in exactly one Stage.
_Avoid_: Opportunity, sale, lead

**Stage Transition**:
The recorded move of a Deal from one Stage to another, by whom and when.

**Quote**:
A priced offer for a Deal with line items, 5% VAT and AED totals.
_Avoid_: Proposal, estimate, invoice

### Follow-up

**Activity**:
One immutable entry on a Timeline recording something that happened.
_Avoid_: Event, log entry, history item

**Timeline**:
The chronological view of Activities for a Lead, Contact or Deal, including those of its linked Lead, Contact or Deals.
_Avoid_: Feed, history, activity log

**Task**:
A dated to-do assigned to a User about a Lead, Contact or Deal.
_Avoid_: Reminder, to-do, follow-up

### Messaging

**Channel**:
A medium Conversations happen on: WhatsApp or email.
_Avoid_: Source, platform

**Channel Connection**:
A link to one external account (a WhatsApp number, Facebook Page, TikTok advertiser, a User's Gmail mailbox) or to the Simulator.
_Avoid_: Integration, account, connector

**Conversation**:
The message thread between one Channel Connection and one external participant.
_Avoid_: Chat, thread, ticket

**Message**:
A single inbound or outbound item in a Conversation.

**Service Window**:
The 24 hours after a participant's last inbound WhatsApp Message during which free-form replies are allowed.
_Avoid_: Session, conversation window, 24h window

**Template**:
A Meta-approved WhatsApp message format, the only kind of Message allowed outside the Service Window.
_Avoid_: Canned response, macro

### Demo

**Simulator**:
The built-in source of realistic Simulated Leads and Messages that enter through the same ingestion path as real channels.
_Avoid_: Mock, faker, test data
