import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-04-21');
  const base = 'https://blendedagents.com';

  return [
    // Homepage
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1.0 },

    // Core concept page
    { url: `${base}/human-as-a-tool`, lastModified, changeFrequency: 'monthly', priority: 0.95 },

    // API docs
    { url: `${base}/skill.md`, lastModified, changeFrequency: 'weekly', priority: 0.9 },

    // Guides
    { url: `${base}/guides/testing-ai-generated-code`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/guides/human-in-the-loop-testing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/guides/agentic-qa-testing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/guides/qa-testing-api`, lastModified, changeFrequency: 'monthly', priority: 0.9 },

    // Competitor comparisons
    { url: `${base}/compare/testlio`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/compare/qa-wolf`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/compare/applause`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/compare/browserstack`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/compare/rainforest-qa`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/compare/test-io`, lastModified, changeFrequency: 'monthly', priority: 0.85 },

    // Glossary
    { url: `${base}/glossary/human-as-a-tool`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/glossary/agentic-qa`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/glossary/human-in-the-loop-testing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },

    // Signup/Login
    { url: `${base}/signup/builder`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/signup/tester`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/login`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
