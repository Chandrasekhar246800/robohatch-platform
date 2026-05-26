# RoboHatch Founder Execution Cockpit

## Executive Summary

RoboHatch should not ship a generic ecommerce admin panel. It should ship a founder execution cockpit: a high-signal operating system that tells the founder what needs attention today, what affects revenue, what is delayed, what is growing, and what needs a decision.

The core design principle is simple: every screen should reduce cognitive load and shorten the path from signal to action.

## Design Principles

- Prioritize exceptions over lists.
- Show urgency before volume.
- Optimize for decisions, not browsing.
- Keep customer, order, product, and revenue context on the same screen when possible.
- Make every queue actionable in under three clicks.
- Favor progressive disclosure over dense admin tables.
- Separate monitoring from action.

## Part 1: Complete Admin Information Architecture

### Sidebar Structure

1. Overview
   - Founder cockpit
   - Today queue
   - Alerts center
   - Performance snapshot

2. Operations
   - Orders
   - Upload approvals
   - Refunds
   - Inventory
   - Support
   - Reviews

3. Commerce
   - Products
   - Categories
   - Pricing
   - Promotions
   - Bundles

4. Customers
   - Customer directory
   - Customer profiles
   - Repeat customers
   - WhatsApp leads
   - Creator collaborators

5. Analytics
   - Revenue
   - Funnel
   - Conversion
   - Traffic sources
   - Product performance
   - Cohorts

6. Marketing
   - Campaigns
   - Coupons
   - Featured products
   - Landing page performance
   - Social lead tracking

7. Trust & Reputation
   - Reviews
   - Testimonials
   - Issue recovery
   - Response logs

8. Settings
   - General settings
   - Shipping rules
   - Payment settings
   - Notification rules
   - Roles and permissions
   - Integrations

### Module Hierarchy

- Overview is the decision layer.
- Operations is the execution layer.
- Commerce is the catalog layer.
- Customers is the relationship layer.
- Analytics is the intelligence layer.
- Marketing is the growth layer.
- Trust & Reputation is the retention layer.
- Settings is the control layer.

### Page Hierarchy

#### Overview
- Founder Cockpit
- Attention Queue
- Today’s Work
- Revenue Pulse
- Growth Pulse
- Risk Pulse

#### Orders
- Orders list
- Order detail
- Fulfillment queue
- Return and refund queue
- Failed payment queue

#### Customers
- Customer list
- Customer detail
- Repeat customer view
- Creator collaborator view
- Lead source view

#### Products
- Product list
- Product detail
- Add product
- Edit product
- Pricing view
- Bundle view

#### Uploads
- Pending upload approvals
- In review
- Needs clarification
- Approved
- Rejected

#### Analytics
- Executive dashboard
- Revenue trends
- Funnel trends
- Channel trends
- SKU trends
- Cohort trends

#### Support
- Open tickets
- WhatsApp requests
- Refund issues
- Shipping issues
- Product issues

#### Inventory
- Stock overview
- Low-stock items
- Reorder planning
- Variant-level stock
- Exception log

#### Marketing
- Campaign list
- Coupon performance
- Featured product slots
- Lead capture review

#### Reviews
- Review queue
- Review moderation
- Testimonials
- Recovery responses

#### Settings
- Business settings
- Shipping settings
- Tax and payment settings
- Admin users
- Integrations
- Notification preferences

### Navigation Grouping

- Group by operational intent, not by backend entity.
- Put the founder’s daily actions first.
- Place reporting after action-oriented modules.
- Keep settings last and clearly separated.

### Operational Flow

1. Founder opens the cockpit.
2. Cockpit highlights urgent work.
3. Founder resolves the highest-value queue items first.
4. Detailed views preserve context and let the founder take action immediately.
5. Analytics explains what changed and what to do next.
6. Support, inventory, and upload queues feed back into the same decision surface.

## Part 2: Founder Execution Dashboard

### Primary Dashboard Goal

The dashboard should answer one question in under five seconds: what should the founder act on right now?

### Widget Hierarchy

