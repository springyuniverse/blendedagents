import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-04-21');

  return [
    {
      url: 'https://blendedagents.com',
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://blendedagents.com/human-as-a-tool',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: 'https://blendedagents.com/skill.md',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://blendedagents.com/glossary/human-as-a-tool',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: 'https://blendedagents.com/glossary/agentic-qa',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: 'https://blendedagents.com/glossary/human-in-the-loop-testing',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: 'https://blendedagents.com/signup/builder',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://blendedagents.com/signup/tester',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://blendedagents.com/login',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
