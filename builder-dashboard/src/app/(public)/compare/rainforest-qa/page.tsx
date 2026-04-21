import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BlendedAgents vs Rainforest QA | Where Rainforest Users Go Next',
  description: 'Rainforest QA shut down in 2024. BlendedAgents offers API-first human QA testing for teams that need a modern alternative. No-code test creation via AI.',
  keywords: 'Rainforest QA alternative, Rainforest QA replacement, Rainforest QA shutdown, Rainforest QA migration',
  openGraph: {
    title: 'BlendedAgents vs Rainforest QA | Where Rainforest Users Go Next',
    description: 'Rainforest QA shut down in 2024. BlendedAgents offers API-first human QA testing for teams that need a modern alternative.',
    url: 'https://blendedagents.com/compare/rainforest-qa',
    siteName: 'BlendedAgents',
    type: 'article',
  },
  alternates: { canonical: 'https://blendedagents.com/compare/rainforest-qa' },
  other: { 'article:modified_time': new Date().toISOString() },
};

const faq_schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What happened to Rainforest QA?',
      acceptedAnswer: { '@type': 'Answer', text: 'Rainforest QA was acquired and subsequently shut down its testing platform in 2024. Teams that relied on Rainforest for hybrid human-automated QA testing need to find alternative solutions. BlendedAgents offers a modern replacement with an API-first approach and AI agent integration.' },
    },
    {
      '@type': 'Question',
      name: 'How is BlendedAgents different from Rainforest QA?',
      acceptedAnswer: { '@type': 'Answer', text: 'Rainforest QA used a GUI-based test authoring tool with a hybrid crowd-automation approach. BlendedAgents is API-first, meaning you submit test cases via REST API or MCP tool calls rather than building them in a visual editor. BlendedAgents also supports AI agent integration, returning structured JSON results that coding agents like Claude and Cursor can process automatically.' },
    },
    {
      '@type': 'Question',
      name: 'How do I migrate from Rainforest QA to BlendedAgents?',
      acceptedAnswer: { '@type': 'Answer', text: 'Since Rainforest QA used GUI-authored test steps, migration involves translating your existing test scenarios into API-submitted test cases. Sign up for BlendedAgents, get an API key, and start submitting test cases based on your existing Rainforest test documentation. The process takes minutes, not weeks.' },
    },
    {
      '@type': 'Question',
      name: 'Does BlendedAgents have a visual test editor like Rainforest QA?',
      acceptedAnswer: { '@type': 'Answer', text: 'BlendedAgents is API-first by design. Instead of a visual test editor, you submit test cases via REST API or MCP tool calls. Your AI coding agent can craft and submit test cases programmatically. This approach is more powerful for automation and AI integration, though it requires a different workflow than Rainforest\'s GUI-based approach.' },
    },
  ],
};

const breadcrumb_schema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blendedagents.com' },
    { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://blendedagents.com/compare' },
    { '@type': 'ListItem', position: 3, name: 'vs Rainforest QA', item: 'https://blendedagents.com/compare/rainforest-qa' },
  ],
};

