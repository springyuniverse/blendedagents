import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agentic QA: How AI Agents Are Changing Software Testing | BlendedAgents',
  description: 'Agentic QA testing is where AI agents autonomously manage the full QA cycle. Learn the paradigm, the tools, and how to implement it today.',
  keywords: 'agentic QA testing, agentic testing 2026, AI agent testing tools, autonomous QA',
  openGraph: {
    title: 'Agentic QA: How AI Agents Are Changing Software Testing',
    description: 'Agentic QA testing is where AI agents autonomously manage the full QA cycle. Learn the paradigm, the tools, and how to implement it today.',
    url: 'https://blendedagents.com/guides/agentic-qa-testing',
    siteName: 'BlendedAgents',
    type: 'article',
  },
  alternates: { canonical: 'https://blendedagents.com/guides/agentic-qa-testing' },
  other: { 'article:modified_time': new Date().toISOString() },
};

const faq_schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is agentic QA testing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Agentic QA testing is a paradigm where AI agents autonomously manage the full quality assurance cycle — planning what to test, dispatching tests to both automated tools and human testers, analyzing results, and acting on findings by fixing bugs and re-verifying. The AI agent is the orchestrator of the entire QA pipeline, not just a tool that runs tests.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is agentic QA different from test automation?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Test automation executes predefined scripts. Agentic QA plans what to test, decides which tests need automation vs. human verification, dispatches to both simultaneously, interprets results, generates fixes, and re-verifies. Traditional automation is one tool in the agentic QA agent\'s toolkit.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does agentic QA replace human testers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Agentic QA relies on human testers for the ~20% of verification that requires subjective judgment — UX quality, real-device behavior, accessibility, and visual coherence. The AI agent invokes human testers through the Human-as-a-Tool pattern, treating them as callable tools in the QA pipeline. Human testers become more utilized, not less needed.',
      },
    },
    {
      '@type': 'Question',
      name: 'What tools are used in agentic QA?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A typical agentic QA stack includes: an AI coding agent (Claude Code, Cursor) for orchestration, Playwright for automated browser testing, BrowserStack for cross-device automation, and BlendedAgents for human verification via API. The AI agent combines these tools to cover the full spectrum from functional regression to subjective quality.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I implement agentic QA today?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Start by configuring your AI coding agent with a skill.md that defines your testing strategy. Set up webhooks for asynchronous result processing. Use an MCP server like BlendedAgents for human verification and Playwright for automated regression. Define test strategies per feature type. The agent handles the rest — dispatching, analyzing, fixing, and re-verifying.',
      },
    },
  ],
};

const breadcrumb_schema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blendedagents.com' },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://blendedagents.com/guides' },
    { '@type': 'ListItem', position: 3, name: 'Agentic QA Testing', item: 'https://blendedagents.com/guides/agentic-qa-testing' },
  ],
};

const article_schema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Agentic QA: How AI Agents Are Changing Software Testing',
  description: 'Agentic QA testing is where AI agents autonomously manage the full QA cycle. Learn the paradigm, the tools, and how to implement it today.',
  author: { '@type': 'Organization', name: 'BlendedAgents', url: 'https://blendedagents.com' },
  publisher: { '@type': 'Organization', name: 'BlendedAgents', url: 'https://blendedagents.com' },
  url: 'https://blendedagents.com/guides/agentic-qa-testing',
  datePublished: '2026-04-19',
  dateModified: '2026-04-19',
  mainEntityOfPage: 'https://blendedagents.com/guides/agentic-qa-testing',
  proficiencyLevel: 'Beginner',
};

