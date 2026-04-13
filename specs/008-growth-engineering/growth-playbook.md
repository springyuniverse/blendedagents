# BlendedAgents Growth Engineering Playbook

> Produced 2026-04-13. All designs build on existing primitives: credit billing, BA-XXXXXXXX invite codes, admin-controlled invite limits, tweet-for-credits rewards, and the API/MCP integration surface.

---

## 1. Primary Viral Loop: The Agent Attribution Loop

This is the core growth engine. It exploits the fact that BlendedAgents is consumed *by AI agents*, not directly by humans. Every test result that flows back through an agent becomes a distribution channel.

```
Builder integrates API/MCP
        |
        v
Agent sends test to BlendedAgents
        |
        v
Human tester completes test
        |
        v
Agent receives results + "Powered by BlendedAgents" attribution
        |
        v
Agent presents results to developer with badge/link
        |
        v
Developer sees value ("a human found 3 bugs I missed")
        |
        v
Developer shares result screenshot on Twitter/Slack/Discord
        |                                      |
        v                                      v
New developers discover BlendedAgents    New agent builders discover API
        |
        v
They sign up, get 25 free credits (tweet reward), run first test
        |
        v
Loop restarts
```

**Why this works:** The "aha moment" -- a real human finding a real bug in YOUR app -- is inherently shareable. Nobody tweets about their CI passing. Everyone tweets about a human catching a bug their AI missed.

**Key metric:** Attribution impressions per test completed. Target: every completed test generates at least 1 impression outside the platform.

**Implementation hooks (existing system):**
- `callback_url` on test cases already delivers results to external systems
- Webhook payloads can include a `powered_by` field with attribution link
- Test result responses already include `verdict`, `summary`, `screenshot_url` -- all screenshot-worthy

---

## 2. Secondary Viral Loops

### 2A. The Tester Supply Loop (Existing -- needs amplification)

```
Active tester earns money
    |
    v
Admin grants invite slots (max_invites)
    |
    v
Tester shares BA-XXXXXXXX code with peers
    |
    v
New tester signs up, completes assessment
    |
    v
New tester takes tasks, earns money
    |
    v
New tester gets invite slots for quality work
    |
    v
Loop restarts
```

**Amplification:** Currently invite slots are admin-granted (max_invites default 0). Make slot grants *automatic* based on tester performance:
- Complete 5 tasks with avg rating >= 4: earn 2 invite slots
- Complete 10 tasks: earn 3 more slots
- Each successful invitee who completes 3+ tasks: earn 1 bonus slot

### 2B. The CI/CD Integration Loop

```
Developer adds BlendedAgents to CI pipeline
    |
    v
Every PR gets human-tested automatically
    |
    v
Test results appear as PR comments/checks
    |
    v
Other team members see results in PRs
    |
    v
"What is this BlendedAgents thing?" --> they check it out
    |
    v
They add it to their own projects
```

**Implementation:** The existing webhook + external_id system supports this. Add a GitHub App or Action that:
- Posts test results as PR check runs
- Includes "Tested by a human via BlendedAgents" in the check summary
- Links to the public results page

### 2C. The MCP Plugin Discovery Loop

```
Developer uses Claude/Cursor/Windsurf with MCP
    |
    v
They discover BlendedAgents in MCP plugin registry
    |
    v
Agent automatically offers human testing when user says "test this"
    |
    v
"Whoa, it just sent my app to a real human"
    |
    v
Developer tweets about it (novel experience)
    |
    v
Other developers install the MCP plugin
```

**Implementation:** The existing AGENTS.md/skill.md files are the foundation. The MCP plugin should be listed in:
- Anthropic's MCP plugin directory
- Claude Code's recommended integrations
- VS Code marketplace (as extension companion)

### 2D. The "Bug Trophy" Social Loop

```
Tester finds critical bug
    |
    v
Platform generates a shareable "Bug Report Card"
    |
    v
Builder shares it: "My AI agent shipped code with this bug. A human caught it in 12 minutes."
    |
    v
Gets engagement on Twitter (devs love war stories)
    |
    v
Viewers click through to BlendedAgents
```

---

## 3. Referral Program Design

### 3.1 Incentive Structure

**Builder-side (credit referrals):**