export default function CompareRainforestQAPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb_schema) }} />

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1d1127', lineHeight: 1.7 }}>
        <nav style={{ fontSize: 14, color: '#6b5e7b', marginBottom: 32 }}>
          <a href="/" style={{ color: '#2ba185', textDecoration: 'none' }}>Home</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <a href="/compare" style={{ color: '#2ba185', textDecoration: 'none' }}>Compare</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>vs Rainforest QA</span>
        </nav>

        <article>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            BlendedAgents vs Rainforest QA
          </h1>

          <p style={{ fontSize: 18, color: '#3d3452' }}>
            <strong>Rainforest QA</strong> was a popular QA testing platform that combined human crowd testers with automated testing through a visual test editor. Teams could author test cases in a GUI, and Rainforest would dispatch them to a hybrid pool of crowd workers and automated systems. In 2024, Rainforest QA was acquired and subsequently shut down its testing platform, leaving thousands of teams without their QA solution.
          </p>
          <p>
            If you were a Rainforest QA customer looking for what comes next, <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> offers a modern alternative built for the AI-first era. Instead of GUI-authored tests dispatched to anonymous crowds, BlendedAgents provides an API-first platform where your AI coding agent or your team submits structured test cases and gets structured JSON results from vetted human testers.
          </p>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>What Rainforest QA Offered</h2>
            <p>
              Before its shutdown, Rainforest QA was known for several key features:
            </p>
            <ul style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}><strong>Visual test authoring.</strong> A GUI-based editor where you built test cases by describing steps in plain English. No coding required.</li>
              <li style={{ marginBottom: 8 }}><strong>Hybrid crowd + automation.</strong> Rainforest dispatched tests to a mix of human crowd workers and automated systems, trying to balance speed with human judgment.</li>
              <li style={{ marginBottom: 8 }}><strong>CI/CD integration.</strong> Tests could run as part of your deployment pipeline, blocking deploys on failures.</li>
              <li style={{ marginBottom: 8 }}><strong>Pricing from $300+/month.</strong> Plans started at $300/month for smaller teams and scaled with usage and features.</li>
              <li style={{ marginBottom: 8 }}><strong>No-code approach.</strong> The platform was designed for teams without dedicated QA automation engineers.</li>
            </ul>
            <p>
              Rainforest filled an important gap: teams that needed human QA but did not have the engineering resources to build and maintain automated test suites. Its shutdown left a void for teams that valued human testing but wanted something easier than managing a full QA team.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>How BlendedAgents Fills the Gap</h2>
            <p>
              BlendedAgents picks up where Rainforest left off, but built for 2026 instead of 2018. Here is what is different:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 15 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ece8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Feature</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Rainforest QA (was)</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>BlendedAgents</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Status</td>
                  <td style={{ padding: '10px 16px' }}>Shut down (2024)</td>
                  <td style={{ padding: '10px 16px' }}>Active and growing</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Test authoring</td>
                  <td style={{ padding: '10px 16px' }}>GUI visual editor</td>
                  <td style={{ padding: '10px 16px' }}>API-first (REST + MCP)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>AI agent support</td>
                  <td style={{ padding: '10px 16px' }}>None</td>
                  <td style={{ padding: '10px 16px' }}>Built-in (Claude, Cursor, any MCP client)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Testers</td>
                  <td style={{ padding: '10px 16px' }}>Anonymous crowd workers</td>
                  <td style={{ padding: '10px 16px' }}>Invite-only vetted testers</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Results format</td>
                  <td style={{ padding: '10px 16px' }}>Pass/fail in dashboard</td>
                  <td style={{ padding: '10px 16px' }}>Structured JSON, severity, screenshots, recordings</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Pricing</td>
                  <td style={{ padding: '10px 16px' }}>$300+/month plans</td>
                  <td style={{ padding: '10px 16px' }}>Pay-per-credit, no minimum</td>
                </tr>
              </tbody>
            </table>

            <p style={{ marginTop: 24 }}>
              The biggest shift is the move from GUI-based test authoring to API-first submission. Rainforest was built for a world where humans wrote tests in visual editors. BlendedAgents is built for a world where AI agents craft and submit test cases programmatically. Your Claude Code or Cursor agent builds a feature, writes a test case, submits it via API, and processes the structured results, all without a human developer touching a dashboard.
            </p>
            <p>
              This is the <a href="/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool</a> paradigm: AI agents orchestrate human testers through structured APIs, treating them as callable tools in an automated pipeline.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Migration Tips for Rainforest QA Users</h2>
            <p>
              If you are coming from Rainforest QA, here is how to get started with BlendedAgents:
            </p>
            <ol style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 12 }}>
                <strong>Export your test documentation.</strong> If you saved your Rainforest test cases (steps, expected results, URLs), those descriptions can directly inform the test cases you submit to BlendedAgents.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Sign up and get an API key.</strong> BlendedAgents is self-serve. No sales calls, no onboarding meetings. Sign up at <a href="/signup/builder" style={{ color: '#2ba185' }}>/signup/builder</a> and get your API key in minutes.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Submit your first test case.</strong> Send a POST request with the URL to test, steps to follow, and what to verify. Or configure the MCP server in Claude Desktop or Cursor and submit tests as tool calls.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Review structured results.</strong> Unlike Rainforest&apos;s dashboard-only results, BlendedAgents returns pass/fail per step, severity ratings, screenshots, and screen recordings as typed JSON. Your agent or your dashboard can process these immediately.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Integrate with your AI workflow.</strong> If you use AI coding tools, configure them to dispatch test cases to BlendedAgents automatically after building features. This is the key upgrade over Rainforest: your AI agent handles the entire QA cycle.
              </li>
            </ol>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>What Rainforest Got Right</h2>
            <p>
              Rainforest QA pioneered several ideas that BlendedAgents builds on:
            </p>
            <ul style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}><strong>Human testers matter.</strong> Rainforest understood that automated testing alone is not enough. Human judgment catches issues that no script can detect.</li>
              <li style={{ marginBottom: 8 }}><strong>No-code test creation.</strong> Making test creation accessible to non-engineers was the right instinct. BlendedAgents takes this further by letting AI agents author tests.</li>
              <li style={{ marginBottom: 8 }}><strong>On-demand testing.</strong> The idea of dispatching tests to a pool of testers on demand, rather than maintaining a full-time QA team, is sound. BlendedAgents scales this with <a href="/glossary/agentic-qa" style={{ color: '#2ba185' }}>agentic QA</a>.</li>
            </ul>
            <p>
              Where Rainforest fell short was in not building for the API-first, AI-agent future. Their GUI-based approach required humans to author and manage tests, which created a bottleneck that AI agents can now eliminate.
            </p>
            <p style={{ marginTop: 24 }}>
              <a href="/signup/builder" style={{ display: 'inline-block', background: '#2ba185', color: '#fff', padding: '12px 28px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 15 }}>
                Try BlendedAgents Free
              </a>
            </p>
          </section>

          <section style={{ marginTop: 48, borderTop: '1px solid #ece8f0', paddingTop: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Frequently Asked Questions</h2>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>What happened to Rainforest QA?</h3>
            <p>Rainforest QA was acquired and subsequently shut down its testing platform in 2024. Teams that relied on Rainforest for hybrid human-automated QA testing need to find alternative solutions. BlendedAgents offers a modern replacement with an API-first approach and AI agent integration.</p>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>How is BlendedAgents different from Rainforest QA?</h3>
            <p>Rainforest QA used a GUI-based test authoring tool with a hybrid crowd-automation approach. BlendedAgents is API-first, meaning you submit test cases via REST API or MCP tool calls rather than building them in a visual editor. BlendedAgents also supports AI agent integration, returning structured JSON results that coding agents like Claude and Cursor can process automatically.</p>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>How do I migrate from Rainforest QA to BlendedAgents?</h3>
            <p>Since Rainforest QA used GUI-authored test steps, migration involves translating your existing test scenarios into API-submitted test cases. Sign up for <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>BlendedAgents</a>, get an API key, and start submitting test cases based on your existing Rainforest test documentation. The process takes minutes, not weeks.</p>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>Does BlendedAgents have a visual test editor like Rainforest QA?</h3>
            <p>BlendedAgents is API-first by design. Instead of a visual test editor, you submit test cases via REST API or MCP tool calls. Your AI coding agent can craft and submit test cases programmatically. This approach is more powerful for automation and AI integration, though it requires a different workflow than Rainforest&apos;s GUI-based approach.</p>
          </section>

          <section style={{ marginTop: 40, fontSize: 14, color: '#6b5e7b' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1127' }}>Related</h2>
            <ul style={{ paddingLeft: 20 }}>
              <li><a href="/human-as-a-tool" style={{ color: '#2ba185' }}>What is Human-as-a-Tool?</a></li>
              <li><a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Glossary: Human-as-a-Tool</a></li>
              <li><a href="/glossary/agentic-qa" style={{ color: '#2ba185' }}>Glossary: Agentic QA</a></li>
              <li><a href="/signup/builder" style={{ color: '#2ba185' }}>Sign Up as a Builder</a></li>
            </ul>
          </section>
        </article>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #ece8f0', fontSize: 13, color: '#6b5e7b', textAlign: 'center' }}>
          <p>&copy; {new Date().getFullYear()} BlendedAgents. The first Human-as-a-Tool platform for AI agents.</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/" style={{ color: '#2ba185' }}>Home</a>
            <a href="/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool</a>
            <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Glossary</a>
            <a href="/signup/builder" style={{ color: '#2ba185' }}>Sign Up</a>
          </div>
        </footer>
      </div>
    </>
  );
}
