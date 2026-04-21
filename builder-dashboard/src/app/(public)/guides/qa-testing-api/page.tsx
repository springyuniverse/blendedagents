import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QA Testing API: How to Automate Human QA with an API | BlendedAgents',
  description: 'Submit test cases programmatically, get human-verified results via API. Code examples, MCP integration, and CI/CD workflows for the first QA testing API.',
  keywords: 'QA testing API, manual QA testing API, human QA API, testing API for developers',
  openGraph: {
    title: 'QA Testing API: How to Automate Human QA with an API',
    description: 'Submit test cases programmatically, get human-verified results via API. Code examples, MCP integration, and CI/CD workflows for the first QA testing API.',
    url: 'https://blendedagents.com/guides/qa-testing-api',
    siteName: 'BlendedAgents',
    type: 'article',
  },
  alternates: { canonical: 'https://blendedagents.com/guides/qa-testing-api' },
  other: { 'article:modified_time': new Date().toISOString() },
};

const faq_schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is a QA testing API?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A QA testing API lets you submit test cases programmatically and receive human-verified results back via structured JSON. Unlike Selenium Grid or BrowserStack which run automated scripts on remote browsers, a QA testing API dispatches tasks to real human testers who evaluate your software on real devices. BlendedAgents provides the first API designed specifically for this — submit a test case with a POST request, get structured pass/fail results with evidence.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is a QA testing API different from BrowserStack or Selenium?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BrowserStack and Selenium execute automated scripts on remote browsers and devices. A QA testing API like BlendedAgents dispatches test cases to real human testers. The difference is what you get back: automated tools return assertion results (pass/fail on predefined checks). A human QA API returns subjective judgment — UX quality, accessibility, visual coherence, real-device behavior — things no automated script can evaluate.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can AI agents use a QA testing API?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. This is the primary use case. AI coding agents like Claude Code and Cursor can call the BlendedAgents API (or use the MCP server for native tool call integration) to submit test cases as part of their build-test-fix workflow. The agent writes code, submits to human verification via API, processes structured results, fixes issues, and resubmits — all autonomously.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you integrate a QA testing API into CI/CD?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Add a step to your CI/CD pipeline that submits critical user journeys to the QA testing API after automated tests pass. Poll for results or use webhooks. Gate the production deployment on human verification passing. This adds minutes, not hours, and catches the bugs that automated tests miss — UX issues, real-device behavior, accessibility gaps.',
      },
    },
    {
      '@type': 'Question',
      name: 'What results does a QA testing API return?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The BlendedAgents API returns structured JSON with: overall status (pass/fail), severity rating, per-step results, tester notes, screen recording URL, screenshot URLs, device details, and reproduction steps. This structured format is designed for machine consumption — AI agents can parse and act on the results without human interpretation.',
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
    { '@type': 'ListItem', position: 3, name: 'QA Testing API', item: 'https://blendedagents.com/guides/qa-testing-api' },
  ],
};

const article_schema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'QA Testing API: How to Automate Human QA with an API',
  description: 'Submit test cases programmatically, get human-verified results via API. Code examples, MCP integration, and CI/CD workflows for the first QA testing API.',
  author: { '@type': 'Organization', name: 'BlendedAgents', url: 'https://blendedagents.com' },
  publisher: { '@type': 'Organization', name: 'BlendedAgents', url: 'https://blendedagents.com' },
  url: 'https://blendedagents.com/guides/qa-testing-api',
  datePublished: '2026-04-19',
  dateModified: '2026-04-19',
  mainEntityOfPage: 'https://blendedagents.com/guides/qa-testing-api',
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