#### Tier 1: Critical Actions
- Urgent actions queue
- Failed payments
- Pending orders
- Support alerts
- Low-stock alerts
- Creator upload approvals

#### Tier 2: Revenue Signals
- Revenue today
- Revenue week to date
- Conversion rate
- Checkout completion rate
- Average order value
- Top revenue products

#### Tier 3: Growth Signals
- Traffic sources
- Add-to-cart rate
- Abandoned carts
- Repeat customer rate
- Top customers
- Lead capture volume

#### Tier 4: Operational Health
- Fulfillment SLA
- Refund count
- Review volume
- Inventory risk
- Pending creator requests

### Alert Prioritization

The dashboard should sort alerts by business impact:

1. Payments and revenue blockers
2. Orders that are overdue or at risk
3. Customer complaints that may cause refunds or churn
4. Low stock on top sellers
5. Creator uploads awaiting review
6. Marketing anomalies or traffic drops

### Queue Structure

Each queue should include:
- Priority badge
- Age of item
- Revenue impact estimate
- Customer or product context
- One-tap action buttons

Suggested queue blocks:
- Action required now
- Needs review today
- Waiting on customer
- Waiting on supplier or inventory
- Ready to close

### Dashboard Layout

Top band:
- Founder status headline
- One-line summary of today’s platform health
- Three to five critical actions

Middle band:
- Revenue chart
- Conversion chart
- Funnel chart
- Revenue by channel

Lower band:
- Orders queue
- Support queue
- Upload approvals
- Low stock queue
- Top products and top customers

Side band on desktop:
- Alerts stream
- Quick actions
- Notes or reminders

## Part 3: Operations Workflow System

### Order Fulfillment Workflow

1. Order enters pending queue.
2. System checks payment state, stock, shipping state, and customer history.
3. Order is auto-grouped into one of four states: ready, blocked, attention, or delayed.
4. Founder or operator can open the order drawer and complete fulfillment in one place.
5. Shipping label, tracking, and status updates live in the same view.

Key controls:
- Change status
- Add internal note
- Print packing list
- Mark packed
- Mark shipped
- Issue refund or partial refund

### Upload Approval Workflow

1. Upload arrives with creator context.
2. System classifies complexity, urgency, and file type.
3. Founder sees preview, risk flags, and suggested next action.
4. Approve, request revision, quote manually, or reject.
5. Approved uploads can convert directly into order or quote workflows.

Key controls:
- Preview files
- See model metadata
- Add approval note
- Request missing details
- Convert to quote

### Customer Support Workflow

1. Support request enters from WhatsApp, email, form, or order page.
2. System attaches customer, order, and payment context.
3. Tickets are triaged by urgency and category.
4. Founder resolves, delegates, or escalates.
5. Support outcome is logged to customer profile and analytics.

Key controls:
- Reply template
- Refund shortcut
- Shipping status lookup
- Order link
- Internal note

### Refund Workflow

1. Refund request lands in a queue.
2. System shows order value, margin risk, payment status, and reason.
3. Founder chooses full refund, partial refund, replacement, or deny.
4. Resolution is logged with reason codes.

### Inventory Workflow

1. Low stock triggers alert.
2. Cockpit highlights risk by sales velocity and revenue contribution.
3. Founder decides reorder, pause sales, or bundle substitution.
4. Inventory changes propagate to storefront and admin analytics.

### Creator Request Workflow

1. Creator submits design or collaboration request.
2. System tags request type, file status, and quotation state.
3. Founder reviews feasibility and decides accept, quote, revise, or reject.
4. Accepted requests become tracked jobs with milestones.

### Review Collection Workflow

1. Delivered order enters review-eligible state.
2. System triggers review request after delay.
3. Reviews are moderated and linked to products and customers.
4. Positive reviews become reusable trust assets.

## Part 4: CRM & Customer Intelligence

### Customer Profile Design

Each customer profile should contain:
- Identity and contact details
- Order history
- Lifetime value
- Repeat order count
- WhatsApp leads
- Notes and tags
- Support history
- Creator-collab history
- Last activity
- Risk flags