| Action | Referrer gets | Referred gets |
|--------|--------------|---------------|
| New builder signs up via referral link | -- | 25 free credits |
| Referred builder completes first paid top-up ($10+) | 50 bonus credits | 10 bonus credits |
| Referred builder reaches $100 cumulative spend | 100 bonus credits | -- |

**Tester-side (invite code referrals -- existing system):**

| Action | Inviter gets | Invitee gets |
|--------|-------------|-------------|
| Invitee signs up with BA-XXXXXXXX code | -- | Platform access |
| Invitee completes onboarding assessment | +1 invite slot | -- |
| Invitee completes 5 tasks | $5 bonus earning | -- |
| Invitee reaches $50 lifetime earnings | $10 bonus earning | -- |

**Why asymmetric:** Builders need credits (their currency), testers need money (their currency). Match the reward to what each side values.

### 3.2 Referral Flow (Builder-side, new)

1. Builder visits dashboard > Settings > Referrals
2. System generates a unique referral link: `blendedagents.com/r/{builder_short_id}`
3. Builder shares link (copy button, or direct Twitter/LinkedIn share buttons)
4. New user clicks link, lands on signup page with referral tracked in cookie + URL param
5. New user signs up as builder
6. System records referral in `builder_referrals` table
7. Referred builder gets 25 free credits immediately
8. When referred builder makes first $10+ purchase, referrer gets 50 credits (async job checks this)
9. When referred builder reaches $100 cumulative spend, referrer gets 100 credits (async job)

### 3.3 Referral Flow (Tester-side, existing -- enhanced)

1. Tester visits dashboard > Invites (already exists at `/tester/invites`)
2. Generates BA-XXXXXXXX code (existing)
3. Copies invite link: `blendedagents.com/signup/tester?invite=BA-XXXXXXXX` (existing)
4. Shares via messaging, social media, or QA community forums
5. New tester signs up with code (existing)
6. **NEW:** When invitee passes assessment, inviter gets +1 invite slot automatically
7. **NEW:** When invitee completes 5 tasks, inviter gets $5 bonus credited to their earnings
8. **NEW:** Inviter sees a "Referral Tree" on their invites page showing all downstream invitees and their status

### 3.4 Anti-Gaming Measures

**Builder referrals:**
- One referral reward per referred builder (unique index, like tweet_rewards)
- Referred builder must complete a real purchase (not just free credits) to trigger tier-2 reward
- Rate limit: max 50 referral credits per 24-hour period per referrer
- Automated detection: if >5 referred accounts share IP/payment method, flag for manual review
- Credits from referrals marked with `source = 'referral'` in transactions for audit

**Tester referrals (existing + new):**
- Single-use invite codes (already enforced: `used_by_id IS NULL` check in redeem)
- Admin-controlled max_invites cap (already exists)
- Assessment gate: invitee must pass sandbox assessment before counting as successful referral
- Quality gate: invitee must complete tasks with acceptable quality (no auto-reward for churned/banned testers)
- Bonus earnings for referrals go through the same 3-day clearance period as regular payouts
- If invitee is deactivated for quality issues, referral bonuses are clawed back

**Cross-side:**
- No self-referral: email uniqueness check across builders and testers tables
- Referral links expire after 90 days
- Admin dashboard shows referral chains for audit

### 3.5 Expected Viral Coefficient

Conservative estimate for launch:
- **Builder K-factor:** 0.15-0.25 (each builder refers 0.15-0.25 new builders)
- **Tester K-factor:** 0.3-0.5 (testers are more motivated -- they earn money)
- **Blended K-factor:** 0.2-0.35

This is below 1.0 (not self-sustaining viral growth), which is realistic for a B2B dev tool. The goal is to supplement paid acquisition, not replace it.

---

## 4. "Powered by BlendedAgents" Badge

### 4.1 Placement Locations

**In API/webhook responses (automatic, high-reach):**
```json
{
  "id": "BA-7K3X",
  "verdict": "fail",
  "summary": "Step 2 failed -- login button unresponsive",
  "powered_by": {
    "text": "Tested by a human via BlendedAgents",
    "url": "https://blendedagents.com?ref=api",
    "badge_svg": "https://blendedagents.com/badge.svg"
  }
}
```

