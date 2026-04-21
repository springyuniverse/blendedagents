import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agentic QA Testing — Definition | BlendedAgents Glossary',
  description: 'Agentic QA testing is where AI agents autonomously manage the full quality assurance cycle — planning, dispatching, and acting on test results without human coordination. Definition and 2026 market outlook.',
  keywords: 'agentic QA testing, agentic testing 2026, agentic QA definition, AI QA testing, autonomous QA, AI agent testing',
  openGraph: {
    title: 'Agentic QA Testing — Definition | BlendedAgents Glossary',
    description: 'AI agents autonomously managing the full QA cycle. The $8.5B testing market is projected to reach $100B by 2033.',
    url: 'https://blendedagents.com/glossary/agentic-qa',
    siteName: 'BlendedAgents',
    type: 'article',
  },
  alternates: { canonical: 'https://blendedagents.com/glossary/agentic-qa' },
};

const defined_term_schema = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: 'Agentic QA Testing',
  description: 'A quality assurance approach where AI agents autonomously manage the full testing cycle — planning tests, dispatching execution (to automated scripts or human testers), analyzing results, and deciding next actions without human coordination.',
  url: 'https://blendedagents.com/glossary/agentic-qa',
  inDefinedTermSet: {
    '@type': 'DefinedTermSet',
    name: 'BlendedAgents Glossary',
    url: 'https://blendedagents.com/glossary/agentic-qa',
  },
};

const breadcrumb_schema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blendedagents.com' },
    { '@type': 'ListItem', position: 2, name: 'Glossary', item: 'https://blendedagents.com/glossary/agentic-qa' },
    { '@type': 'ListItem', position: 3, name: 'Agentic QA Testing', item: 'https://blendedagents.com/glossary/agentic-qa' },
  ],
};

export default function GlossaryAgenticQA() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(defined_term_schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb_schema) }} />

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1d1127', lineHeight: 1.7 }}>
        <nav style={{ fontSize: 14, color: '#6b5e7b', marginBottom: 32 }}>
          <a href="/" style={{ color: '#2ba185', textDecoration: 'none' }}>Home</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Glossary</span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Agentic QA Testing</span>
        </nav>

        <article>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Agentic QA Testing
          </h1>
          <p style={{ fontSize: 13, color: '#6b5e7b', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Glossary Definition
          </p>

          <section>
            <p style={{ fontSize: 18, color: '#3d3452' }}>
              <strong>Agentic QA testing</strong> is a quality assurance approach where AI agents autonomously manage the full testing cycle — planning tests, dispatching execution to automated scripts or human testers, analyzing results, and deciding next actions. The AI agent orchestrates everything; no human developer needs to coordinate the process.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>What Makes QA &ldquo;Agentic&rdquo;?</h2>
            <p>
              Traditional QA is human-driven: a QA engineer writes test plans, executes tests, logs bugs, and follows up. Automated testing added scripts that run predefined checks. Agentic QA goes further — the AI agent <em>owns</em> the entire cycle:
            </p>
            <ol style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 12 }}><strong>Planning</strong> — The agent analyzes code changes and decides what needs to be tested, without a human writing a test plan.</li>
              <li style={{ marginBottom: 12 }}><strong>Dispatching</strong> — The agent sends tests to automated test runners for functional checks and to <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>human testers via API</a> for subjective or real-device verification.</li>
              <li style={{ marginBottom: 12 }}><strong>Analyzing</strong> — The agent interprets results, correlates failures, identifies root causes, and prioritizes fixes.</li>
              <li style={{ marginBottom: 12 }}><strong>Acting</strong> — The agent fixes issues, resubmits for verification, or marks the feature as ready to ship.</li>
            </ol>
            <p>
              The word &ldquo;agentic&rdquo; means the AI system acts with agency — it makes decisions, takes actions, and drives the process forward rather than waiting for human instructions at each step.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Market Context (2026)</h2>
            <p>
              The AI-driven testing market is growing rapidly. According to coverage by Gartner and Tricentis, the software testing tools market — valued at approximately $8.5 billion in 2024 — is projected to grow toward $100 billion by 2033 as AI agents take over increasingly large portions of the QA workflow.
            </p>
            <p>
              This growth is driven by several converging factors: the explosion of AI-generated code (which needs proportionally more testing), the maturation of large language models that can reason about software behavior, and the emergence of platforms like <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> that give agents access to <a href="/human-as-a-tool" style={{ color: '#2ba185' }}>human judgment via API</a>.
            </p>
            <p>
              Agentic QA testing in 2026 sits at the intersection of two major shifts: AI agents writing more code than ever, and those same agents needing reliable ways to verify what they built — including subjective quality that only humans can evaluate.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Agentic QA vs Traditional QA</h2>
            <ul style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 12 }}>
                <strong>Traditional QA</strong> — Humans plan, execute, and report. Automated scripts handle regression. The process depends on human coordination at every stage.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>CI/CD Automated Testing</strong> — Scripts run on every commit. Fast for functional checks, but blind to subjective quality, real-device behavior, and UX feel.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Agentic QA</strong> — The AI agent orchestrates both automated checks and human verification. It decides what to test, dispatches work, processes results, and acts. The human tester is a <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>callable tool</a> in the agent&apos;s pipeline.
              </li>
            </ul>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>The Role of Human-as-a-Tool in Agentic QA</h2>
            <p>
              Pure automation cannot cover everything. Does the checkout flow <em>feel</em> right? Is the font readable on a cracked screen? Does the 200ms delay make the app feel sluggish? These are questions that require human judgment.
            </p>
            <p>
              The <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool</a> pattern solves this gap. Within an agentic QA pipeline, the agent dispatches subjective and real-device tests to vetted human testers via the <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> API. The humans execute the tests and return structured results. The agent processes them like any other tool output — no human developer in the loop.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Related Terms</h2>
            <ul style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><a href="/human-as-a-tool" style={{ color: '#2ba185' }}>What is Human-as-a-Tool? (Full Guide)</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool (Glossary)</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/human-in-the-loop-testing" style={{ color: '#2ba185' }}>Human-in-the-Loop Testing</a></li>
              <li style={{ marginBottom: 8 }}><a href="/signup/builder" style={{ color: '#2ba185' }}>Try BlendedAgents Free</a></li>
            </ul>
          </section>
        </article>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #ece8f0', fontSize: 13, color: '#6b5e7b', textAlign: 'center' }}>
          <p>&copy; {new Date().getFullYear()} BlendedAgents. The first Human-as-a-Tool platform for AI agents.</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <a href="/" style={{ color: '#2ba185' }}>Home</a>
            <a href="/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool</a>
            <a href="/glossary/human-as-a-tool" style={{ color: '#2ba185' }}>Glossary</a>
          </div>
        </footer>
      </div>
    </>
  );
}
