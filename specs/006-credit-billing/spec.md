# Feature Specification: Credit System & Billing

**Feature Branch**: `006-credit-billing`
**Created**: 2026-03-30
**Status**: Draft
**Input**: BlendedAgents PDR v2.0
**Depends on**: 001-foundation-auth

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Builder Purchases Credits and Credits Are Consumed Per Test (Priority: P1)

A builder purchases a credit plan (or a pay-as-you-go credit pack), receives credits in their account, and those credits are automatically reserved when they create a test and deducted when the test completes. This is the core financial transaction that makes the platform viable -- without credit purchase and consumption, no tests can run and no revenue is generated.

**Why this priority**: This is the fundamental revenue loop. No other billing feature matters if builders cannot buy credits and spend them on tests. Every other story in this spec depends on credits flowing correctly.

**Independent Test**: Can be fully tested by a builder signing up, purchasing a credit plan, creating a test case, and verifying that credits are reserved, deducted on completion, and the balance updates correctly. Delivers the core payment-for-service value of the platform.

**Acceptance Scenarios**:

1. **Given** a builder with no credits, **When** they purchase a credit top-up, **Then** their credit balance reflects the purchased credits and a transaction record of type "topup" is created.
2. **Given** a builder with 100 credits, **When** they create a 5-step test, **Then** 7 credits (base cost of 2 + 5 steps x 1 credit/step) are reserved against their balance and their available balance shows 93 credits.
3. **Given** a builder with 7 credits reserved for a test, **When** that test completes successfully, **Then** the reserved credits are permanently deducted, a transaction record of type "charge" is created, and the builder's balance remains at 93.
4. **Given** a builder with 7 credits reserved for a test, **When** that test is cancelled or expires, **Then** the 7 reserved credits are returned to the builder's available balance and a transaction record of type "refund" is created.
5. **Given** a builder with 3 available credits, **When** they attempt to create a 5-step test (costing 7 credits), **Then** the system rejects the test creation and informs the builder they have insufficient credits.
6. **Given** a builder, **When** they purchase a 50-credit top-up, **Then** 50 credits are added to their balance at the admin-configured per-credit rate and a topup transaction is recorded.

---

### User Story 2 - Tester Earnings Tracking and Payout Recording (Priority: P2)

When a test completes, the tester who performed it earns a payout based on their regional rate. The platform records the tester's earnings, calculates the platform commission, and tracks cumulative earnings toward weekly payouts. This ensures testers are fairly compensated and the platform's revenue margin is captured.

**Why this priority**: Tester compensation is essential to attracting and retaining the human tester pool. Without reliable earnings tracking, testers will not participate. However, it depends on P1 (credit consumption) to function.

**Independent Test**: Can be tested by completing a test as a tester, verifying the earnings amount matches the regional rate, confirming a payout transaction is recorded, and checking that the platform commission is correctly calculated and retained.

**Acceptance Scenarios**:

1. **Given** a tester in the Egypt pool completes a 5-step test, **When** the test result is accepted, **Then** the tester earns between $1.00-$2.00 base + $0.75 step bonus (5 x $0.15) and a transaction of type "payout" is recorded against their profile.
2. **Given** a tester in the Southeast Asia pool completes a 10-step test, **When** the test result is accepted, **Then** the tester earns between $2.00-$4.00 base + $2.50 step bonus (10 x $0.25) and a payout transaction is recorded.
3. **Given** a completed test where the builder was charged 7 credits (at the admin-configured per-credit rate) and the tester earned $1.50, **When** the platform records the transaction, **Then** a commission transaction is created capturing the difference between the builder's currency charge and the tester's payout.
4. **Given** a tester with accumulated earnings over the past week, **When** the weekly payout cycle runs, **Then** the tester's total unpaid earnings are marked as "payout pending" and a record is created for manual transfer processing.
5. **Given** a test that was cancelled before completion, **When** the system processes the cancellation, **Then** no payout transaction is created for the tester.

---

### User Story 3 - Builder Views Credit Balance and Transaction History (Priority: P3)

A builder views their current credit balance and reviews their transaction history (charges, top-ups, refunds). This gives builders financial visibility and control over their spending on the platform.