**In GitHub PR comments (via future GitHub App):**
```markdown
## Human QA Report -- BlendedAgents

| Step | Result | Details |
|------|--------|---------|
| Login flow | PASS | Worked as expected |
| Checkout | FAIL | Submit button unresponsive on mobile |

> Tested by a real human in 14 minutes via [BlendedAgents](https://blendedagents.com?ref=github)
```

**In CI/CD logs:**
```
[BlendedAgents] Test BA-7K3X completed: FAIL (2 critical issues)
[BlendedAgents] Full report: https://blendedagents.com/results/BA-7K3X
[BlendedAgents] Get human QA for your builds: https://blendedagents.com
```

**In shareable result pages (new feature):**
- Each completed test gets a public-but-unguessable URL: `blendedagents.com/r/BA-7K3X-{token}`
- Page shows: verdict, step results with screenshots, timing, "Tested by BlendedAgents" branding
- Open Graph meta tags for rich previews when shared on Twitter/Slack/Discord
- Builder controls visibility (public/private toggle, default: private)

**Badge for builder READMEs:**
```markdown
[![Tested by Humans](https://blendedagents.com/badge/tested-by-humans.svg)](https://blendedagents.com)
```

Renders as a small shield badge (like CI badges): `[Tested by Humans | BlendedAgents]`

### 4.2 Design Principles

- Subtle, not obnoxious. Think GitHub Actions badge, not an ad banner.
- Always include a link back to blendedagents.com with a ref parameter
- Never block or gate functionality behind the badge (it is informational, not a paywall)
- Allow builders on "team" plan to white-label (remove badge) -- this becomes a paid upsell

---

## 5. Network Effects

### 5.1 Existing Network Effects

**Cross-side (two-sided marketplace):**
- More builders = more test cases = more work for testers = more testers join
- More testers = faster matching = better SLA = more builders trust the platform
- This is the fundamental network effect and it is already built into the architecture

**Data network effect:**
- More tests completed = better understanding of common bug patterns
- Future: ML-powered test suggestions based on aggregate data ("apps like yours typically fail on...")

### 5.2 Strengthening Network Effects

**Tester specialization creates switching costs:**
- Testers build up skills profiles, completion stats, and reputation on the platform
- Builders can request testers with specific skills (`required_skills` field already exists)
- Over time, the best testers are "known" to the platform, creating a talent moat

**Builder lock-in through integration depth:**
- API key + webhook config = switching cost
- CI/CD integration = higher switching cost
- MCP plugin in agent workflow = highest switching cost (the agent "knows" BlendedAgents)

**Regional coverage network effect:**
- Testers have `region` and `timezone` fields
- More testers in diverse regions = 24/7 coverage = faster turnaround = more valuable to builders
- Builders with global user bases specifically need multi-region testers

**Action items to strengthen:**
1. Add a public "Platform Status" page showing: testers online now, avg response time, regions covered. This signals network health and creates FOMO.
2. Add tester leaderboards (top earners, fastest completions) -- creates aspiration for new testers.
3. Add "Tester Match Score" to test creation response -- show builders that the platform found the right specialist, not just a random person.

---

## 6. Invite-Only Mechanics

### 6.1 Current State

The platform already has invite-only for testers:
- `require_invite_code` in platform_settings (default true)
- BA-XXXXXXXX codes gated by admin-controlled `max_invites`
- This is the right foundation

### 6.2 Scarcity Playbook (Clubhouse/Linear model)

**Phase 1: Closed alpha (current)**
- All tester signups require invite code
- Builders sign up freely but start with 0 credits
- Admin manually controls invite supply

**Phase 2: Controlled expansion**
- Top-performing testers auto-earn invite slots (see section 3.3)
- Introduce a public waitlist for testers (see section 7)
- Display "Join the waitlist -- 847 testers ahead of you" on the tester signup page
- When a tester uses their invite code, show: "You were invited by [name]. You're tester #342."

**Phase 3: FOMO mechanics**
- "X testers earned $Y this week" banner on the waitlist page (real data, updated daily)
- Weekly digest email to waitlisted testers: "12 people who signed up after you were invited. Complete your profile to move up."
- Time-limited "express lanes": testers with specific skills (e.g., mobile testing) get fast-tracked

