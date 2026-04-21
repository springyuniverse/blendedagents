import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What is Human-as-a-Tool? Definition, Examples & How It Works | BlendedAgents',
  description: 'Human-as-a-Tool is a software architecture pattern where AI agents invoke human capabilities through structured APIs. Learn how BlendedAgents implements it for QA testing.',
  keywords: 'human as a tool, human-as-a-tool, AI agent human API, human verification API, human in the loop, agentic QA, human tool for AI',
  openGraph: {
    title: 'What is Human-as-a-Tool? | BlendedAgents',
    description: 'The paradigm where AI agents call humans via API — like any other tool in their pipeline.',
    url: 'https://blendedagents.com/human-as-a-tool',
    siteName: 'BlendedAgents',
    type: 'article',
  },
  alternates: { canonical: 'https://blendedagents.com/human-as-a-tool' },
  other: { 'article:modified_time': new Date().toISOString() },
};

const defined_term_schema = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: 'Human-as-a-Tool',
  description: 'A software architecture pattern where AI agents invoke human capabilities through structured APIs, treating humans as callable tools in an automated pipeline.',
  url: 'https://blendedagents.com/human-as-a-tool',
  inDefinedTermSet: {
    '@type': 'DefinedTermSet',
    name: 'AI Agent Architecture Glossary',
    url: 'https://blendedagents.com/glossary/human-as-a-tool',
  },
};

const faq_schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Human-as-a-Tool?',
      acceptedAnswer: { '@type': 'Answer', text: 'Human-as-a-Tool is a software architecture pattern where AI agents invoke human capabilities through structured APIs. Instead of humans supervising AI, the AI orchestrates human judgment when it needs verification, subjective evaluation, or real-world interaction that automation cannot provide.' },
    },
    {
      '@type': 'Question',
      name: 'How is Human-as-a-Tool different from Human-in-the-Loop?',
      acceptedAnswer: { '@type': 'Answer', text: 'In human-in-the-loop, humans supervise and correct AI output. In Human-as-a-Tool, the AI is the orchestrator — it decides when to call a human, what to ask, and how to use the response. The human is a tool in the agent\'s pipeline, not an overseer.' },
    },
    {
      '@type': 'Question',
      name: 'What are examples of Human-as-a-Tool?',
      acceptedAnswer: { '@type': 'Answer', text: 'QA testing (AI agent submits test cases to human testers via API), content judgment (AI asks humans to rate quality), accessibility audits (humans verify screen reader compatibility), and real-device verification (humans test on physical phones and tablets).' },
    },
    {
      '@type': 'Question',
      name: 'Who invented Human-as-a-Tool?',
      acceptedAnswer: { '@type': 'Answer', text: 'The term "Human-as-a-Tool" was coined by BlendedAgents in 2026 to describe the paradigm of AI agents programmatically dispatching tasks to humans via API. BlendedAgents is the first platform implementing this pattern, starting with QA testing.' },
    },
  ],
};

const breadcrumb_schema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blendedagents.com' },
    { '@type': 'ListItem', position: 2, name: 'Human-as-a-Tool', item: 'https://blendedagents.com/human-as-a-tool' },
  ],
};

const speakable_schema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'What is Human-as-a-Tool?',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['#definition', '#how-it-differs'],
  },
  url: 'https://blendedagents.com/human-as-a-tool',
};

