import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_t5uBPfayXn5nvuotJhoDVabLe8eKycTZ7wxLMEizvYNS';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (typeof window === 'undefined' || initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
  initialized = true;
}

export function identifyUser(id: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.identify(id, properties);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

export function resetUser() {
  if (typeof window === 'undefined') return;
  posthog.reset();
}

export { posthog };