**Phase 4: Gradual opening**
- When tester supply exceeds demand by 20%, start admitting waitlist testers in batches
- Each batch gets a "Generation" label (like Clubhouse): "You're a Gen-3 tester"
- Keep invite codes active even after waitlist opens -- they bypass the queue, which is still valuable

**Builder-side scarcity (lighter touch):**
- Builders can sign up freely, but API key generation requires email verification
- "Pro" plan features (priority matching, dedicated testers) create aspiration
- Early adopter badge: "Founding Builder" for first 100 builders -- permanent, visible in their profile

### 6.3 Implementation: New DB tables/columns needed

```sql
-- Waitlist for testers
CREATE TABLE tester_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  region TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL,  -- queue position
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'invited', 'expired', 'signed_up')),
  referrer_email TEXT,  -- who told them about BA
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Waitlist Virality

### 7.1 Core Mechanic

When a prospective tester joins the waitlist, they get a position number. They can move up by:

1. **Sharing their referral link** -- each person who joins via their link moves them up 5 positions
2. **Completing a pre-qualification survey** -- move up 10 positions (also gives the platform useful data)
3. **Connecting social accounts** -- move up 3 positions (gives the platform a distribution channel)
4. **Having in-demand skills** -- auto-boost for underrepresented skills/regions

### 7.2 Waitlist Page Flow

```
1. User lands on blendedagents.com/testers (from a tweet, invite, or organic search)
2. "Join 400+ testers earning money by finding bugs. Invite-only."
3. User enters email + name + region + skills
4. "You're #847 on the waitlist. Here's how to move up:"
   - [Share your link] -- "Move up 5 spots for each person who joins"
   - [Complete your profile] -- "Move up 10 spots"
   - [Connect Twitter] -- "Move up 3 spots"
5. User gets a unique waitlist link: blendedagents.com/waitlist/{short_id}
6. Weekly email: "You're now #612. 23 people joined from your link."
7. When their turn comes: "You're in! Complete signup with this code: BA-XXXXXXXX"
```

### 7.3 Anti-Gaming

- Position changes are logged and auditable
- Referrals from the same IP cluster count as 1
- Bot detection on waitlist signup (basic: honeypot field + timing check)
- Maximum boost per referral source: 50 positions (prevents gaming with thousands of fake signups)
- Admin can freeze/reset waitlist positions

---

## 8. In-Product Sharing Triggers

These are moments where users naturally want to tell someone about what just happened. The platform should make sharing frictionless at these exact moments.

### 8.1 For Builders

**Trigger 1: First test result received**
- "Your first human QA test is complete! A real person tested your app in 12 minutes."
- [Share on Twitter] [Copy result link] [Download report PDF]
- Pre-filled tweet: "Just got my first @BlendedAgents test back. A real human found 2 bugs in my staging app in 12 minutes. The future of QA is here."

**Trigger 2: Critical bug found**
- "A critical bug was caught before your users could hit it."
- "Your agent built it, a human verified it. Ship with confidence."
- [Share this save] -- with screenshot of the bug

**Trigger 3: Milestone badges**
- "You've run 10 human QA tests! You're a QA believer."
- "You've caught 50 bugs before production. That's 50 user complaints you never had to deal with."
- SVG badge they can add to their README

**Trigger 4: Cost savings report (monthly)**
- "This month, BlendedAgents found 12 critical bugs that would have cost you ~$2,400 in user churn. You spent $47."
- [Share your ROI]

### 8.2 For Testers

**Trigger 5: First payout milestone**
- "You just earned your first $50 on BlendedAgents!"
- [Invite a friend] -- at this emotional high point, they are most likely to share

**Trigger 6: Bug find recognition**
- "Nice catch! You found a critical bug that the builder's AI missed. You're protecting real users."
- Gamification: "Bug Hunter" badge after finding 10 critical bugs

**Trigger 7: Invite success**
- "Someone you invited just completed their first test! You're building the tester community."
- +1 invite slot notification

### 8.3 For Agents (programmatic sharing)

**Trigger 8: Agent completes integration**
- The MCP skill's first successful test should prompt the agent to tell the developer:
  "I just sent your app to a real human tester via BlendedAgents. Results in ~30 minutes."
  This creates a "whoa" moment that developers share on social media.

---

## 9. Social Proof Automation

### 9.1 Automated Social Signals

**Public metrics page** (`blendedagents.com/stats`):
- Tests completed (all time)
- Bugs caught this week
- Average turnaround time
- Testers online now
- Regions covered
- Updates every hour via cron job

**GitHub badge service** (`blendedagents.com/badge/{builder_id}.svg`):
- Dynamic SVG badge: "Tested by Humans | 47 tests"
- Builder embeds in their repo README
- Every visitor to the repo sees the badge

**Open startup metrics:**
- Monthly revenue (optional, but builds trust in the dev community)
- Active builders / active testers ratio
- Keep it minimal. One page, updated monthly.

### 9.2 Automated Prompts

**Post-test completion email to builder:**
```
Subject: Test BA-7K3X Complete: 2 bugs caught