**Why this priority**: Financial transparency builds trust with paying customers. However, builders can use the platform (P1) and testers can earn (P2) before detailed self-service billing management is available. This is important but not blocking.

**Independent Test**: Can be tested by a builder querying their credit balance and viewing a filtered list of past transactions -- verifying that balance and transaction records display correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated builder, **When** they request their credit balance, **Then** they receive their current available credits, reserved credits, and total credits used.
2. **Given** a builder with 15 past transactions, **When** they request their transaction history, **Then** they receive a paginated list of transactions showing type, amount in credits, amount in currency, description, and timestamp.
3. **Given** a builder, **When** they request their balance via the credits endpoint, **Then** the response includes the per-credit rate, credits remaining, and credits consumed this period.
4. **Given** a builder with transactions of mixed types, **When** they filter their transaction history by type "charge", **Then** only charge transactions are returned.

---

### Edge Cases

- What happens when a builder's top-up payment fails? Credits MUST NOT be granted until Stripe webhook confirms payment success; the builder's existing unused credits remain available but no new credits are added.
- What happens when a test completes but the builder's account was closed mid-test? The reserved credits are still consumed, the tester is still paid, and the commission is still recorded -- financial obligations from reserved credits are honored.
- What happens when a tester's regional rate changes between test assignment and test completion? The rate at the time of test assignment is the rate that applies for payout.
- What happens when a test partially completes (some steps done, tester abandons)? No credits are consumed, no payout is issued -- only fully completed tests trigger financial transactions in MVP.
- What happens when the credit formula yields a fractional result? Credit costs are always whole numbers; the formula (base_cost + steps_count x cost_per_step) uses integer inputs and produces integer outputs.
- What happens when a builder attempts to top up credits while a payment is already processing? The system MUST prevent duplicate charges by rejecting concurrent top-up requests for the same builder.
- What happens when a Stripe webhook cannot be matched to a known builder? The event is logged for audit purposes and silently discarded -- no credits are granted. Platform admins can investigate unmatched events via logs.

## Clarifications

### Session 2026-03-30

- Q: What determines where within the tester base pay range a specific test's payout falls? → A: Platform administrators set the exact base pay and per-step rate for each region; the range values are boundary constraints, not a formula.
- Q: How does the system confirm that a credit purchase payment succeeded? → A: Stripe Checkout + Stripe webhooks; no custom payment API needed.
- Q: How are credits converted to currency for commission calculation? → A: Currency amount = credits × admin-configured per-credit rate. MVP has a single uniform rate (no plans/tiers).
- Q: What credit top-up denominations can builders purchase in MVP? → A: Fixed packs (e.g., 10, 50, 100 credits); arbitrary amounts are post-MVP.
- Q: What happens when a Stripe webhook cannot be matched to a known builder? → A: Log for audit and silently discard; no credits granted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST calculate credit cost per test as: `base_cost(2) + steps_count x cost_per_step(1)`, where all values are whole numbers.
- **FR-002**: The system MUST support credit top-ups in fixed packs (e.g., 10, 50, 100 credits) at a per-credit rate configured by platform administrators. Arbitrary credit amounts and multiple pricing tiers are post-MVP.
- **FR-003**: The system MUST reserve credits against a builder's balance at the time of test creation, preventing the builder from spending those credits elsewhere.
- **FR-004**: The system MUST permanently deduct reserved credits upon successful test completion and refund reserved credits upon test cancellation or expiry.
- **FR-005**: The system MUST reject test creation when the builder's available (unreserved) credit balance is less than the calculated test cost.
- **FR-006**: The system MUST record every financial event as a transaction with the following attributes: type, builder reference, tester reference, test case reference, credit amount, currency amount, commission percentage, commission amount, and description.
- **FR-007**: The system MUST support the following transaction types: topup, charge, payout, commission, and refund.
- **FR-008**: The system MUST calculate tester payouts based on regional rates configured by platform administrators. Admins set the exact base pay and per-step rate for each region within allowed boundaries: Egypt ($1.00-$2.00 base + $0.15/step), MENA ($1.50-$3.00 base + $0.20/step), Southeast Asia ($2.00-$4.00 base + $0.25/step). The payout formula is: `admin_configured_base + steps_count x admin_configured_step_rate`.
- **FR-009**: The system MUST lock in the tester's regional payout rate at the time of test assignment, not at the time of completion.
- **FR-010**: The system MUST calculate and record platform commission as the difference between the builder's credit charge converted to currency (`credits × admin-configured per-credit rate`) and the tester's payout amount.
- **FR-011**: The system MUST expose a builder-facing endpoint to retrieve current credit balance and usage summary.
- **FR-012**: The system MUST expose a builder-facing endpoint to list transactions with support for filtering by type and pagination.
- **FR-013**: The system MUST initiate credit purchases via Stripe Checkout and confirm payment success via Stripe webhooks. Credits are granted only after webhook confirmation of successful payment.
- **FR-014**: The system MUST process tester payouts on a weekly cycle, aggregating all completed-but-unpaid earnings into a single payout record per tester.
- **FR-015**: The system MUST prevent duplicate charges from concurrent top-up requests for the same builder.
- **FR-016**: The system MUST ensure that all credit operations (reserve, deduct, refund) are atomic -- partial credit operations MUST NOT occur.
- **FR-017**: The system MUST require authentication (from 001-foundation-auth) for all billing endpoints and restrict builders to viewing only their own financial data.