### Customer Intelligence Blocks

- Customer health score
- Repeat purchase likelihood
- Average order value
- Response history
- Pending issues
- Product affinity
- Channel source

### WhatsApp Lead Tracking

The admin should record:
- First contact date
- Lead source
- Conversation status
- Interested product or upload
- Quote status
- Follow-up reminder
- Outcome

### Customer Notes System

- Notes should be internal only.
- Notes should support tags such as VIP, creator, repeat buyer, issue-risk, and high-value.
- Notes should be time-stamped and attribution-aware.

### Creator-Collab Tracking

- Track creator name, brand, social handle, requested product, quote stage, and delivery stage.
- Show whether the creator is in prospect, active, paused, or repeat state.

### Repeat-Customer Insights

- Show repeat customers by value, frequency, category affinity, and support load.
- Surface customers who are worth proactive outreach.

## Part 5: Analytics & KPI System

### Ecommerce Analytics Dashboard

The analytics area should provide:
- Revenue trends
- Order trends
- Conversion trends
- Channel trends
- SKU trends
- Cohort trends
- Refund trends
- Support trends

### KPI Blocks

- Revenue today / week / month
- Conversion rate
- Add-to-cart rate
- Checkout completion rate
- Payment success rate
- Refund rate
- Repeat purchase rate
- Low-stock count
- Support response time
- Delivery SLA

### Channel Tracking

Track:
- Instagram
- WhatsApp
- Organic search
- Direct
- Ads
- Referral
- Creator outreach

### Healthy Thresholds

Suggested operating thresholds:
- Payment success rate: healthy above 95 percent
- Checkout completion rate: healthy above 60 percent
- Add-to-cart rate: healthy above 8 percent
- Repeat customer rate: healthy above 20 percent for a growing D2C brand
- Refund rate: warning above 5 percent
- Low-stock count on top sellers: warning at any stockout risk
- Support response time: warning after 2 business hours

### Warning Indicators

- Revenue down week over week
- Conversion down while traffic is flat or rising
- Abandoned carts up sharply
- Stockout on top revenue SKU
- Payment failures clustered in a channel or device type
- Support backlog older than SLA

### Decision Triggers

- If revenue is down and conversion is flat, inspect traffic quality.
- If traffic is up and conversion is down, inspect product page or checkout friction.
- If abandoned carts are up, inspect shipping cost, trust copy, and payment performance.
- If stockout risk is high on top sellers, pause promotion and replenish.
- If payment failures rise, inspect gateway issues immediately.

## Part 6: Mobile Admin UX

### Mobile Founder Goals

Mobile admin should support:
- urgent approvals
- order status updates
- support replies
- alert triage
- revenue check-ins

### Mobile Interaction Model

- One-thumb quick actions.
- Sticky alert bar at top.
- Card-based queues rather than tables.
- Expandable detail sheets.
- Short internal notes input.
- Fast filter chips.

### Mobile Quick Actions

- Approve upload
- Mark order shipped
- Issue refund
- Reply to support
- Mark low-stock reviewed
- Call or WhatsApp customer

### Mobile Layout Pattern

1. Alert strip.
2. Today queue.
3. Revenue snapshot.
4. Fast action buttons.
5. Compact list of critical items.

### Mobile UX Rules

- Avoid giant tables.
- Keep tap targets large.
- Never bury urgent alerts below analytics.
- Use bottom sheets for details.
- Keep summaries visible above the fold.

## Part 7: Technical Frontend Architecture

### Next.js Admin Structure

Recommended structure:

- app/admin/layout.tsx
- app/admin/page.tsx
- app/admin/orders/page.tsx
- app/admin/orders/[id]/page.tsx
- app/admin/customers/page.tsx
- app/admin/customers/[id]/page.tsx
- app/admin/products/page.tsx
- app/admin/products/add/page.tsx
- app/admin/products/[id]/page.tsx
- app/admin/uploads/page.tsx
- app/admin/support/page.tsx
- app/admin/inventory/page.tsx
- app/admin/analytics/page.tsx
- app/admin/marketing/page.tsx
- app/admin/reviews/page.tsx
- app/admin/settings/page.tsx