Your human tester found 2 issues in 14 minutes.

[View Results]  [Share on Twitter]

-- BlendedAgents: Human-as-a-Tool for AI Agents
```

The "Share on Twitter" link uses Twitter's intent URL with pre-filled text:
```
https://twitter.com/intent/tweet?text=A%20real%20human%20just%20found%202%20bugs%20in%20my%20staging%20app%20in%2014%20min.%20@BlendedAgents%20is%20the%20future%20of%20QA.&url=https://blendedagents.com
```

### 9.3 Community Integrations

**Discord bot:**
- Post weekly stats to a #blendedagents channel in developer communities
- "This week: 342 tests completed, 89 critical bugs caught, avg turnaround 22 min"

**Hacker News / Product Hunt:**
- "Show HN: BlendedAgents -- Human-as-a-Tool for AI Agents" launch post
- Use the bug-finding stats as the hook: "We caught X bugs that AI missed"

---

## 10. Growth Hacking Experiments

### Experiment 1: Double-Sided Tweet Reward

**Hypothesis:** If both the tweeter and anyone who signs up from that tweet get credits, tweet volume will increase 3x.

**Implementation:** Extend the existing `tweet_rewards` system. When a builder tweets, their tweet gets a unique tracking URL. Anyone who signs up via that URL gets 10 bonus credits, and the tweeter gets 10 more credits per signup (capped at 5 signups = 50 extra credits).

**Metric:** Tweet reward claims per week.
**Success criteria:** 3x increase in weekly tweet claims within 30 days.

### Experiment 2: "Ship It" Slack Bot

**Hypothesis:** A Slack bot that posts human QA results directly into a team's #dev channel will drive team-wide adoption from a single user's integration.

**Implementation:** Slack App that connects to a builder's webhook. When a test completes, bot posts a rich message card with verdict, screenshots, and "Run a test" button.

**Metric:** Builders per team who create their own API keys after seeing Slack notifications.
**Success criteria:** 30% of teams with 1 integrated builder have 2+ builders within 60 days.

### Experiment 3: Free Test for Open Source

**Hypothesis:** Giving open source projects 1 free test per month will generate high-visibility social proof (open source developers are vocal on Twitter).

**Implementation:** Detect GitHub repo with >100 stars in builder profile. Auto-grant 10 free credits/month.

**Metric:** Social mentions from OSS maintainers. Referral signups from OSS community.
**Success criteria:** 5 organic tweets from OSS maintainers with >1k followers within 90 days.

### Experiment 4: Tester Earnings Leaderboard (Public)

**Hypothesis:** Showing real earnings on a public page will drive tester waitlist signups.

**Implementation:** Public page at `blendedagents.com/earn` showing anonymized top earner stats: "Top tester this month: $847. Average tester earns $23/hr." No names, just numbers.

**Metric:** Tester waitlist signups per week.
**Success criteria:** 2x waitlist signup rate within 30 days of launch.

### Experiment 5: "Bug of the Week" Social Campaign

**Hypothesis:** Weekly highlighting of the most interesting bug caught will drive engagement and awareness.

**Implementation:** Automated selection of the most interesting bug report (critical severity, good screenshot, interesting app). Builder opts in to sharing. Platform posts it on Twitter with context.

**Metric:** Impressions and engagement on Bug of the Week posts. Referral traffic.
**Success criteria:** Average 500+ impressions per post, 5+ new signups per week attributed.

### Experiment 6: Waitlist Skip for Agent Builders

**Hypothesis:** Developers who integrate via MCP/API (vs. dashboard-only) are higher-value and should get priority.

**Implementation:** When a builder creates their first test via API (not dashboard), their referred testers skip the waitlist. This incentivizes the highest-value integration path.

**Metric:** API-first vs. dashboard-first builder activation rate.
**Success criteria:** API-first builders have 2x retention at 30 days vs. dashboard-first.

### Experiment 7: "Test My Competitor" Campaign

**Hypothesis:** Offering free credits to test a competitor's product (with the builder's permission) will generate viral comparison content.

**Implementation:** Campaign landing page: "Paste your app URL and a competitor URL. We'll have humans test both. Free." Limited to 100 per month.

**Metric:** Social shares of comparison results. New builder signups.
**Success criteria:** 20% of comparison testers sign up as paying builders.

### Experiment 8: Time-Gated Invite Codes

**Hypothesis:** Invite codes that expire in 48 hours will create urgency and increase conversion rate.

**Implementation:** Add `expires_at` column to `tester_invites` table. Default 48h. Show countdown on invite page.

**Metric:** Invite code conversion rate (codes generated vs. codes redeemed).
**Success criteria:** 40% redemption rate (up from estimated 15-20% with no expiry).

### Experiment 9: Tester "Proof of Work" NFT/Badge

**Hypothesis:** A verifiable "Verified Human Tester" credential will give testers social capital and drive signups.

**Implementation:** Not actual NFT (too much friction). Instead: a verifiable badge page at `blendedagents.com/tester/{id}/verified` showing: tests completed, bugs found, member since. Tester can link from LinkedIn/Twitter.

**Metric:** Tester badge page views. Inbound tester applications mentioning badge.
**Success criteria:** 20% of active testers add badge to LinkedIn within 60 days.

### Experiment 10: "AI vs. Human" Challenge

**Hypothesis:** A public challenge comparing AI-only testing vs. BlendedAgents (AI + Human) will generate viral content.

**Implementation:** Monthly public challenge: submit a URL, get tested by AI tools (Playwright, etc.) and by a BlendedAgents human. Compare results side by side. Publish results as a blog post / tweet thread.

**Metric:** Social impressions, blog traffic, new signups attributed to challenge content.
**Success criteria:** 1 viral post (>10k impressions) per quarter. 50+ signups attributed per challenge.

---

## 11. Viral Coefficient Modeling

### 11.1 Definitions

- **K = i * c** where:
  - `i` = number of invitations/shares sent per user
  - `c` = conversion rate of those invitations

- **K > 1** = self-sustaining viral growth (very rare for B2B)
- **K = 0.3-0.7** = strong viral supplement to paid acquisition (realistic target)
- **K < 0.1** = viral mechanics are not working

### 11.2 Target K-Factor by Channel

| Channel | Invitations (i) | Conversion (c) | K |
|---------|-----------------|-----------------|---|
| Builder referral program | 2.0 per builder | 8% | 0.16 |
| Tester invite codes | 3.0 per tester | 15% | 0.45 |
| Tweet rewards (builders) | 1.0 per builder | 2% | 0.02 |
| API attribution ("Powered by") | 5.0 impressions/test | 0.5% | 0.025 |
| GitHub badge | 50 views/month | 0.1% | 0.05 |
| In-product sharing triggers | 0.5 shares/user | 5% | 0.025 |
| **Blended total** | -- | -- | **~0.35** |

### 11.3 How to Measure

**Track these in the transactions/events table:**

```sql
-- Add referral tracking to builders
ALTER TABLE builders ADD COLUMN referred_by UUID REFERENCES builders(id);
ALTER TABLE builders ADD COLUMN referral_source TEXT; -- 'link', 'tweet', 'github_badge', 'api_attribution'