### Key Entities

- **Credit Balance**: Represents a builder's current financial capacity on the platform. Key attributes: available credits, reserved credits. Belongs to one builder.
- **Transaction**: An immutable ledger entry recording any financial event on the platform. Key attributes: type (topup/charge/payout/commission/refund), credit amount, currency amount, commission percentage, commission amount, description, timestamp. References a builder, and optionally a tester and test case.
- **Credit Rate Configuration**: Defines the per-credit rate for converting credits to currency, configured by platform administrators. Key attributes: per-credit rate (USD), effective date. Applied to all builders uniformly in MVP.
- **Tester Payout Record**: Tracks a tester's accumulated earnings and weekly payout status. Key attributes: tester reference, region, earnings total, payout status (unpaid/pending/completed), payout period. Aggregates from individual payout transactions.
- **Regional Rate Configuration**: Defines per-region tester compensation rules, configured by platform administrators. Key attributes: region identifier, admin-set base pay amount (within allowed min/max boundaries), admin-set per-step rate, allowed base pay range (min/max). Referenced at test assignment time to lock in the tester's rate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of test creations with sufficient credits result in correct credit reservation, and 100% of test completions result in correct credit deduction -- zero credit accounting discrepancies in the transaction ledger.
- **SC-002**: Builders can complete a credit purchase (from initiating top-up to credits appearing in balance) in under 60 seconds, excluding external payment provider processing time.
- **SC-003**: Credit balance and transaction history queries return results in under 500 milliseconds for builders with up to 10,000 transactions.
- **SC-004**: 100% of completed tests produce exactly three transaction records: one charge (builder), one payout (tester), and one commission (platform) -- no orphaned or missing financial records.
- **SC-005**: Tester payouts are aggregated and marked ready for processing within 24 hours of the weekly payout cycle trigger.
- **SC-006**: Zero instances of negative credit balances -- the reservation system prevents overspending under all concurrent usage conditions.
- **SC-007**: Platform commission percentage averages above 50%, validating the revenue model sustainability.
- **SC-008**: Builders can view their balance and transaction history without contacting support -- reducing billing-related support requests to fewer than 5% of active builders per month.

## Assumptions

- Builders have already authenticated via the system defined in 001-foundation-auth before accessing any billing functionality.
- External payment processing is handled by Stripe (Checkout for purchases, webhooks for payment confirmation). This spec covers the credit ledger and internal accounting; Stripe handles the payment UI and card processing.
- Tester payouts in MVP are processed via manual bank transfers; automated payroll via payment platforms is a post-MVP enhancement.
- Currency amounts are denominated in USD for MVP; multi-currency support is out of scope.
- Regional tester rates (both base pay and per-step rate) are configured by platform administrators who set exact values within allowed boundaries. Rates may be adjusted over time, but rate changes do not retroactively affect in-progress or completed tests.
- The per-credit rate is configured by platform administrators; multiple plans and tiered pricing are post-MVP.
- The transaction ledger is append-only; corrections are made by issuing new compensating transactions (e.g., refunds), not by modifying existing records.
- Credits do not expire in MVP; expiry policies are post-MVP.
