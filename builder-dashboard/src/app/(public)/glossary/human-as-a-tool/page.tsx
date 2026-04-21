import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Human-as-a-Tool — Definition | BlendedAgents Glossary',
  description: 'Human-as-a-Tool is a software architecture pattern where AI agents invoke human capabilities through structured APIs. Full definition, origin, and how it differs from human-in-the-loop.',
  keywords: 'human as a tool, human-as-a-tool definition, human as a tool meaning, AI agent human API, human tool pattern',
  openGraph: {
    title: 'Human-as-a-Tool — Definition | BlendedAgents Glossary',
    description: 'The paradigm where AI agents call humans via API — like any other tool in their pipeline. Coined by BlendedAgents in 2026.',
    url: 'https://blendedagents.com/glossary/human-as-a-tool',
    siteName: 'BlendedAgents',
    type: 'article',
  },
  alternates: { canonical: 'https://blendedagents.com/glossary/human-as-a-tool' },
};

const defined_term_schema = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: 'Human-as-a-Tool',
  description: 'A software architecture pattern where AI agents invoke human capabilities through structured APIs, treating humans as callable tools in an automated pipeline.',
  url: 'https://blendedagents.com/glossary/human-as-a-tool',
  inDefinedTermSet: {
    '@type': 'DefinedTermSet',
    name: 'BlendedAgents Glossary',
    url: 'https://blendedagents.com/glossary/human-as-a-tool',
  },
};

const breadcrumb_schema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://blendedagents.com' },
    { '@type': 'ListItem', position: 2, name: 'Glossary', item: 'https://blendedagents.com/glossary/human-as-a-tool' },
    { '@type': 'ListItem', position: 3, name: 'Human-as-a-Tool', item: 'https://blendedagents.com/glossary/human-as-a-tool' },
  ],
};

export default function GlossaryHumanAsATool() {
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
          <span>Human-as-a-Tool</span>
        </nav>

        <article>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Human-as-a-Tool
          </h1>
          <p style={{ fontSize: 13, color: '#6b5e7b', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Glossary Definition
          </p>

          <section>
            <p style={{ fontSize: 18, color: '#3d3452' }}>
              <strong>Human-as-a-Tool</strong> is a software architecture pattern where AI agents invoke human capabilities through structured APIs, treating humans as callable tools in an automated pipeline. The AI decides when human judgment is needed, dispatches the request programmatically, and processes the structured response — without any manual coordination by a developer.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Etymology and Origin</h2>
            <p>
              The term <strong>Human-as-a-Tool</strong> was coined by <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> in 2026 to describe a paradigm shift in how AI systems interact with people. The name deliberately mirrors established patterns in AI agent architecture — &ldquo;tool use&rdquo; refers to an agent calling external functions (web search, code execution, database queries). Human-as-a-Tool extends this concept: the human becomes another function the agent can call, with structured input and structured output.
            </p>
            <p>
              The pattern emerged from the realization that roughly 20% of software quality depends on subjective human judgment that no AI can replicate. Rather than bolting human review onto the end of an automated pipeline, Human-as-a-Tool integrates human judgment <em>inside</em> the pipeline as a first-class callable resource.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>How It Differs from Human-in-the-Loop</h2>
            <p>
              The two concepts are related but describe fundamentally different power dynamics between humans and AI:
            </p>
            <ul style={{ paddingLeft: 24 }}>
              <li style={{ marginBottom: 12 }}>
                <strong><a href="/glossary/human-in-the-loop-testing" style={{ color: '#2ba185' }}>Human-in-the-Loop (HITL)</a></strong> — The human supervises the AI. The human reviews AI output, corrects mistakes, approves actions, and stays in the decision loop. The human is the orchestrator; the AI is the assistant.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Human-on-the-Loop (HOTL)</strong> — The human monitors from a distance. The AI operates autonomously but a human can intervene when needed. The human is the safety net; the AI drives.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Human-as-a-Tool (HaaT)</strong> — The AI orchestrates everything. When the agent needs something only a human can provide — subjective judgment, real-device interaction, creative evaluation — it calls a human via API, receives structured results, and continues its pipeline. The human is the tool; the AI is the orchestrator.
              </li>
            </ul>
            <p>
              The key distinction is <strong>who holds the baton</strong>. In HITL, the human holds it. In Human-as-a-Tool, the AI agent holds it and passes specific, bounded tasks to humans when needed.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Practical Example</h2>
            <p>
              An AI coding agent (such as Claude Code or Cursor) finishes building a checkout flow. It cannot tell whether the flow <em>feels</em> right on a real phone. So it calls the <a href="/" style={{ color: '#2ba185' }}>BlendedAgents</a> API — a single POST request — describing what needs to be tested. A vetted human tester picks up the task, tests it on a real device, records their screen, and returns structured JSON: pass/fail per step, severity ratings, screenshots. The agent parses these results and decides whether to fix issues or ship.
            </p>
            <p>
              No human developer coordinated this. The AI agent made the decision, dispatched the work, and processed the results autonomously. That is <a href="/human-as-a-tool" style={{ color: '#2ba185' }}>Human-as-a-Tool</a> in practice.
            </p>
          </section>

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>Related Terms</h2>
            <ul style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><a href="/human-as-a-tool" style={{ color: '#2ba185' }}>What is Human-as-a-Tool? (Full Guide)</a></li>
              <li style={{ marginBottom: 8 }}><a href="/glossary/agentic-qa" style={{ color: '#2ba185' }}>Agentic QA Testing</a></li>
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