### Layout Structure

- App shell with sidebar and top bar.
- Persistent alert strip.
- Content area with route-level loading states.
- Optional right-side context panel for details or quick actions.

### Reusable Admin Components

- AdminShell
- AdminSidebar
- AdminTopbar
- AlertQueue
- ActionQueue
- MetricCard
- TrendSparkline
- CustomerSummaryCard
- OrderDrawer
- ProductDrawer
- UploadReviewPanel
- SupportThreadPanel
- InventoryRiskCard
- QuickActionBar

### Sidebar Architecture

- Sidebar should support icons, labels, counts, and urgency markers.
- Sidebar should collapse to icon-only on smaller widths.
- Sidebar should highlight the current operational area clearly.

### State Management Strategy

- Use global state only for cross-cutting UI state such as sidebar collapse, filters, and current workspace context.
- Keep business entities server-sourced.
- Keep admin-local drafts in route-local state.
- Avoid duplicating source-of-truth data in client state.

Recommended split:
- Zustand for shell and UI state
- TanStack Query or equivalent for server state
- Route-local React state for forms and drawers

### Query / Data Layer Strategy

- Use one admin API layer with consistent typed methods.
- Prefer server-driven pagination and filtering.
- Standardize cache invalidation for orders, products, uploads, support, and inventory.
- Use optimistic updates only for low-risk actions such as status changes.
- Normalize error handling and retry behavior.

### Scalable Frontend Organization

- Separate feature folders by domain.
- Keep UI primitives in a shared layer.
- Keep admin page files thin.
- Put business logic in feature hooks and service modules.
- Keep dashboard widgets composable so they can be reused across screens.

## Part 8: Redesign Priority Roadmap

### What to Redesign First

1. Admin shell and navigation.
2. Founder cockpit dashboard.
3. Orders and support workflow.
4. Customer profile system.
5. Inventory and low-stock alerts.
6. Upload approvals.
7. Analytics and KPI layer.

### What to Preserve

- Auth and role gating.
- Existing product and category CRUD capability.
- Existing order management backend flows.
- Existing payment and checkout foundations.
- Existing brand styling language where it already works.

### Migration Strategy

Phase 1:
- Add admin shell and route structure.
- Keep current pages functional.
- Introduce dashboard queues and alert cards.

Phase 2:
- Add order detail, customer detail, and upload detail views.
- Build support queue and refund queue.

Phase 3:
- Add inventory analytics and low-stock automation.
- Add real funnel metrics and source tracking.

Phase 4:
- Add marketing, reviews, and creator-collab modules.
- Add permissions and activity logging.

### Low-Risk Rollout Strategy

- Keep legacy admin pages active until new routes are validated.
- Replace one workflow at a time.
- Migrate dashboard first because it affects daily founder behavior most.
- Use feature flags for any high-risk operational logic.
- Validate every new operational queue before deprecating the old one.

## Part 9: Final Founder Cockpit Vision

### Operational Feel

The cockpit should feel like a high-trust command center. The founder opens it and immediately sees what is delayed, what is valuable, what is risky, and what should happen next.

### Visual Feel

- Dense enough to be useful, but not cluttered.
- Calm visual hierarchy with clear urgency states.
- Strong contrast between normal work and critical work.
- Premium and technical, not flashy.
- Designed like a control room, not a storefront backend.

### Psychological Feel

- Reduces anxiety by making priorities obvious.
- Creates confidence through visibility.
- Converts ambiguity into queues and decisions.
- Rewards focus by hiding low-value noise.

### Strategic Feel

- The admin becomes the company’s operating brain.
- The founder stops hunting for information.
- The system surfaces the next best action.
- The panel scales from early-stage operator to team-based operations without collapsing into chaos.

## Closing Verdict

RoboHatch should evolve from a CRUD admin into an execution cockpit that manages attention, not just data. The winning design is not the one with the most screens. It is the one that lets the founder act fastest on the few things that matter most.