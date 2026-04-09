/**
 * Assessment Auto-Grading
 *
 * Scores a tester's step results against the planted issues defined in the
 * test case's assessment_config. Each planted issue maps to a step_index.
 *
 * Detection: did the tester mark the step as "failed" and describe the bug?
 * Clarity: did they provide actual_behavior and pick a reasonable severity?
 *
 * Pass criteria: detection >= pass_detection AND avg clarity >= pass_clarity.
 */

export interface PlantedIssue {
  step_index: number;
  category: string;
  keywords: string[];
  acceptable_severities: string[];
}

export interface AssessmentConfig {
  planted_issues: PlantedIssue[];
  pass_detection: number;
  pass_clarity: number;
}

export interface StepResultInput {
  step_index: number;
  status: string;
  severity?: string | null;
  actual_behavior?: string | null;
  notes?: string | null;
}

export interface GradedIssue {
  step_index: number;
  category: string;
  detected: boolean;
  clarity_points: number;
}

export interface AssessmentGrade {
  issues: GradedIssue[];
  detection_score: number;
  clarity_score: number;
  passed: boolean;
}

/** Count how many keywords appear in the text (substring match). */
function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

/**
 * Grade step results against assessment config.
 */
export function gradeAssessment(
  stepResults: StepResultInput[],
  config: AssessmentConfig,
): AssessmentGrade {
  const resultsByStep = new Map(stepResults.map((r) => [r.step_index, r]));

  const issues: GradedIssue[] = config.planted_issues.map((issue) => {
    const result = resultsByStep.get(issue.step_index);

    // If tester didn't mark this step as failed, they missed the bug
    if (!result || result.status !== 'failed') {
      return { step_index: issue.step_index, category: issue.category, detected: false, clarity_points: 0 };
    }

    // Check keyword match in actual_behavior + notes
    const text = [result.actual_behavior ?? '', result.notes ?? ''].join(' ');
    const hits = countKeywordHits(text, issue.keywords);
    const detected = hits >= 2;

    // Clarity: actual_behavior has content (+1), severity reasonable (+1)
    let clarity = 0;
    if ((result.actual_behavior ?? '').trim().length >= 10) clarity++;
    if (result.severity && issue.acceptable_severities.includes(result.severity)) clarity++;

    return { step_index: issue.step_index, category: issue.category, detected, clarity_points: clarity };
  });

  const detectionScore = issues.filter((i) => i.detected).length;
  const detectedIssues = issues.filter((i) => i.detected);
  const totalClarity = detectedIssues.reduce((sum, i) => sum + i.clarity_points, 0);
  const avgClarity = detectedIssues.length > 0 ? totalClarity / detectedIssues.length : 0;

  const passed = detectionScore >= config.pass_detection
    && avgClarity >= config.pass_clarity;

  return {
    issues,
    detection_score: detectionScore,
    clarity_score: Math.round(avgClarity * 100) / 100,
    passed,
  };
}

/** Default assessment config for the Acme Shop sandbox */
export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  planted_issues: [
    {
      step_index: 1,
      category: 'visual',
      keywords: ['button', 'cut', 'truncat', 'place order', 'hidden', 'overflow', 'clip', 'text', 'visible', 'width'],
      acceptable_severities: ['minor', 'cosmetic'],
    },
    {
      step_index: 2,
      category: 'functional',
      keywords: ['phone', 'letter', 'text', 'number', 'valid', 'accept', 'alpha', 'character', 'input', 'numeric', 'digit', 'type'],
      acceptable_severities: ['major', 'minor'],
    },
    {
      step_index: 3,
      category: 'logic',
      keywords: ['total', 'price', 'quantity', 'update', 'calculat', 'sum', 'change', 'amount', 'cost', 'multiply', 'stay', 'static', 'same'],
      acceptable_severities: ['critical', 'major'],
    },
    {
      step_index: 4,
      category: 'edge_case',
      keywords: ['empty', 'blank', 'submit', 'error', 'validat', 'required', 'message', 'missing', 'form', 'nothing', 'no error'],
      acceptable_severities: ['major', 'minor'],
    },
  ],
  pass_detection: 3,
  pass_clarity: 1.0,
};

/** Default assessment test case steps */
export const DEFAULT_ASSESSMENT_STEPS = [
  {
    instruction: 'Open the checkout page and perform a complete purchase flow. Try different quantities, fill in the shipping form, and submit an order.',
    expected: 'The entire checkout process should work smoothly with correct calculations, proper input validation, and clear feedback.',
  },
  {
    instruction: 'Inspect all visual elements — buttons, text, and layout. Report anything that looks wrong.',
    expected: 'All UI elements should be properly sized, aligned, and fully visible with complete text.',
  },
  {
    instruction: 'Test each form input field. Try entering different types of data (letters, numbers, symbols) in each field.',
    expected: 'Each field should validate input correctly — for example, phone numbers should only accept numeric input.',
  },
  {
    instruction: 'Change the product quantity using the dropdown and review the order total.',
    expected: 'The total price should update immediately to reflect quantity multiplied by the unit price.',
  },
  {
    instruction: 'Try submitting the form with empty or missing fields.',
    expected: 'The form should show clear validation error messages for all required fields.',
  },
];