-- Tester referral chain already tracked via tester_invites.inviter_id
```

**Dashboard metrics to build:**
1. Weekly K-factor: (new users from referrals this week) / (active users who could refer this week)
2. Referral funnel: invitations sent > link clicks > signups > activated (ran first test / completed first task)
3. Time to refer: median days from signup to first referral
4. Referral chain depth: max(chain_length) -- are referrals referring?

### 11.4 K-Factor Improvement Levers

| Lever | Impact on i | Impact on c | Priority |
|-------|------------|------------|----------|
| Increase referral reward | Low | Medium | Medium |
| Reduce friction in signup | None | High | High |
| Better sharing UX (pre-filled tweets, 1-click copy) | High | None | High |
| Public proof (earnings page, stats page) | Medium | Medium | Medium |
| Time-limited offers (expiring codes) | None | High | High |
| Better onboarding (faster time to "aha") | None | High | Highest |

---

## 12. "Tweet-Worthy" Product Moments

These are features specifically designed to produce screenshots that people will want to share on Twitter.

### 12.1 The Bug Report Card

A beautifully designed, shareable summary of a test result.

```
+--------------------------------------------------+
|  BlendedAgents Bug Report                        |
|                                                  |
|  "Checkout flow -- staging.myapp.com"            |
|                                                  |
|  VERDICT: 2 critical bugs found                  |
|                                                  |
|  [Screenshot: broken button on mobile]           |
|                                                  |
|  Tested by a real human in 14 minutes            |
|  Your AI built it. A human verified it.          |
|                                                  |
|  blendedagents.com                               |
+--------------------------------------------------+
```

**Why it is tweet-worthy:** Developers love sharing war stories. "Look at this bug a human caught that my AI missed" is inherently engaging content.

### 12.2 The "Before You Ship" Dashboard

A real-time dashboard showing:
- Tests running right now (with anonymized app names)
- Live bug counter incrementing
- "Bugs caught before production: 12,847"

Screenshot-worthy because it shows the scale and real-time nature of human testing.

### 12.3 The Side-by-Side: AI vs. Human

A comparison view showing what automated tests found vs. what the human tester found.

```
+----------------------------+----------------------------+
|  Automated Tests (Playwright) |  Human Tester (BlendedAgents) |
+----------------------------+----------------------------+
|  5/5 tests passed          |  3/5 steps failed          |
|  "All good!"               |  "Submit button doesn't    |
|                            |   respond on iPhone 14"    |
|                            |  "Forgot password link is  |
|                            |   behind the keyboard"     |
|                            |  "Loading takes 8 seconds  |
|                            |   on 3G"                   |
+----------------------------+----------------------------+
```

**Why it is tweet-worthy:** The contrast is dramatic. "My automated tests said everything was fine. The human found 3 critical bugs." This is the core value proposition visualized.

### 12.4 The Tester Earnings Milestone

For testers, a shareable card:

```
+--------------------------------------------------+
|  I just hit $500 earned on BlendedAgents!        |
|                                                  |
|  47 tests completed                              |
|  12 critical bugs caught                         |
|  Top 5% of testers                               |
|                                                  |
|  Real humans. Real bugs. Real money.             |
|  blendedagents.com/testers                       |
+--------------------------------------------------+
```

**Why it is tweet-worthy:** Money talks. People share income milestones. QA testers sharing earnings creates FOMO in the tester community.

### 12.5 The Integration Moment

When an AI agent sends its first test, the agent's response to the developer includes:

```
I just sent your checkout flow to a real human tester via BlendedAgents.

