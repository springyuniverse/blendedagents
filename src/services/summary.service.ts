export interface MachineSummary {
  verdict: string;
  confidence: number;
  passed_steps: number[];
  failed_steps: Array<{
    index: number;
    severity: string;
    actual_behavior: string;
    evidence: string[];
  }>;
  blocked_steps: number[];
  environment: Record<string, string>;
  recording_url: string | null;
  execution_minutes: number;
}

/**
 * Severity-based confidence penalties.
 * Each failed step reduces confidence by its severity penalty.
 */
const SEVERITY_PENALTIES: Record<string, number> = {
  critical: 0.4,
  major: 0.2,
  minor: 0.1,
  suggestion: 0.05,
};

/** Penalty applied for each blocked step. */
const BLOCKED_PENALTY = 0.15;

export interface StepResultInput {
  step_index: number;
  status: string;
  severity: string | null;
  actual_behavior: string | null;
  screenshot_url: string | null;
}

export interface TestResultInput {
  verdict: string;
  recording_url: string | null;
}

export interface GenerateSummaryParams {
  stepResults: StepResultInput[];
  testResult: TestResultInput;
  environment: Record<string, string>;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Generate a machine summary from test execution data.
 *
 * Confidence starts at 1.0 and is reduced by severity-based penalties
 * for each failed or blocked step. The floor is 0.0.
 */
export function generateMachineSummary(params: GenerateSummaryParams): MachineSummary {
  const { stepResults, testResult, environment, startedAt, completedAt } = params;

  const passedSteps: number[] = [];
  const failedSteps: MachineSummary['failed_steps'] = [];
  const blockedSteps: number[] = [];
  let confidence = 1.0;

  for (const sr of stepResults) {
    if (sr.status === 'passed') {
      passedSteps.push(sr.step_index);
    } else if (sr.status === 'failed') {
      const penalty = SEVERITY_PENALTIES[sr.severity ?? 'major'] ?? 0.2;
      confidence -= penalty;
      const evidence: string[] = [];
      if (sr.screenshot_url) {
        evidence.push(sr.screenshot_url);
      }
      failedSteps.push({
        index: sr.step_index,
        severity: sr.severity ?? 'major',
        actual_behavior: sr.actual_behavior ?? '',
        evidence,
      });
    } else if (sr.status === 'blocked') {
      blockedSteps.push(sr.step_index);
      confidence -= BLOCKED_PENALTY;
    }
  }

  // Floor at 0, round to 2 decimal places
  confidence = Math.max(0, Math.round(confidence * 100) / 100);

  const executionMs = completedAt.getTime() - startedAt.getTime();
  const executionMinutes = Math.round((executionMs / 60000) * 10) / 10;

  return {
    verdict: testResult.verdict,
    confidence,
    passed_steps: passedSteps,
    failed_steps: failedSteps,
    blocked_steps: blockedSteps,
    environment,
    recording_url: testResult.recording_url,
    execution_minutes: executionMinutes,
  };
}
