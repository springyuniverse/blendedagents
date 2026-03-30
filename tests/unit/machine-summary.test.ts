import { describe, it, expect } from 'vitest';
import { generateMachineSummary, type StepResultInput } from '../../src/services/summary.service.js';

function makeParams(overrides: {
  stepResults?: StepResultInput[];
  verdict?: string;
  recordingUrl?: string | null;
  environment?: Record<string, string>;
  startedAt?: Date;
  completedAt?: Date;
} = {}) {
  return {
    stepResults: overrides.stepResults ?? [],
    testResult: {
      verdict: overrides.verdict ?? 'pass',
      recording_url: overrides.recordingUrl ?? null,
    },
    environment: overrides.environment ?? {},
    startedAt: overrides.startedAt ?? new Date('2026-01-01T00:00:00Z'),
    completedAt: overrides.completedAt ?? new Date('2026-01-01T00:10:00Z'),
  };
}

describe('Machine Summary Generation', () => {
  it('returns confidence 1.0 when all steps pass', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 1, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 2, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
      ],
      verdict: 'pass',
    }));

    expect(result.confidence).toBe(1.0);
    expect(result.verdict).toBe('pass');
    expect(result.passed_steps).toEqual([0, 1, 2]);
    expect(result.failed_steps).toEqual([]);
    expect(result.blocked_steps).toEqual([]);
  });

  it('reduces confidence by 0.4 for a critical failure', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 1, status: 'failed', severity: 'critical', actual_behavior: 'Button unresponsive', screenshot_url: 'https://img/1.png' },
      ],
      verdict: 'fail',
    }));

    expect(result.confidence).toBe(0.6);
    expect(result.passed_steps).toEqual([0]);
    expect(result.failed_steps).toHaveLength(1);
    expect(result.failed_steps[0].index).toBe(1);
    expect(result.failed_steps[0].severity).toBe('critical');
    expect(result.failed_steps[0].actual_behavior).toBe('Button unresponsive');
    expect(result.failed_steps[0].evidence).toEqual(['https://img/1.png']);
  });

  it('reduces confidence by 0.2 for a major failure', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'major', actual_behavior: 'Wrong color', screenshot_url: null },
      ],
      verdict: 'fail',
    }));

    expect(result.confidence).toBe(0.8);
  });

  it('reduces confidence by 0.1 for a minor failure', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'minor', actual_behavior: 'Typo in label', screenshot_url: null },
      ],
      verdict: 'fail',
    }));

    expect(result.confidence).toBe(0.9);
  });

  it('reduces confidence by 0.05 for a suggestion', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'suggestion', actual_behavior: 'Could be better', screenshot_url: null },
      ],
      verdict: 'partial',
    }));

    expect(result.confidence).toBe(0.95);
  });

  it('reduces confidence by 0.15 for a blocked step', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
      ],
      verdict: 'blocked',
    }));

    expect(result.confidence).toBe(0.85);
    expect(result.blocked_steps).toEqual([0]);
  });

  it('accumulates penalties from multiple failures', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'critical', actual_behavior: 'Crash', screenshot_url: null },
        { step_index: 1, status: 'failed', severity: 'major', actual_behavior: 'Wrong output', screenshot_url: null },
        { step_index: 2, status: 'failed', severity: 'minor', actual_behavior: 'Typo', screenshot_url: null },
      ],
      verdict: 'fail',
    }));

    // 1.0 - 0.4 - 0.2 - 0.1 = 0.3
    expect(result.confidence).toBe(0.3);
    expect(result.failed_steps).toHaveLength(3);
  });

  it('floors confidence at 0.0 (never negative)', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'critical', actual_behavior: 'a', screenshot_url: null },
        { step_index: 1, status: 'failed', severity: 'critical', actual_behavior: 'b', screenshot_url: null },
        { step_index: 2, status: 'failed', severity: 'critical', actual_behavior: 'c', screenshot_url: null },
      ],
      verdict: 'fail',
    }));

    // 1.0 - 0.4 - 0.4 - 0.4 = -0.2 -> floored to 0.0
    expect(result.confidence).toBe(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('handles zero steps gracefully', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [],
      verdict: 'pass',
    }));

    expect(result.confidence).toBe(1.0);
    expect(result.passed_steps).toEqual([]);
    expect(result.failed_steps).toEqual([]);
    expect(result.blocked_steps).toEqual([]);
  });

  it('handles mixed passed/failed/blocked steps correctly', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 1, status: 'failed', severity: 'major', actual_behavior: 'Error', screenshot_url: null },
        { step_index: 2, status: 'blocked', severity: null, actual_behavior: null, screenshot_url: null },
        { step_index: 3, status: 'passed', severity: null, actual_behavior: null, screenshot_url: null },
      ],
      verdict: 'partial',
    }));

    // 1.0 - 0.2 - 0.15 = 0.65
    expect(result.confidence).toBe(0.65);
    expect(result.passed_steps).toEqual([0, 3]);
    expect(result.failed_steps).toHaveLength(1);
    expect(result.blocked_steps).toEqual([2]);
  });

  it('defaults unknown severity to major (0.2 penalty)', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: null, actual_behavior: 'Error', screenshot_url: null },
      ],
      verdict: 'fail',
    }));

    expect(result.confidence).toBe(0.8);
    expect(result.failed_steps[0].severity).toBe('major');
  });

  it('calculates execution_minutes correctly', () => {
    const result = generateMachineSummary(makeParams({
      startedAt: new Date('2026-01-01T00:00:00Z'),
      completedAt: new Date('2026-01-01T00:12:30Z'),
    }));

    expect(result.execution_minutes).toBe(12.5);
  });

  it('includes recording_url from test result', () => {
    const result = generateMachineSummary(makeParams({
      recordingUrl: 'https://storage.example.com/recording.mp4',
    }));

    expect(result.recording_url).toBe('https://storage.example.com/recording.mp4');
  });

  it('includes environment data', () => {
    const result = generateMachineSummary(makeParams({
      environment: { browser: 'Chrome 120', os: 'macOS 14' },
    }));

    expect(result.environment).toEqual({ browser: 'Chrome 120', os: 'macOS 14' });
  });

  it('collects evidence from screenshot URLs', () => {
    const result = generateMachineSummary(makeParams({
      stepResults: [
        { step_index: 0, status: 'failed', severity: 'critical', actual_behavior: 'Broke', screenshot_url: 'https://img/a.png' },
        { step_index: 1, status: 'failed', severity: 'minor', actual_behavior: 'Typo', screenshot_url: null },
      ],
      verdict: 'fail',
    }));

    expect(result.failed_steps[0].evidence).toEqual(['https://img/a.png']);
    expect(result.failed_steps[1].evidence).toEqual([]);
  });
});