They'll test it on an actual iPhone and Chrome browser within 30 minutes.
You'll get screenshots, a screen recording, and a step-by-step bug report.

No Selenium. No Playwright. No fake browsers. A real person, on a real device.
```

**Why it is tweet-worthy:** The novelty of "my AI agent just hired a human to QA my code" is deeply shareable. It is a new paradigm and people want to tell others about paradigm shifts.

---

## Implementation Priority

| Item | Effort | Impact | Priority |
|------|--------|--------|----------|
| Powered-by badge in API responses | S | High | P0 |
| Shareable test result pages (public URLs) | M | High | P0 |
| Builder referral program (new) | M | Medium | P1 |
| Automatic tester invite slot grants | S | Medium | P1 |
| Pre-filled tweet sharing on key moments | S | Medium | P1 |
| Tester waitlist system | L | High | P1 |
| Bug Report Card (shareable image) | M | High | P1 |
| GitHub badge service | S | Medium | P2 |
| Public stats page | S | Low | P2 |
| Time-gated invite codes | S | Medium | P2 |
| Slack bot integration | L | Medium | P2 |
| AI vs. Human comparison feature | L | High | P2 |
| Tester earnings public page | S | Medium | P3 |
| GitHub App for PR comments | L | Medium | P3 |

**Start with P0:** get attribution into every API response and make test results shareable. These are low-effort, high-reach changes that create the foundation for everything else.
