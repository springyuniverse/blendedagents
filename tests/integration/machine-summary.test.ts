import { describe, it, expect } from 'vitest';
import { generateMachineSummary } from '../../src/services/summary.service.js';

// Integration tests for machine summary confidence scoring.
// These tests validate summary generation with realistic step outcome combinations.

describe('Machine Summary Integration', () => {
  it('produces correct confidence for a fully passing test', () => {
    const summary = generateMachineSummary({
      stepResults: [
        { step_index: 0, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 1, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 2, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 3, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 4, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
      ],
      testResult: { verdict: 'pass', recording_url: 'https://example.com/rec.mp4' },
      environment: { browser: 'Chrome 120', os: 'macOS 14' },
      startedAt: new Date('2026-01-01T10:00:00Z'),
      completedAt: new Date('2026-01-01T10:15:00Z'),
    });

    expect(summary.confidence).toBe(1.0);
    expect(summary.verdict).toBe('pass');
    expect(summary.passed_steps).toEqual([0, 1, 2, 3, 4]);
    expect(summary.failed_steps).toEqual([]);
    expect(summary.blocked_steps).toEqual([]);
    expect(summary.execution_minutes).toBe(15);
    expect(summary.recording_url).toBe('https://example.com/rec.mp4');
    expect(summary.environment).toEqual({ browser: 'Chrome 120', os: 'macOS 14' });
  });

  it('produces correct confidence for a realistic failed test', () => {
    const summary = generateMachineSummary({
      stepResults: [
        { step_index: 0, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 1, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 2, status: 'failed', severity: 'critical', actual_behavior: 'Login form did not submit', screenshot_url: 'https://s3/shot1.png' },
        { step_index: 3, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 4, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
      ],
      testResult: { verdict: 'fail', recording_url: null },
      environment: { browser: 'Firefox 121', os: 'Ubuntu 22.04' },
      startedAt: new Date('2026-01-01T10:00:00Z'),
      completedAt: new Date('2026-01-01T10:08:00Z'),
    });

    // 1.0 - 0.4 (critical) - 0.15 (blocked) - 0.15 (blocked) = 0.3
    expect(summary.confidence).toBe(0.3);
    expect(summary.verdict).toBe('fail');
    expect(summary.passed_steps).toEqual([0, 1]);
    expect(summary.failed_steps).toHaveLength(1);
    expect(summary.failed_steps[0]).toEqual({
      index: 2,
      severity: 'critical',
      actual_behavior: 'Login form did not submit',
      evidence: ['https://s3/shot1.png'],
    });
    expect(summary.blocked_steps).toEqual([3, 4]);
    expect(summary.execution_minutes).toBe(8);
  });

  it('produces correct confidence for a partial test with minor issues', () => {
    const summary = generateMachineSummary({
      stepResults: [
        { step_index: 0, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 1, status: 'failed', severity: 'minor', actual_behavior: 'Wrong font size', screenshot_url: null },
        { step_index: 2, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 3, status: 'failed', severity: 'suggestion', actual_behavior: 'Could use better contrast', screenshot_url: null },
      ],
      testResult: { verdict: 'partial', recording_url: null },
      environment: {},
      startedAt: new Date('2026-01-01T10:00:00Z'),
      completedAt: new Date('2026-01-01T10:05:00Z'),
    });

    // 1.0 - 0.1 (minor) - 0.05 (suggestion) = 0.85
    expect(summary.confidence).toBe(0.85);
    expect(summary.verdict).toBe('partial');
    expect(summary.passed_steps).toEqual([0, 2]);
    expect(summary.failed_steps).toHaveLength(2);
  });

  it('handles catastrophic failure (confidence floors at 0)', () => {
    const summary = generateMachineSummary({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'critical', actual_behavior: 'App crashed on launch', screenshot_url: null },
        { step_index: 1, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 2, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 3, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 4, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 5, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 6, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
      ],
      testResult: { verdict: 'fail', recording_url: null },
      environment: {},
      startedAt: new Date('2026-01-01T10:00:00Z'),
      completedAt: new Date('2026-01-01T10:01:00Z'),
    });

    // 1.0 - 0.4 - (6 * 0.15) = 1.0 - 0.4 - 0.9 = -0.3 -> 0
    expect(summary.confidence).toBe(0);
    expect(summary.passed_steps).toEqual([]);
    expect(summary.failed_steps).toHaveLength(1);
    expect(summary.blocked_steps).toEqual([1, 2, 3, 4, 5, 6]);
  });

  // Placeholder: requires database to test with real TestResult/StepResult models
  it.todo('machine summary is stored in test_results.machine_summary column');

  // Placeholder: requires database
  it.todo('machine summary is included in webhook payload');
});