export default function QATestingAPIGuide() {
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
          <span>QA Testing API</span>
        </nav>

        <article>
          <h1 style={S.h1}>QA Testing API: How to Automate Human QA with an API</h1>
          <p style={{ fontSize: 13, color: '#6b5e7b', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Updated April 2026 &middot; 12 min read
          </p>

          {/* ── OPENING ── */}
          <section id="answer">
            <p style={S.lead}>
              <strong>A QA testing API lets you submit test cases programmatically and receive human-verified results as structured JSON.</strong> Unlike automated testing APIs (Selenium Grid, BrowserStack) which run scripts on remote machines, a QA testing API dispatches tasks to real humans who evaluate your software on real devices, judge subjective quality, and return structured evidence. <a href="/" style={S.link}>BlendedAgents</a> provides the first API built for this &mdash; three lines of code to get human QA.
            </p>
          </section>

          <p>
            This guide covers how the BlendedAgents API works, including authentication, submitting both flow tests and review tests with code examples, choosing between polling and webhooks, parsing structured results, MCP integration for AI agents, and five practical use cases with code.
          </p>

          {/* ── TABLE OF CONTENTS ── */}
          <div style={{ ...S.callout, marginTop: 32 }}>
            <strong>In this guide:</strong>
            <ol style={{ ...S.ol, marginTop: 8, marginBottom: 0 }}>
              <li><a href="#what-is-qa-api" style={S.link}>What Is a QA Testing API?</a></li>
              <li><a href="#how-it-works" style={S.link}>How the BlendedAgents API Works</a></li>
              <li><a href="#mcp" style={S.link}>MCP Integration</a></li>
              <li><a href="#use-cases" style={S.link}>Use Cases</a></li>
              <li><a href="#api-vs-dashboard" style={S.link}>API vs Dashboard: Why API-First Matters</a></li>
              <li><a href="#faq" style={S.link}>FAQ</a></li>
            </ol>
          </div>

          <hr style={S.hr} />

          {/* ── SECTION 1: WHAT IS A QA TESTING API ── */}
          <section id="what-is-qa-api" style={S.section}>
            <h2 style={S.h2}>What Is a QA Testing API?</h2>
            <p>
              A QA testing API is an HTTP interface that accepts test case submissions and returns human verification results. It is fundamentally different from automated testing APIs:
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 15 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ece8f0' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Aspect</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Automated Testing APIs</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>QA Testing API (BlendedAgents)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>Who executes?</td>
                    <td style={{ padding: '10px 16px' }}>A script on a remote machine</td>
                    <td style={{ padding: '10px 16px' }}>A vetted human tester on a real device</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>What it verifies</td>
                    <td style={{ padding: '10px 16px' }}>Predefined assertions</td>
                    <td style={{ padding: '10px 16px' }}>Subjective quality, UX, real-device behavior</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>Output</td>
                    <td style={{ padding: '10px 16px' }}>Pass/fail per assertion</td>
                    <td style={{ padding: '10px 16px' }}>Pass/fail + severity + evidence + screen recording</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>Speed</td>
                    <td style={{ padding: '10px 16px' }}>Seconds</td>
                    <td style={{ padding: '10px 16px' }}>Minutes</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>Can evaluate &ldquo;feel&rdquo;</td>
                    <td style={{ padding: '10px 16px' }}>No</td>
                    <td style={{ padding: '10px 16px' }}>Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 20 }}>
              The key difference is what you get back. Selenium and BrowserStack tell you whether your <em>assertions</em> passed. A QA testing API tells you whether your <em>feature works for a real person on a real device</em>. When you submit a test case to BlendedAgents, you are not sending a script &mdash; you are describing what a human should do and what the expected behavior is. A real person does it and tells you what happened.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 2: HOW IT WORKS ── */}
          <section id="how-it-works" style={S.section}>
            <h2 style={S.h2}>How the BlendedAgents API Works</h2>

            <h3 style={S.h3}>Authentication</h3>
            <p>
              All API requests use Bearer token authentication with your builder API key. Keys start with <span style={S.code}>ba_sk_</span> and are generated from your builder dashboard.
            </p>
            <pre style={S.codeBlock}>{`// All requests include this header
Authorization: Bearer ba_sk_your_api_key_here`}</pre>

            <h3 style={S.h3}>Submitting a Flow Test</h3>
            <p>
              A flow test asks a human tester to follow a sequence of steps and verify that each step works correctly. This is ideal for testing user journeys: signup, checkout, onboarding, or any multi-step interaction.
            </p>
            <pre style={S.codeBlock}>{`const response = await fetch('https://api.blendedagents.com/v1/test-cases', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ba_sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Verify checkout flow on mobile Safari',
    template: 'flow_test',
    url: 'https://staging.yourapp.com/checkout',
    steps: [
      'Navigate to the product page and add the first item to cart',
      'Open the cart and verify the item appears with the correct price',
      'Proceed to checkout',
      'Fill the shipping address using iOS autofill',
      'Switch to another tab, wait 10 seconds, switch back',
      'Verify the shipping address fields still have values',
      'Complete payment with the test card: 4242 4242 4242 4242',
      'Verify the confirmation page shows an order number',
    ],
    expected_result: 'All steps complete successfully. Address fields persist after tab switch. Order confirmation displays.',
    device_requirements: 'iPhone, Safari browser',
  }),
});

const { id: testCaseId } = await response.json();
console.log('Test case submitted:', testCaseId);`}</pre>

            <h3 style={S.h3}>Submitting a Review Test</h3>
            <p>
              A review test asks a human tester to evaluate a page or feature holistically, focusing on specific areas. This is ideal for visual quality checks, design reviews, and general UX evaluation.
            </p>
            <pre style={S.codeBlock}>{`const response = await fetch('https://api.blendedagents.com/v1/test-cases', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ba_sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Review new dashboard design on desktop',
    template: 'review_test',
    url: 'https://staging.yourapp.com/dashboard',
    focus_areas: [
      'Layout spacing and alignment',
      'Typography readability',
      'Color contrast and accessibility',
      'Loading state behavior',
      'Empty state messaging',
      'Responsive behavior when resizing browser window',
    ],
    device_requirements: 'Desktop, Chrome latest',
  }),
});`}</pre>

            <h3 style={S.h3}>Polling vs Webhooks</h3>
            <p>
              Human testing takes minutes, not milliseconds. You have two options for receiving results:
            </p>
            <p>
              <strong>Polling</strong> &mdash; periodically check the test case status. Simpler to implement, suitable for CI/CD scripts and one-off integrations.
            </p>
            <pre style={S.codeBlock}>{`// Poll for results
async function waitForResult(testCaseId: string, apiKey: string): Promise<any> {
  while (true) {
    const res = await fetch(
      \`https://api.blendedagents.com/v1/test-cases/\${testCaseId}\`,
      { headers: { 'Authorization': \`Bearer \${apiKey}\` } }
    );
    const data = await res.json();

    if (data.status === 'pass' || data.status === 'fail') {
      return data;
    }

    // Check every 30 seconds
    await new Promise(r => setTimeout(r, 30_000));
  }
}`}</pre>
            <p>
              <strong>Webhooks</strong> &mdash; receive a POST request to your endpoint when the test completes. More efficient for production integrations.
            </p>
            <pre style={S.codeBlock}>{`// Configure your webhook endpoint in the BlendedAgents dashboard
// When a test completes, you receive:
{
  "event": "test_case.completed",
  "test_case_id": "tc_abc123",
  "status": "fail",
  "severity": "high",
  "completed_at": "2026-04-19T14:32:00Z",
  "results": {
    "steps": [
      { "step": 1, "status": "pass", "notes": "" },
      { "step": 2, "status": "pass", "notes": "" },
      { "step": 3, "status": "pass", "notes": "" },
      { "step": 4, "status": "pass", "notes": "Autofill populated all fields" },
      { "step": 5, "status": "fail", "notes": "City and zip code fields empty after tab switch" }
    ],
    "screen_recording_url": "https://storage.blendedagents.com/recordings/rec_xyz.mp4",
    "screenshots": [
      "https://storage.blendedagents.com/screenshots/ss_001.png",
      "https://storage.blendedagents.com/screenshots/ss_002.png"
    ],
    "tester_notes": "Address fields cleared on visibilitychange event in Safari. Reproducible 100%.",
    "device": {
      "type": "iPhone 15",
      "os": "iOS 18.2",
      "browser": "Safari 18.2"
    }
  }
}`}</pre>

            <h3 style={S.h3}>Parsing Structured Results</h3>
            <p>
              The structured result format is designed for machine consumption. AI agents can parse and act on results without any human interpretation:
            </p>
            <pre style={S.codeBlock}>{`// Example: AI agent processing test results
function processTestResult(result: TestResult) {
  if (result.status === 'pass') {
    console.log('Feature verified by human tester. Ready to ship.');
    return { action: 'deploy' };
  }

  // Extract failed steps and evidence
  const failures = result.results.steps.filter(s => s.status === 'fail');
  const evidence = {
    recording: result.results.screen_recording_url,
    screenshots: result.results.screenshots,
    notes: result.results.tester_notes,
    device: result.results.device,
  };

  console.log(\`Found \${failures.length} failures. Severity: \${result.severity}\`);
  console.log('Evidence:', evidence);

  return {
    action: 'fix',
    failures,
    evidence,
    // The agent uses this to generate targeted fixes
  };
}`}</pre>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 3: MCP INTEGRATION ── */}
          <section id="mcp" style={S.section}>
            <h2 style={S.h2}>MCP Integration</h2>
            <p>
              AI coding agents that support the Model Context Protocol (MCP) &mdash; including Claude Code and Cursor &mdash; can invoke human testing as a native tool call. No HTTP boilerplate. No webhook configuration. One JSON block in your config and the agent can dispatch human tests as easily as it calls any other tool.
            </p>
            <pre style={S.codeBlock}>{`// Add to claude_desktop_config.json, .cursor/mcp.json,
// or .vscode/mcp.json
{
  "mcpServers": {
    "blendedagents": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-blendedagents"],
      "env": {
        "BA_API_KEY": "ba_sk_your_api_key_here"
      }
    }
  }
}`}</pre>
            <p>
              Once configured, the agent has access to tools like <span style={S.code}>submit_flow_test</span> and <span style={S.code}>submit_review_test</span>. It can dispatch human verification as a natural part of its build-test-fix workflow:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>The agent writes a feature.</li>
              <li style={S.li}>It calls <span style={S.code}>submit_flow_test</span> with the staging URL and test steps.</li>
              <li style={S.li}>A human tester executes the test on a real device.</li>
              <li style={S.li}>Structured results flow back into the agent&apos;s context.</li>
              <li style={S.li}>The agent fixes any issues and resubmits.</li>
            </ul>
            <p>
              This is the <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> pattern at its most seamless. The agent treats human testers the same way it treats a database query or an API call &mdash; structured input in, structured output back.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 4: USE CASES ── */}
          <section id="use-cases" style={S.section}>
            <h2 style={S.h2}>Use Cases</h2>

            <h3 style={S.h3}>1. CI/CD Integration</h3>
            <p>
              Gate production deployments on human verification. After automated tests pass in your CI pipeline, submit critical user journeys to the QA testing API and block the deploy until human testers confirm they work.
            </p>
            <pre style={S.codeBlock}>{`# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run automated tests
        run: npm test

      - name: Submit to human verification
        id: human-qa
        run: |
          RESPONSE=$(curl -s -X POST https://api.blendedagents.com/v1/test-cases \\
            -H "Authorization: Bearer \${{ secrets.BA_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "title": "Pre-deploy: verify checkout on mobile",
              "template": "flow_test",
              "url": "https://staging.yourapp.com/checkout",
              "steps": [
                "Add item to cart",
                "Complete checkout with test card",
                "Verify confirmation page"
              ],
              "expected_result": "Checkout completes, order confirmed",
              "device_requirements": "iPhone, Safari"
            }')
          echo "test_id=$(echo $RESPONSE | jq -r '.id')" >> $GITHUB_OUTPUT

      - name: Wait for human verification
        run: |
          for i in $(seq 1 60); do
            RESULT=$(curl -s \\
              -H "Authorization: Bearer \${{ secrets.BA_API_KEY }}" \\
              "https://api.blendedagents.com/v1/test-cases/\${{ steps.human-qa.outputs.test_id }}")
            STATUS=$(echo $RESULT | jq -r '.status')
            if [ "$STATUS" = "pass" ]; then
              echo "Human verification passed"
              exit 0
            elif [ "$STATUS" = "fail" ]; then
              echo "Human verification FAILED"
              echo $RESULT | jq '.results'
              exit 1
            fi
            sleep 30
          done
          echo "Timeout waiting for human verification"
          exit 1

      - name: Deploy to production
        if: success()
        run: npm run deploy:production`}</pre>

            <h3 style={S.h3}>2. AI Agent Autonomous QA</h3>
            <p>
              AI coding agents use the API (or MCP integration) to autonomously verify their own work. The agent builds a feature, submits it for human testing, processes results, fixes issues, and resubmits &mdash; all without developer intervention. This is <a href="/glossary/agentic-qa" style={S.link}>agentic QA</a> in practice.
            </p>

            <h3 style={S.h3}>3. Pre-Release Verification</h3>
            <p>
              Before any significant release, submit the top 5-10 user journeys to human testers on multiple devices. This provides a final gate that catches integration issues, visual regressions, and UX problems that emerge only when all pieces come together. The API makes this repeatable &mdash; save the test suite and re-run it for every release.
            </p>

            <h3 style={S.h3}>4. Cross-Device Testing</h3>
            <p>
              Submit the same test case with different device requirements to verify behavior across the device matrix:
            </p>
            <pre style={S.codeBlock}>{`const devices = [
  'iPhone, Safari',
  'Android (Samsung), Chrome',
  'iPad, Safari',
  'Desktop, Firefox',
  'Desktop, Chrome',
];

// Submit the same flow test for each device
const testCases = await Promise.all(
  devices.map(device =>
    submitFlowTest({
      title: \`Checkout flow - \${device}\`,
      template: 'flow_test',
      url: 'https://staging.yourapp.com/checkout',
      steps: checkoutSteps,
      expected_result: 'Checkout completes on all devices',
      device_requirements: device,
    })
  )
);`}</pre>

            <h3 style={S.h3}>5. Regression Testing with Human Judgment</h3>
            <p>
              Some regressions are invisible to automated tests. A CSS change that technically passes visual regression (pixel difference below threshold) but makes text noticeably harder to read. A performance change that does not trigger a Lighthouse regression but makes the app feel sluggish on mobile. Submit review tests after major refactors to catch the regressions that humans notice and automated tools miss.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── SECTION 5: API VS DASHBOARD ── */}
          <section id="api-vs-dashboard" style={S.section}>
            <h2 style={S.h2}>API vs Dashboard: Why API-First Matters</h2>
            <p>
              BlendedAgents provides both an API and a web dashboard for managing test cases. The dashboard is useful for reviewing results, managing testers, and configuring settings. But the API is the primary interface &mdash; and this is by design.
            </p>
            <p>
              <strong>The API is for machines. The dashboard is for humans reviewing what machines did.</strong>
            </p>
            <p>
              In an agentic QA world, the primary consumer of a QA platform is not a human project manager clicking through a dashboard. It is an AI agent making API calls. The agent does not need a UI to submit test cases, check status, or process results. It needs a well-documented, structured API that returns typed data it can act on.
            </p>
            <p>
              This is why BlendedAgents is built API-first:
            </p>
            <ul style={S.ul}>
              <li style={S.li}><strong>Every action is available via API.</strong> Anything you can do in the dashboard, you can do via API. The dashboard is built on the same API.</li>
              <li style={S.li}><strong>Structured input and output.</strong> Test case submissions and results are typed JSON. No unstructured fields, no free-text-only responses.</li>
              <li style={S.li}><strong>MCP native.</strong> The MCP server wraps the API for direct integration with AI coding agents. Zero HTTP boilerplate.</li>
              <li style={S.li}><strong>Webhook-ready.</strong> Asynchronous result delivery via webhooks for production integrations that cannot poll.</li>
              <li style={S.li}><strong>Credit-based pricing.</strong> Pay per test, no subscriptions, no sales calls. Top up credits via API. The AI agent can manage its own testing budget.</li>
            </ul>
            <p>
              The dashboard complements the API for cases where a human developer wants to review results visually, watch screen recordings, or manage account settings. But the center of gravity is the API &mdash; because the center of gravity in modern development is the AI agent, and AI agents speak JSON, not HTML.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── FAQ ── */}
          <section id="faq" style={{ marginTop: 48, borderTop: '1px solid #ece8f0', paddingTop: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Frequently Asked Questions</h2>

            <h3 style={S.h3}>What is a QA testing API?</h3>
            <p>
              A QA testing API lets you submit test cases programmatically and receive human-verified results back via structured JSON. Unlike Selenium Grid or BrowserStack which run automated scripts on remote browsers, a QA testing API dispatches tasks to real human testers who evaluate your software on real devices. <a href="/" style={S.link}>BlendedAgents</a> provides the first API designed specifically for this &mdash; submit a test case with a POST request, get structured pass/fail results with evidence.
            </p>

            <h3 style={S.h3}>How is a QA testing API different from BrowserStack or Selenium?</h3>
            <p>
              BrowserStack and Selenium execute automated scripts on remote browsers and devices. A QA testing API like BlendedAgents dispatches test cases to real human testers. Automated tools return assertion results (pass/fail on predefined checks). A human QA API returns subjective judgment &mdash; UX quality, accessibility, visual coherence, real-device behavior &mdash; things no automated script can evaluate.
            </p>

            <h3 style={S.h3}>Can AI agents use a QA testing API?</h3>
            <p>
              Yes. This is the primary use case. AI coding agents like Claude Code and Cursor can call the BlendedAgents API (or use the MCP server for native tool call integration) to submit test cases as part of their build-test-fix workflow. The agent writes code, submits to human verification via API, processes structured results, fixes issues, and resubmits &mdash; all autonomously. This is the <a href="/human-as-a-tool" style={S.link}>Human-as-a-Tool</a> pattern.
            </p>

            <h3 style={S.h3}>How do you integrate a QA testing API into CI/CD?</h3>
            <p>
              Add a step to your CI/CD pipeline that submits critical user journeys to the QA testing API after automated tests pass. Poll for results or configure webhooks. Gate the production deployment on human verification passing. This adds minutes to your pipeline, not hours, and catches the bugs that automated tests miss.
            </p>

            <h3 style={S.h3}>What results does a QA testing API return?</h3>
            <p>
              The BlendedAgents API returns structured JSON with: overall status (pass/fail), severity rating, per-step results with notes, tester observations, screen recording URL, screenshot URLs, device details, and reproduction steps. This format is designed for machine consumption &mdash; AI agents can parse and act on results without human interpretation.
            </p>
          </section>

          <hr style={S.hr} />

          {/* ── CLOSING CTA ── */}
          <section style={{ ...S.section, textAlign: 'center' }}>
            <h2 style={{ ...S.h2, marginTop: 0 }}>Start Using the QA Testing API</h2>
            <p>
              Three lines of code to get human QA. Submit a test case, get structured results, catch the bugs automation misses.
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
              <li style={{ marginBottom: 8 }}><a href="/glossary/human-as-a-tool" style={S.link}>Human-as-a-Tool &mdash; Glossary Definition</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/agentic-qa" style={S.link}>Agentic QA &mdash; Glossary Definition</a></li>
              <li style={{ marginBottom: 8 }}><a href="/skill.md" style={S.link}>API Documentation (skill.md)</a></li>
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