/* ── shared styles ── */
const S = {
  wrap: { maxWidth: 780, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1d1127', lineHeight: 1.7 } as const,
  nav: { fontSize: 14, color: '#6b5e7b', marginBottom: 32 } as const,
  link: { color: '#2ba185', textDecoration: 'none' } as const,
  h1: { fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 } as const,
  h2: { fontSize: 24, fontWeight: 600, marginTop: 48, marginBottom: 16 } as const,
  h3: { fontSize: 19, fontWeight: 600, marginTop: 32, marginBottom: 12 } as const,
  lead: { fontSize: 18, color: '#3d3452' } as const,
  section: { marginTop: 40 } as const,
  code: { background: '#f4f1f8', padding: '2px 7px', borderRadius: 4, fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const,
  codeBlock: { background: '#1d1127', color: '#e8e4ee', padding: '20px 24px', borderRadius: 8, fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflowX: 'auto' as const, lineHeight: 1.6, marginTop: 16, marginBottom: 16 },
  li: { marginBottom: 12 } as const,
  ol: { paddingLeft: 24 } as const,
  ul: { paddingLeft: 24 } as const,
  callout: { background: '#f4f1f8', border: '1px solid #ece8f0', borderRadius: 8, padding: '16px 20px', marginTop: 16, marginBottom: 16, fontSize: 15 } as const,
  hr: { border: 'none', borderTop: '1px solid #ece8f0', margin: '48px 0' } as const,
  footer: { marginTop: 64, paddingTop: 24, borderTop: '1px solid #ece8f0', fontSize: 13, color: '#6b5e7b', textAlign: 'center' as const } as const,
};

export default function AgenticQATestingGuide() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article_schema) }} />

      <div style={S.wrap}>
        <nav style={S.nav}>
          <a href="/" style={S.link}>Home</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Guides</span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Agentic QA Testing</span>
        </nav>

        <article>
          <h1 style={S.h1}>Agentic QA: How AI Agents Are Changing Software Testing</h1>
          <p style={{ fontSize: 13, color: '#6b5e7b', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Updated April 2026 &middot; 18 min read
          </p>

          {/* ── OPENING ── */}
          <section id="answer">
            <p style={S.lead}>
              <strong>Agentic QA is a paradigm where AI agents autonomously manage the full quality assurance cycle &mdash; planning what to test, dispatching tests to both automated tools and human testers, analyzing results, and acting on findings by fixing bugs and re-verifying.</strong> It is the convergence of AI coding agents, automated testing frameworks, and <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> platforms into a single autonomous pipeline that builds, tests, fixes, and ships software with minimal developer intervention.
            </p>
          </section>

          <p>
            This guide explains the four phases of agentic QA, places it in market context, walks through the agent testing loop step by step, explains why the paradigm fundamentally requires human testers, surveys the tools that make it possible today, and outlines how to implement agentic QA in your development workflow right now.
          </p>

          {/* ── TABLE OF CONTENTS ── */}
          <div style={{ ...S.callout, marginTop: 32 }}>
            <strong>In this guide:</strong>
            <ol style={{ ...S.ol, marginTop: 8, marginBottom: 0 }}>
              <li><a href="#what-is-agentic-qa" style={S.link}>What Is Agentic QA?</a></li>
              <li><a href="#market" style={S.link}>Market Context</a></li>
              <li><a href="#loop" style={S.link}>The Agent Testing Loop</a></li>
              <li><a href="#why-humans" style={S.link}>Why Agentic QA Requires Humans</a></li>
              <li><a href="#tools" style={S.link}>Tools for Agentic QA</a></li>
              <li><a href="#implementing" style={S.link}>Implementing Agentic QA Today</a></li>
              <li><a href="#future" style={S.link}>The Future of QA: 2026-2030</a></li>
              <li><a href="#faq" style={S.link}>FAQ</a></li>
            </ol>
          </div>

          <hr style={S.hr} />

          {/* ── SECTION 1: WHAT IS AGENTIC QA ── */}
          <section id="what-is-agentic-qa" style={S.section}>
            <h2 style={S.h2}>What Is Agentic QA?</h2>
            <p>
              Agentic QA is the application of AI agent capabilities to the entire quality assurance lifecycle. Unlike traditional test automation, which executes predefined scripts, or manual QA, which relies on human testers to plan and execute, agentic QA places an AI agent at the center of the process as the orchestrator.
            </p>
            <p>
              The agent operates across four distinct phases:
            </p>

            <h3 style={S.h3}>Phase 1: Plan</h3>
            <p>
              The agent analyzes its own code changes &mdash; diffs, affected components, modified API endpoints, changed UI elements &mdash; and determines what needs testing. It categorizes tests by type: which can be verified with automated scripts, and which require human judgment. It generates test cases for both categories, including step-by-step instructions for human testers and assertion logic for automated tests.
            </p>
            <p>
              This replaces the traditional process where a developer or QA lead manually writes test plans and decides what to test. The agent has complete context on what changed and can generate comprehensive test coverage in seconds.
            </p>

            <h3 style={S.h3}>Phase 2: Dispatch</h3>
            <p>
              The agent dispatches tests to the appropriate tools simultaneously. Automated tests go to Playwright or a similar framework. Human-judgment tests go to a <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> platform like <a href="/" style={S.link}>BlendedAgents</a>. Cross-device automated tests go to BrowserStack. All dispatches happen in parallel &mdash; the agent does not wait for one category to finish before starting another.
            </p>

            <h3 style={S.h3}>Phase 3: Analyze</h3>
            <p>
              As results flow back from all sources, the agent correlates them with the code changes. It maps each failure to a specific commit, file, or function. It prioritizes issues by severity. It identifies patterns &mdash; if three human testers report the same issue on different devices, the agent recognizes it as a cross-platform bug rather than three separate issues.
            </p>

            <h3 style={S.h3}>Phase 4: Act</h3>
            <p>
              The agent takes action based on its analysis. For each identified bug, it generates a fix, updates the automated test suite to cover the failure case, and resubmits the affected test cases for re-verification. The cycle continues until all tests pass. Only then does the agent report the final status to the developer &mdash; with evidence, screen recordings, and a summary of everything that was verified and fixed.
            </p>

            <div style={S.callout}>
              <strong>The key distinction:</strong> In traditional QA, a human plans, dispatches, analyzes, and acts. In test automation, a machine executes but a human still plans, analyzes, and acts. In agentic QA, the AI agent handles all four phases &mdash; Plan, Dispatch, Analyze, Act &mdash; autonomously.
            </div>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 2: MARKET CONTEXT ── */}
          <section id="market" style={S.section}>
            <h2 style={S.h2}>Market Context: $8.5B to $100B by 2033</h2>
            <p>
              The AI-driven testing market was valued at approximately $8.5 billion in 2024. Industry projections estimate growth to over $100 billion by 2033. This is not speculative growth driven by hype &mdash; it is structural demand driven by a fundamental shift in how software is written.
            </p>
            <p>
              The calculus is straightforward: AI coding agents are generating code at an unprecedented rate. GitHub reports that Copilot writes 46% of all code in enabled repositories. Claude Code and Cursor are generating entire features from natural language descriptions. The more code AI generates, the more testing that code requires &mdash; and the testing cannot be done by the same AI that wrote the code, because it shares the same blind spots.
            </p>
            <p>
              This creates a structural demand curve for independent verification. Automated testing absorbs some of this demand, but the subjective quality, real-device behavior, and accessibility verification that users actually care about requires human involvement. The platforms that make human verification programmable &mdash; accessible via API rather than manual coordination &mdash; will capture a significant share of this market.
            </p>
            <p>
              Agentic QA is the architecture that makes this scalable. An AI agent that can autonomously write code, plan tests, dispatch to both automation and humans, and process results in a closed loop is the only model that can keep pace with the volume of AI-generated code entering production.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 3: THE LOOP ── */}
          <section id="loop" style={S.section}>
            <h2 style={S.h2}>The Agent Testing Loop: Step by Step</h2>
            <p>
              Here is the complete agentic QA loop, from code generation to verified feature. This walkthrough shows how each step connects and why the loop converges on quality.
            </p>

            <h3 style={S.h3}>Step 1: Build</h3>
            <p>
              The AI coding agent generates a feature based on a task description, specification, or user story. This produces working code that handles the primary user flow. The agent commits the code to a feature branch and deploys to a staging environment.
            </p>

            <h3 style={S.h3}>Step 2: Design Test Strategy</h3>
            <p>
              The agent analyzes its own changes. It identifies:
            </p>
            <ul style={S.ul}>
              <li style={S.li}><strong>Functional tests</strong> &mdash; API endpoints to verify, components to render, database queries to validate. These go to automated tools.</li>
              <li style={S.li}><strong>Visual/UX tests</strong> &mdash; does the new UI look correct, does the flow feel responsive, does the layout work on mobile. These go to human testers.</li>
              <li style={S.li}><strong>Accessibility tests</strong> &mdash; keyboard navigation, screen reader compatibility, color contrast. These go to human testers with specific device requirements.</li>
              <li style={S.li}><strong>Cross-device tests</strong> &mdash; the feature working on Safari, Firefox, mobile Chrome, different screen sizes. A mix of automated (BrowserStack) and human verification.</li>
            </ul>

            <h3 style={S.h3}>Step 3: Dispatch to Automation and Humans Simultaneously</h3>
            <p>
              The agent dispatches all test categories in parallel. It does not wait for automated tests to finish before submitting human tests. This is critical for time efficiency &mdash; human testers are the longer pole, so starting them early reduces total verification time.
            </p>
            <pre style={S.codeBlock}>{`// Parallel dispatch — automated + human tests run simultaneously
await Promise.all([
  // Automated: run Playwright tests
  runPlaywrightSuite('checkout-flow.spec.ts'),

  // Human: submit flow test via BlendedAgents API
  submitFlowTest({
    title: 'Verify checkout flow on mobile Safari',
    url: stagingUrl + '/checkout',
    steps: [
      'Add item to cart from product page',
      'Open cart, verify item appears with correct price',
      'Proceed to checkout',
      'Fill shipping address using iOS autofill',
      'Switch tabs for 10 seconds, return',
      'Complete payment with test card',
      'Verify confirmation page shows order number'
    ],
    expected: 'All steps complete. Address retained after tab switch.',
    device: 'iPhone, Safari'
  }),

  // Human: submit review test for visual quality
  submitReviewTest({
    title: 'Review new checkout page design on mobile',
    url: stagingUrl + '/checkout',
    focus_areas: ['Layout spacing', 'Button sizing', 'Font readability', 'Loading states'],
    device: 'iPhone, Safari'
  })
]);`}</pre>

            <h3 style={S.h3}>Step 4: Analyze Results</h3>
            <p>
              As results stream in, the agent processes each one:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Automated test failures are mapped to specific code locations via stack traces and assertion messages.</li>
              <li style={S.li}>Human test failures include structured evidence: severity ratings, screenshots, screen recordings, reproduction steps, and device details.</li>
              <li style={S.li}>The agent correlates failures across sources. If both automated tests and human testers report the same issue, it increases confidence in the diagnosis.</li>
            </ul>

            <h3 style={S.h3}>Step 5: Fix</h3>
            <p>
              For each failure, the agent generates a targeted fix based on the evidence. It updates the code, adds or modifies automated tests to cover the failure case, and commits the changes. The fixes are informed not just by the failure description but by the specific evidence &mdash; screen recordings showing the exact user interaction that failed, screenshots showing the visual state at the moment of failure.
            </p>

            <h3 style={S.h3}>Step 6: Reverify</h3>
            <p>
              The agent redeploys the fixed code to staging and resubmits only the failed test cases. Passing tests are not re-run (unless the fix could have introduced a regression). This focused re-verification reduces cycle time significantly.
            </p>
            <p>
              Most features converge within 2-3 iterations. The agent reports the final status to the developer with a summary: what was tested, what was found, what was fixed, and evidence that the fixes work.
            </p>

            <div style={S.callout}>
              <strong>Full loop:</strong> Build &rarr; design test strategy &rarr; dispatch to automation + humans simultaneously &rarr; analyze &rarr; fix &rarr; reverify &rarr; report.
            </div>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 4: WHY HUMANS ── */}
          <section id="why-humans" style={S.section}>
            <h2 style={S.h2}>Why Agentic QA Requires Humans</h2>
            <p>
              A common misconception is that &ldquo;agentic&rdquo; means &ldquo;fully automated.&rdquo; It does not. Agentic means the AI agent is the orchestrator. The agent decides <em>what</em> to test and <em>how</em> to test it. For roughly 80% of verification, the answer is automated scripts. For the remaining 20%, the answer is human testers.
            </p>

            <h3 style={S.h3}>The Perception Gap</h3>
            <p>
              AI agents process text, code, and structured data with extraordinary capability. What they cannot do is <em>perceive</em> software the way a human user does. They cannot feel that a 200ms delay makes a button feel unresponsive. They cannot see that a font renders poorly on a Windows laptop. They cannot sense that a five-step onboarding flow is two steps too many.
            </p>
            <p>
              This perception gap is not a temporary limitation that will be solved with better models. It is a fundamental asymmetry: software is built for humans, and only humans can verify that it works <em>for humans</em>. An AI can verify that a function returns the correct value. A human verifies that the feature built on that function is usable, accessible, and trustworthy.
            </p>

            <h3 style={S.h3}>The Human-as-a-Tool Pattern</h3>
            <p>
              The <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> pattern solves the perception gap by making human judgment a callable capability. The AI agent does not need to perceive software like a human &mdash; it just needs to invoke a human who can. The agent constructs a structured test case, submits it to a platform like <a href="/" style={S.link}>BlendedAgents</a>, and receives structured results that it can process algorithmically.
            </p>
            <p>
              This is the architectural insight that makes agentic QA work: the agent does not need to be human. It needs <em>access</em> to humans. And that access needs to be programmatic &mdash; an API call, not a ticket.
            </p>
            <p>
              Human testers in an agentic QA pipeline are not being replaced. They are being utilized more effectively. Instead of waiting for a QA lead to assign them work, they receive tasks dispatched by AI agents at the moment they are needed. Instead of writing unstructured bug reports, they return structured results that agents can act on immediately. The human tester&apos;s judgment is more valuable than ever &mdash; the overhead around accessing it is what gets eliminated.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 5: TOOLS ── */}
          <section id="tools" style={S.section}>
            <h2 style={S.h2}>Tools for Agentic QA</h2>
            <p>
              Agentic QA is not a single tool &mdash; it is an architecture that combines several tools under the orchestration of an AI agent. Here is how the major tools fit together.
            </p>

            <h3 style={S.h3}>Claude Code and Cursor &mdash; The Orchestrators</h3>
            <p>
              AI coding agents like Claude Code and Cursor serve as the orchestrators in an agentic QA pipeline. They write the code, plan the tests, dispatch to tools and humans, process results, and generate fixes. They support MCP (Model Context Protocol), which allows them to invoke external tools &mdash; including human testing platforms &mdash; as native tool calls.
            </p>
            <p>
              <strong>Role in agentic QA:</strong> the brain of the operation. Everything flows through the agent.
            </p>

            <h3 style={S.h3}>Playwright &mdash; Automated Browser Testing</h3>
            <p>
              <a href="https://playwright.dev" style={S.link} rel="noopener noreferrer">Playwright</a> handles the automated portion of the testing pipeline. The AI agent generates Playwright test scripts for functional regression, runs them in CI, and processes the results. Playwright supports Chromium, Firefox, and WebKit.
            </p>
            <p>
              <strong>Role in agentic QA:</strong> the fast feedback layer for functional correctness.
            </p>

            <h3 style={S.h3}>BlendedAgents &mdash; Human-as-a-Tool</h3>
            <p>
              <a href="/" style={S.link}>BlendedAgents</a> provides the human verification layer. The AI agent submits test cases via API or MCP tool call, and vetted human testers execute them on real devices. Results return as structured JSON with pass/fail, severity, evidence, and reproduction steps. The agent processes these results the same way it processes Playwright output &mdash; as structured data it can act on.
            </p>
            <p>
              <strong>Role in agentic QA:</strong> the human judgment layer for subjective quality, real-device testing, and accessibility.
            </p>

            <h3 style={S.h3}>BrowserStack &mdash; Cross-Device Cloud</h3>
            <p>
              <a href="https://www.browserstack.com" style={S.link} rel="noopener noreferrer">BrowserStack</a> provides automated cross-browser and cross-device testing at scale. The agent runs Playwright tests across multiple browser/OS/device combinations to catch rendering and compatibility issues.
            </p>
            <p>
              <strong>Role in agentic QA:</strong> automated cross-device regression coverage.
            </p>

            <h3 style={S.h3}>How They Fit Together</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 15 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ece8f0' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Tool</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Speed</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>What It Verifies</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>Claude Code / Cursor</td>
                    <td style={{ padding: '10px 16px' }}>Orchestration</td>
                    <td style={{ padding: '10px 16px' }}>&mdash;</td>
                    <td style={{ padding: '10px 16px' }}>Plans, dispatches, analyzes, fixes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>Playwright</td>
                    <td style={{ padding: '10px 16px' }}>Automation</td>
                    <td style={{ padding: '10px 16px' }}>Seconds</td>
                    <td style={{ padding: '10px 16px' }}>Functional correctness, API contracts, render integrity</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>BrowserStack</td>
                    <td style={{ padding: '10px 16px' }}>Cross-device</td>
                    <td style={{ padding: '10px 16px' }}>Minutes</td>
                    <td style={{ padding: '10px 16px' }}>Browser compatibility, viewport rendering, JS API support</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}><a href="/" style={S.link}>BlendedAgents</a></td>
                    <td style={{ padding: '10px 16px' }}>Human verification</td>
                    <td style={{ padding: '10px 16px' }}>Minutes</td>
                    <td style={{ padding: '10px 16px' }}>UX quality, real-device feel, accessibility, subjective judgment</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 6: IMPLEMENTING ── */}
          <section id="implementing" style={S.section}>
            <h2 style={S.h2}>Implementing Agentic QA Today</h2>
            <p>
              You do not need to wait for a fully autonomous future. Agentic QA can be implemented today with existing tools. Here is a practical setup guide.
            </p>

            <h3 style={S.h3}>1. Configure Your Agent&apos;s Skill File</h3>
            <p>
              AI coding agents like Claude Code use a <span style={S.code}>skill.md</span> or <span style={S.code}>CLAUDE.md</span> file to understand their available tools and workflows. Add testing instructions to this file:
            </p>
            <pre style={S.codeBlock}>{`# Testing Protocol

After implementing any user-facing feature:
1. Write automated tests (Playwright for browser, vitest for unit)
2. Run automated tests and fix any failures
3. Submit human verification via BlendedAgents MCP for:
   - Mobile usability (flow_test on iPhone Safari)
   - Visual quality (review_test with focus on layout/spacing)
   - Accessibility (flow_test with screen reader requirements)
4. Process human test results when they return
5. Fix any issues found, re-run automated tests, resubmit human tests
6. Report final status with evidence`}</pre>

            <h3 style={S.h3}>2. Set Up the MCP Server</h3>
            <p>
              Configure BlendedAgents as an MCP server so your agent can submit human test cases as native tool calls:
            </p>
            <pre style={S.codeBlock}>{`// .cursor/mcp.json or claude_desktop_config.json
{
  "mcpServers": {
    "blendedagents": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-blendedagents"],
      "env": { "BA_API_KEY": "ba_sk_..." }
    }
  }
}`}</pre>

            <h3 style={S.h3}>3. Set Up Webhooks</h3>
            <p>
              Configure webhooks to receive human test results asynchronously. When a tester completes a test case, BlendedAgents sends structured results to your endpoint:
            </p>
            <pre style={S.codeBlock}>{`// Webhook payload from BlendedAgents
{
  "event": "test_case.completed",
  "test_case_id": "tc_abc123",
  "status": "fail",
  "severity": "high",
  "results": {
    "steps_passed": 5,
    "steps_failed": 1,
    "evidence": {
      "screen_recording_url": "https://...",
      "screenshots": ["https://..."],
      "notes": "Address fields cleared after tab switch on Safari"
    }
  },
  "device": { "type": "iPhone 15", "browser": "Safari 18.2" }
}`}</pre>

            <h3 style={S.h3}>4. Define Test Strategies Per Feature Type</h3>
            <p>
              Not every feature needs the same level of verification. Define strategies based on risk:
            </p>
            <ul style={S.ul}>
              <li style={S.li}><strong>Payment flows:</strong> automated tests + human flow test on mobile + human flow test on desktop. High severity threshold.</li>
              <li style={S.li}><strong>Dashboard views:</strong> automated tests + human review test for visual quality. Medium severity threshold.</li>
              <li style={S.li}><strong>API-only changes:</strong> automated tests only. No human verification needed.</li>
              <li style={S.li}><strong>Onboarding/signup:</strong> automated tests + human flow test on 3 device types. This is the first impression &mdash; test thoroughly.</li>
            </ul>

            <h3 style={S.h3}>5. Monitor the Loop</h3>
            <p>
              Track convergence metrics: how many iterations does the agent need before all tests pass? If the average is climbing, the agent&apos;s code quality is declining and you need to improve prompts or add guardrails. If human testers consistently find the same category of bug, add that category to the automated test suite or the agent&apos;s skill file instructions.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 7: FUTURE ── */}
          <section id="future" style={S.section}>
            <h2 style={S.h2}>The Future of QA: 2026-2030</h2>
            <p>
              Agentic QA is the beginning of a transformation that will reshape how software is built, tested, and shipped. Here is where the trajectory points.
            </p>

            <h3 style={S.h3}>Autonomous Build-Test-Ship</h3>
            <p>
              By 2027-2028, the build-test-fix loop will be tight enough that AI agents can take a feature request and deliver a verified, production-ready feature without developer involvement in the intermediate steps. The developer defines what to build and reviews the final output. Everything in between &mdash; coding, testing, fixing, re-testing &mdash; is autonomous.
            </p>
            <p>
              This does not eliminate developers. It changes their role from executing tasks to defining intent and reviewing outcomes. The developer becomes an architect and quality gatekeeper, not a line-by-line coder or manual test runner.
            </p>

            <h3 style={S.h3}>Human Testers as Infrastructure</h3>
            <p>
              Human testers will increasingly be treated as infrastructure &mdash; a programmable resource that AI agents invoke on demand, like a database or a CDN. The best testers will be the ones who provide the most accurate, structured, and actionable feedback. Platforms like <a href="/" style={S.link}>BlendedAgents</a> will be the layer that makes this infrastructure reliable, consistent, and scalable.
            </p>
            <p>
              This elevates the human tester&apos;s role. Instead of being a bottleneck in a manual process, testers become a critical capability that enables autonomous software delivery. Their judgment is the final gate between &ldquo;code works&rdquo; and &ldquo;feature ships.&rdquo;
            </p>

            <h3 style={S.h3}>Quality as Code</h3>
            <p>
              Quality standards will be expressed as code &mdash; machine-readable definitions of what &ldquo;good enough to ship&rdquo; means for each feature type. These definitions will specify which automated tests must pass, which human verification must complete, what severity thresholds gate deployment, and what evidence must accompany the ship decision. The AI agent reads these definitions and executes accordingly.
            </p>
            <p>
              This is the natural evolution: from quality as a manual checklist, to quality as an automated gate, to quality as a fully codified standard that AI agents enforce autonomously with both automated and human verification.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── FAQ ── */}
          <section id="faq" style={{ marginTop: 48, borderTop: '1px solid #ece8f0', paddingTop: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Frequently Asked Questions</h2>

            <h3 style={S.h3}>What is agentic QA testing?</h3>
            <p>
              Agentic QA testing is a paradigm where AI agents autonomously manage the full quality assurance cycle &mdash; planning what to test, dispatching tests to both automated tools and human testers, analyzing results, and acting on findings by fixing bugs and re-verifying. The AI agent is the orchestrator of the entire QA pipeline, not just a tool that runs tests.
            </p>

            <h3 style={S.h3}>How is agentic QA different from test automation?</h3>
            <p>
              Test automation executes predefined scripts. Agentic QA plans what to test, decides which tests need automation vs. human verification, dispatches to both simultaneously, interprets results, generates fixes, and re-verifies. Traditional automation is one tool in the agentic QA agent&apos;s toolkit &mdash; a valuable one, but not the whole picture.
            </p>

            <h3 style={S.h3}>Does agentic QA replace human testers?</h3>
            <p>
              No. Agentic QA relies on human testers for the approximately 20% of verification that requires subjective judgment &mdash; UX quality, real-device behavior, accessibility, and visual coherence. The AI agent invokes human testers through the <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> pattern, treating them as callable tools in the QA pipeline. Human testers become more utilized, not less needed.
            </p>

            <h3 style={S.h3}>What tools are used in agentic QA?</h3>
            <p>
              A typical agentic QA stack includes: an AI coding agent (Claude Code, Cursor) for orchestration, Playwright for automated browser testing, BrowserStack for cross-device automation, and <a href="/" style={S.link}>BlendedAgents</a> for <a href="/glossary/human-as-a-tool" style={S.link}>human verification via API</a>. The AI agent combines these tools to cover the full spectrum from functional regression to subjective quality.
            </p>

            <h3 style={S.h3}>How do I implement agentic QA today?</h3>
            <p>
              Start by configuring your AI coding agent with a skill file that defines your testing strategy. Set up BlendedAgents as an MCP server for human verification. Use Playwright for automated regression. Define test strategies per feature type (payment flows get more human testing than API-only changes). The agent handles the rest &mdash; dispatching, analyzing, fixing, and re-verifying.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── CLOSING CTA ── */}
          <section style={{ ...S.section, textAlign: 'center' }}>
            <h2 style={{ ...S.h2, marginTop: 0 }}>Start Building Agentic QA Pipelines</h2>
            <p>
              BlendedAgents is the <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> layer for your AI agent&apos;s QA pipeline. Submit test cases via API, get human-verified results, and let your agent close the loop.
            </p>
            <p style={{ marginTop: 24 }}>
              <a href="/signup/builder" style={{ display: 'inline-block', background: '#2ba185', color: '#fff', padding: '12px 28px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 15 }}>
                Try BlendedAgents Free
              </a>
            </p>
          </section>

          {/* ── RELATED ── */}
          <section style={{ marginTop: 48 }}>
            <h3 style={{ ...S.h3, fontSize: 16, color: '#6b5e7b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Related</h3>
            <ul style={{ ...S.ul, listStyle: 'none', paddingLeft: 0 }}>
              <li style={{ marginBottom: 8 }}><a href="/human-as-a-tool" style={S.link}>What is Human-as-a-Tool? &mdash; Full Guide</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/agentic-qa" style={S.link}>Agentic QA &mdash; Glossary Definition</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/human-as-a-tool" style={S.link}>Human-as-a-Tool &mdash; Glossary Definition</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/human-in-the-loop-testing" style={S.link}>Human-in-the-Loop Testing &mdash; Glossary Definition</a></li>
            </ul>
          </section>
        </article>

        <footer style={S.footer}>
          <p>&copy; {new Date().getFullYear()} BlendedAgents. The first Human-as-a-Tool platform for AI agents.</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/" style={S.link}>Home</a>
            <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a>
            <a href="/glossary/agentic-qa" style={S.link}>Agentic QA</a>
            <a href="/signup/builder" style={S.link}>Sign Up</a>
          </div>
        </footer>
      </div>
    </>
  );
}