export default function HumanAsAToolPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(defined_term_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakable_schema) }} />

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1d1127', lineHeight: 1.7 }}>
        <nav style={{ fontSize: 14, color: '#6b5e7b', marginBottom: 32 }}>
          <a href="/" style={{ color: '#2ba185', textDecoration: 'none' }}>Home</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Human-as-a-Tool</span>
        </nav>

        <article>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            What is Human-as-a-Tool?
          </h1>

          <section id="definition">
            <p style={{ fontSize: 18, color: '#3d3452' }}>
              <strong>Human-as-a-Tool</strong> is a software architecture pattern where AI agents invoke human capabilities through structured APIs, treating humans as callable tools in an automated pipeline. Instead of humans supervising AI, the AI orchestrates human judgment when it needs verification, subjective evaluation, or real-world interaction that automation cannot provide.
            </p>
            <p>
              The concept was pioneered by <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> in 2026. It represents a fundamental shift in how AI systems interact with humans: rather than humans managing AI, AI agents programmatically request human input the same way they call any other API — with structured input, structured output, and no manual coordination.
            </p>
          </section>

          <section id="how-it-differs" style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Human-as-a-Tool vs Human-in-the-Loop</h2>
            <p>
              These terms are related but describe fundamentally different relationships between humans and AI:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 15 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ece8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Aspect</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Human-in-the-Loop</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Human-as-a-Tool</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Who orchestrates?</td>
                  <td style={{ padding: '10px 16px' }}>The human</td>
                  <td style={{ padding: '10px 16px' }}>The AI agent</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Human role</td>
                  <td style={{ padding: '10px 16px' }}>Supervisor, approver</td>
                  <td style={{ padding: '10px 16px' }}>Callable tool, executor</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Invocation</td>
                  <td style={{ padding: '10px 16px' }}>Manual triggers, dashboards</td>
                  <td style={{ padding: '10px 16px' }}>API call, MCP tool call</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Output format</td>
                  <td style={{ padding: '10px 16px' }}>Unstructured feedback</td>
                  <td style={{ padding: '10px 16px' }}>Structured JSON, typed results</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ece8f0' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>Scalability</td>
                  <td style={{ padding: '10px 16px' }}>Limited by human bandwidth</td>
                  <td style={{ padding: '10px 16px' }}>Elastic — pool of vetted humans</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>When it runs</td>
                  <td style={{ padding: '10px 16px' }}>When the human is available</td>
                  <td style={{ padding: '10px 16px' }}>24/7 — the agent dispatches on demand</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Why Human-as-a-Tool Matters</h2>
            <p>
              AI agents are increasingly capable of writing code, generating content, and making decisions. But roughly 20% of software quality depends on subjective human judgment that no AI can replicate: Does this checkout flow <em>feel</em> right? Is this font readable on a cracked Android screen? Does the 200ms delay make the app feel sluggish?
            </p>
            <p>
              Human-as-a-Tool solves this by giving AI agents a way to call in human judgment on demand — programmatically, without requiring a human developer to coordinate the process. The agent decides when it needs a human, crafts the request, dispatches it via API, and processes the structured results when they come back.
            </p>
            <p>
              This is the foundation of what analysts call <a href="/glossary/agentic-qa" style={{ color: '#2ba185' }}>agentic QA testing</a> — a new category where AI agents autonomously manage the full quality assurance cycle, including dispatching work to humans.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>How Human-as-a-Tool Works in Practice</h2>
            <p>Here is the typical flow when an AI coding agent uses Human-as-a-Tool for QA testing:</p>
            <ol style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 12 }}><strong>Agent builds a feature</strong> — using Claude Code, Cursor, or any AI coding tool.</li>
              <li style={{ marginBottom: 12 }}><strong>Agent crafts a test case</strong> — describing what needs to be verified, with specific steps or areas of focus.</li>
              <li style={{ marginBottom: 12 }}><strong>Agent submits via API</strong> — a single POST request to the <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> platform, or an MCP tool call from Claude Desktop or Cursor.</li>
              <li style={{ marginBottom: 12 }}><strong>A vetted human tester picks it up</strong> — opens the app on a real device, follows the test instructions, records their screen.</li>
              <li style={{ marginBottom: 12 }}><strong>Structured results flow back</strong> — pass/fail per step, severity ratings, screenshots, screen recordings. All as typed JSON.</li>
              <li style={{ marginBottom: 12 }}><strong>Agent acts on the results</strong> — fixes issues, resubmits for verification, or marks the feature as ready to ship.</li>
            </ol>
            <p>
              The entire loop can happen without a human developer touching anything. The AI agent is the orchestrator. The human tester is the tool.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Use Cases Beyond QA Testing</h2>
            <p>
              While <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> starts with QA testing — the most immediate need — the Human-as-a-Tool pattern applies wherever AI needs human judgment:
            </p>
            <ul style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}><strong>Content quality judgment</strong> — AI generates content, humans rate whether it sounds natural and accurate.</li>
              <li style={{ marginBottom: 8 }}><strong>Accessibility audits</strong> — humans verify screen reader compatibility, keyboard navigation, color contrast on real devices.</li>
              <li style={{ marginBottom: 8 }}><strong>Real-device testing</strong> — humans test on physical phones, tablets, and browsers that emulators miss.</li>
              <li style={{ marginBottom: 8 }}><strong>Subjective UX evaluation</strong> — "Does this feel fast?" is a question only a human can answer.</li>
              <li style={{ marginBottom: 8 }}><strong>Data labeling and validation</strong> — AI agents dispatch labeling tasks to humans as part of training pipelines.</li>
            </ul>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>The BlendedAgents Implementation</h2>
            <p>
              <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> is the first platform built on the Human-as-a-Tool paradigm. It provides:
            </p>
            <ul style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}><strong>REST API</strong> — submit test cases with a single POST request. Three lines of code to get human QA.</li>
              <li style={{ marginBottom: 8 }}><strong>MCP server</strong> — Claude Desktop and Cursor can dispatch tests as a tool call. Paste one JSON block into your config.</li>
              <li style={{ marginBottom: 8 }}><strong>Vetted tester network</strong> — invite-only, every tester is referred and vetted. Not random crowd workers.</li>
              <li style={{ marginBottom: 8 }}><strong>Screen recordings</strong> — every test includes a recording of exactly what the tester did.</li>
              <li style={{ marginBottom: 8 }}><strong>Structured results</strong> — pass/fail, severity ratings, screenshots. All as typed JSON your agent can parse.</li>
              <li style={{ marginBottom: 8 }}><strong>Credit-based pricing</strong> — pay per test, no subscriptions, no sales calls.</li>
            </ul>
            <p style={{ marginTop: 24 }}>
              <a href="/signup/builder" style={{ display: 'inline-block', background: '#2ba185', color: '#fff', padding: '12px 28px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 15 }}>
                Try BlendedAgents Free
              </a>
            </p>
          </section>

          <section style={{ marginTop: 48, borderTop: '1px solid #ece8f0', paddingTop: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Frequently Asked Questions</h2>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>What is Human-as-a-Tool?</h3>
            <p>Human-as-a-Tool is a software architecture pattern where AI agents invoke human capabilities through structured APIs. Instead of humans supervising AI, the AI orchestrates human judgment when it needs verification, subjective evaluation, or real-world interaction that automation cannot provide.</p>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>How is Human-as-a-Tool different from Human-in-the-Loop?</h3>
            <p>In <a href="/glossary/human-in-the-loop-testing" style={{ color: '#2ba185' }}>human-in-the-loop</a>, humans supervise and correct AI output. In Human-as-a-Tool, the AI is the orchestrator — it decides when to call a human, what to ask, and how to use the response. The human is a tool in the agent&apos;s pipeline, not an overseer.</p>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>What are examples of Human-as-a-Tool?</h3>
            <p>QA testing (AI agent submits test cases to human testers via API), content judgment (AI asks humans to rate quality), accessibility audits (humans verify screen reader compatibility), and real-device verification (humans test on physical phones and tablets).</p>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 24 }}>Who invented Human-as-a-Tool?</h3>
            <p>The term &ldquo;Human-as-a-Tool&rdquo; was coined by <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> in 2026 to describe the paradigm of AI agents programmatically dispatching tasks to humans via API. BlendedAgents is the first platform implementing this pattern, starting with QA testing.</p>
          </section>

          <section style={{ marginTop: 40, fontSize: 14, color: '#6b5e7b' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1127' }}>Related</h2>
            <ul style={{ paddingLeft: 20 }}>
              <li><a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Glossary: Human-as-a-Tool</a></li>
              <li><a href="/glossary/agentic-qa" style={{ color: '#2ba185' }}>Glossary: Agentic QA</a></li>
              <li><a href="/glossary/human-in-the-loop-testing" style={{ color: '#2ba185' }}>Glossary: Human-in-the-Loop Testing</a></li>
              <li><a href="/skill.md" style={{ color: '#2ba185' }}>API Documentation (skill.md)</a></li>
            </ul>
          </section>
        </article>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #ece8f0', fontSize: 13, color: '#6b5e7b', textAlign: 'center' }}>
          <p>&copy; {new Date().getFullYear()} BlendedAgents. The first Human-as-a-Tool platform for AI agents.</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <a href="/" style={{ color: '#2ba185' }}>Home</a>
            <a href="/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool</a>
            <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Glossary</a>
            <a href="/skill.md" style={{ color: '#2ba185' }}>API Docs</a>
          </div>
        </footer>
      </div>
    </>
  );
}
