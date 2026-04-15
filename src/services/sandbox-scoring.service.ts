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

// ── Assessment Catalog ─────────────────────────────────────────

export interface Assessment {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy-medium' | 'medium' | 'medium-hard' | 'hard' | 'very-hard';
  sandbox_url: string;
  steps: { instruction: string; expected: string }[];
  config: AssessmentConfig;
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

// ── Assessment 2: CloudBlog CMS (Easy-Medium) ─────────────────

const BLOG_CONFIG: AssessmentConfig = {
  planted_issues: [
    { step_index: 0, category: 'visual', keywords: ['count', 'mismatch', 'number', 'posts', 'badge', 'sidebar', 'wrong', 'incorrect', '5', '3', 'total', 'doesn\'t match'], acceptable_severities: ['minor', 'cosmetic'] },
    { step_index: 2, category: 'functional', keywords: ['image', 'disappear', 'gone', 'lost', 'missing', 'featured', 'upload', 'thumbnail', 'not saved', 'revert', 'placeholder', 'refresh', 'persist', 'clear'], acceptable_severities: ['major', 'minor'] },
    { step_index: 3, category: 'logic', keywords: ['date', 'publish', 'wrong date', 'march', 'old date', 'timestamp', 'not today', 'hardcoded', 'stale', 'incorrect', 'creation date', 'past'], acceptable_severities: ['major', 'minor'] },
    { step_index: 4, category: 'edge_case', keywords: ['word count', 'reading time', 'stale', 'not updating', 'frozen', 'static', 'wrong count', 'doesn\'t change', 'old value', 'after edit', 'locked', 'outdated'], acceptable_severities: ['minor', 'cosmetic'] },
  ],
  pass_detection: 3,
  pass_clarity: 1.0,
};

const BLOG_STEPS = [
  { instruction: 'Open the CloudBlog dashboard. Explore the navigation: Dashboard, Posts, Drafts, Media Library. Note the post counts, layout, and labels on each section. Do not create anything yet — just observe.', expected: 'Navigation loads correctly. Post and draft counts in the sidebar match the actual content listed. Layout is consistent with no misaligned elements or incorrect badges.' },
  { instruction: 'Create a new blog post. Enter a title of at least 8 words, write 2–3 paragraphs of body text, and select a category from the dropdown. Save it as a draft, then navigate away and reopen the draft.', expected: 'The draft saves successfully. When reopened, the title, body, and category are preserved exactly as entered. The post appears in the Drafts section with the correct title and status.' },
  { instruction: 'Upload a featured image to your draft. Save the draft again, then navigate away and return to verify the image is still attached.', expected: 'The image preview appears after upload. After saving and returning, the featured image is still displayed — it should not revert to a placeholder or disappear.' },
  { instruction: 'Publish the post using the Publish button. Navigate to the public blog view and find your post. Verify the title, body, publish date, and featured image are all correct.', expected: 'The post appears as Published. The publish date should match today\'s date. All content from the editor is preserved on the public page.' },
  { instruction: 'Return to the editor for the published post. Edit the title and add a paragraph. Save. Check if the word count or reading time indicator updates to reflect your changes.', expected: 'Changes save successfully. The word count or reading time should update to reflect the new content length — not remain frozen at the original value.' },
];

// ── Assessment 3: SwiftPay Banking (Medium) ───────────────────

const BANKING_CONFIG: AssessmentConfig = {
  planted_issues: [
    { step_index: 0, category: 'visual', keywords: ['dollar', 'currency', 'symbol', 'missing', 'sign', '$', 'format', 'checking', 'display', 'balance', '4250', '4,250'], acceptable_severities: ['minor', 'cosmetic'] },
    { step_index: 1, category: 'logic', keywords: ['fee', 'total', 'debit', 'calculation', 'math', '$2.50', '$2.00', 'wrong', 'incorrect', 'rounding', 'amount', 'confirmation', 'arithmetic', 'off by'], acceptable_severities: ['critical', 'major'] },
    { step_index: 2, category: 'functional', keywords: ['sort', 'order', 'descending', 'lexicographic', 'alphabetical', 'numeric', 'string', 'amount', 'incorrect order', '$9', 'wrong sequence', 'transaction'], acceptable_severities: ['major', 'minor'] },
    { step_index: 3, category: 'edge_case', keywords: ['apostrophe', 'special character', 'O\'Brien', 'OBrien', 'stripped', 'removed', 'name', 'recipient', 'encoding', 'truncated', 'garbled', 'quote'], acceptable_severities: ['major', 'minor'] },
    { step_index: 4, category: 'functional', keywords: ['balance', 'not updated', 'stale', 'old value', 'still shows', 'didn\'t change', 'original', 'header', 'refresh', 'deducted', 'dashboard', 'after transfer'], acceptable_severities: ['major', 'minor'] },
  ],
  pass_detection: 3,
  pass_clarity: 1.0,
};

const BANKING_STEPS = [
  { instruction: 'Open the SwiftPay dashboard. Review the account balances for Checking and Savings, the navigation tabs, and the user profile in the header. Note the formatting and display of all financial figures.', expected: 'Account balances are clearly visible with correct currency formatting (e.g., $4,250.00). Navigation tabs are present and labeled. No truncated text or misaligned elements.' },
  { instruction: 'Navigate to the Transfer tab. Send $1,500.00 from Checking to a saved recipient. On the confirmation screen, verify the fee line item, total debit, and whether the math is correct.', expected: 'The transfer fee is $2.50. Total debit should be $1,502.50. The confirmation shows correct itemized breakdown. After confirmation, the dashboard balance should update.' },
  { instruction: 'Go to Transaction History. Sort the transactions by Amount (descending). Verify the sort order is numerically correct across at least 5–8 visible rows.', expected: 'Transactions should be ordered by numeric value — $2,000 before $1,500 before $200. Amounts should NOT be sorted as text strings.' },
  { instruction: 'Add a new recipient with the name "O\'Brien" (with apostrophe). Save and verify the name displays correctly. Then try transferring a negative amount (-$50) and observe the validation.', expected: 'The apostrophe in O\'Brien should be preserved correctly. Negative amounts should be rejected with a clear error message.' },
  { instruction: 'After completing a transfer, check whether the account balance in the dashboard header has updated to reflect the deduction.', expected: 'The balance should update immediately after a successful transfer without requiring a page refresh.' },
];

// ── Assessment 4: EventHub Booking (Medium-Hard) ──────────────

const BOOKING_CONFIG: AssessmentConfig = {
  planted_issues: [
    { step_index: 0, category: 'visual', keywords: ['overflow', 'clip', 'cut off', 'truncat', 'banner', 'title', 'text', 'hidden', 'wrapping', 'heading', 'display', 'CSS', 'responsive'], acceptable_severities: ['minor', 'cosmetic'] },
    { step_index: 2, category: 'functional', keywords: ['discount', 'EARLYBIRD', 'coupon', 'promo', 'not working', 'total unchanged', '$0', 'no discount', 'code', 'doesn\'t apply', 'silent', 'fail', 'price same'], acceptable_severities: ['major', 'critical'] },
    { step_index: 2, category: 'logic', keywords: ['tax', 'fee', 'service', 'pre-tax', 'post-tax', 'calculation', 'wrong total', 'order of operations', 'discount on fee', 'overcharged', 'subtotal', 'FLASH10'], acceptable_severities: ['major', 'critical'] },
    { step_index: 1, category: 'edge_case', keywords: ['timezone', 'UTC', 'time', 'wrong time', 'hour', 'offset', 'New York', 'EST', 'EDT', 'local time', 'schedule', 'session', 'displayed', 'conversion'], acceptable_severities: ['major', 'critical'] },
    { step_index: 3, category: 'ux', keywords: ['seat', 'last', 'select', 'color', 'highlight', 'visual', 'doesn\'t change', 'still green', 'available', 'state', 'not highlighted', 'click', 'map', 'row'], acceptable_severities: ['major', 'minor'] },
  ],
  pass_detection: 3,
  pass_clarity: 1.0,
};

const BOOKING_STEPS = [
  { instruction: 'Browse the EventHub platform. View the conference listing, open an event detail page, and inspect the banner, schedule, ticket tiers, and layout. Note any visual issues.', expected: 'Event pages load correctly. Banner images and text are fully visible without clipping. Schedule shows session times with timezone. Ticket tiers are clearly described.' },
  { instruction: 'On the event detail page, review the session schedule times. Note what timezone is displayed (if any) and whether the times make sense for the event venue location.', expected: 'Session times should be in the event\'s local timezone (e.g., EST for New York). A timezone indicator should be visible. Times should not be in UTC if the event is in a different timezone.' },
  { instruction: 'Select tickets: 2x General ($49), 1x VIP ($149), 1x Workshop ($35). Apply discount code EARLYBIRD20 (20% off). Verify the order summary math. Then try FLASH10 (10%) and check if the discount is applied to the correct subtotal.', expected: 'Subtotal: $282. EARLYBIRD20 should deduct $56.40 for a total of $225.60. Service fees should be calculated on the pre-discount subtotal, not post-discount. All line items should be accurate.' },
  { instruction: 'Use the seat map to select seats. Try selecting the last available seat in a row. Verify the seat visually changes to "selected" state and the order summary updates.', expected: 'Selected seats change color to indicate selection. The last available seat should behave identically to other seats. Order summary reflects all selected seats.' },
  { instruction: 'Complete a full booking: select tickets, apply a discount, choose a seat, and proceed to checkout. Review the final confirmation details.', expected: 'The checkout process completes smoothly. Confirmation shows correct event, tickets, seats, discount, and total amount charged.' },
];

// ── Assessment 5: InsightBoard Analytics (Hard) ───────────────

const ANALYTICS_CONFIG: AssessmentConfig = {
  planted_issues: [
    { step_index: 0, category: 'visual', keywords: ['overlap', 'label', 'funnel', 'chart', 'bar', 'text', 'truncat', 'spacing', 'cramped', 'unreadable', 'Trials', 'Paid', 'hard to read'], acceptable_severities: ['minor', 'cosmetic'] },
    { step_index: 1, category: 'data_integrity', keywords: ['mismatch', 'discrepancy', 'total', 'revenue', 'KPI', 'sum', 'table', '$48', '$45', 'doesn\'t match', 'wrong', 'off by', 'inconsistent', 'aggregate', 'cross-reference'], acceptable_severities: ['critical', 'major'] },
    { step_index: 2, category: 'functional', keywords: ['filter', 'reset', 'segment', 'cleared', 'lost', 'revert', 'All Segments', 'Enterprise', 'dropdown', 'state', 'not preserved', 'disappear', 'date range', 'switching'], acceptable_severities: ['major', 'minor'] },
    { step_index: 3, category: 'logic', keywords: ['conversion', 'rate', 'percentage', 'hardcoded', 'static', '3.2', 'funnel', 'calculation', 'doesn\'t change', 'wrong', 'formula', 'not calculated', 'mismatch', 'KPI'], acceptable_severities: ['major', 'critical'] },
    { step_index: 4, category: 'edge_case', keywords: ['CSV', 'export', 'unfiltered', 'all data', 'filter not applied', 'wrong data', 'includes everything', 'full dataset', 'ignores filter', 'download', 'row count', 'mismatch'], acceptable_severities: ['major', 'critical'] },
  ],
  pass_detection: 3,
  pass_clarity: 1.2,
};

const ANALYTICS_STEPS = [
  { instruction: 'Open the InsightBoard dashboard. Review every visible element: KPI cards, charts, funnel, date range picker, filters, transactions table, and export button. Note any visual issues before interacting.', expected: 'All KPI cards display formatted values correctly. Charts render with readable labels and legends. The funnel shows clear stage counts. No overlapping text or broken layouts.' },
  { instruction: 'Cross-reference the Total Revenue KPI card against the transactions table. Sum the Amount column across ALL pages (use pagination). Compare with the KPI value and any chart tooltips.', expected: 'The KPI total, table sum, and chart data should all agree within $1 rounding tolerance. Any discrepancy indicates a data integrity problem.' },
  { instruction: 'Set the segment filter to "Enterprise", then change the date range from "Last 30 Days" to "Last 7 Days". Check whether the segment filter is still set to "Enterprise" after the date change.', expected: 'Both filters should be composable — changing the date range should NOT reset the segment filter. The segment dropdown should still show "Enterprise" after switching dates.' },
  { instruction: 'Check the Conversion Rate KPI card. Then look at the funnel: calculate Paid / Visits × 100 manually. Switch to "Last 7 Days" — does the Conversion Rate KPI update to reflect the new funnel numbers?', expected: 'The Conversion Rate should be dynamically calculated from funnel data, not hardcoded. Switching date ranges should produce different rates if the funnel numbers change.' },
  { instruction: 'With a date range and segment filter active, click "Export CSV". Open the downloaded file and verify: (1) row count matches the table, (2) data respects active filters, (3) values match what\'s on screen.', expected: 'The CSV should only contain rows matching the active filters. Row count should match the table pagination total. Values should exactly match the on-screen table.' },
];

// ── Assessment 6: LaunchPad Wizard (Very Hard) ────────────────

const WIZARD_CONFIG: AssessmentConfig = {
  planted_issues: [
    { step_index: 0, category: 'ux', keywords: ['progress', 'bar', 'percentage', 'wrong', 'incorrect', '60%', '80%', '100%', 'step', 'indicator', 'mismatch', 'jumps', 'inaccurate', 'skips'], acceptable_severities: ['minor', 'cosmetic'] },
    { step_index: 1, category: 'state', keywords: ['back', 'navigation', 'data loss', 'invite', 'lost', 'cleared', 'third', 'missing', 'state', 'round trip', 'gone', 'disappear', 'only two', 'dropped'], acceptable_severities: ['major', 'critical'] },
    { step_index: 2, category: 'logic', keywords: ['integration', 'conditional', 'industry', 'FinTech', 'audit', 'compliance', 'webhook', 'generic', 'not filtered', 'wrong option', 'step 1', 'use case', 'ignored'], acceptable_severities: ['major', 'critical'] },
    { step_index: 4, category: 'functional', keywords: ['rapid', 'click', 'double', 'submit', 'multiple', 'race', 'button', 'disabled', 'launch', 'duplicate', 'times', 'not disabled', 'counter', 'fired'], acceptable_severities: ['critical', 'major'] },
    { step_index: 3, category: 'data_integrity', keywords: ['billing', 'discount', 'price', 'wrong', 'full price', '$149', '$119', 'LAUNCH20', 'summary', 'not applied', 'promo', 'mismatch', 'step 5', 'overcharged'], acceptable_severities: ['critical', 'major'] },
    { step_index: 1, category: 'edge_case', keywords: ['role', 'dropdown', 'Healthcare', 'Compliance', 'Editor', 'Viewer', 'filtered', 'wrong roles', 'cross-step', 'industry', 'options', 'missing role', 'not restricted'], acceptable_severities: ['major', 'critical'] },
  ],
  pass_detection: 4,
  pass_clarity: 1.2,
};

const WIZARD_STEPS = [
  { instruction: 'Navigate through all 5 steps of the wizard using Next/Back buttons WITHOUT filling in any data. On each step, note the progress bar percentage, which fields are visible, and whether Back works correctly from every step.', expected: 'Progress bar should show 20%, 40%, 60%, 80%, 100% for steps 1–5 respectively. Each step renders its fields correctly. Back button should be disabled on Step 1. No data loss or visual glitches during navigation.' },
  { instruction: 'Complete Step 1 (Company: "Nexlify Inc", Industry: "FinTech"). On Step 2, invite 3 team members with different roles. Go Back to Step 1, verify data persists, then go Forward to Step 2 and verify ALL 3 invites are still listed.', expected: 'All Step 1 fields should persist on round-trip. All 3 invited team members should still be listed on Step 2 after navigating back and forward. No invites should be lost.' },
  { instruction: 'On Step 3, enable "Audit Log" integration. Since you selected "FinTech" in Step 1, check whether the integration shows compliance-specific options or generic webhook options.', expected: 'With FinTech selected, the Audit Log integration should show compliance-relevant configuration (SOC2, SIEM, etc.), not generic webhook options. Cross-step conditional logic should be active.' },
  { instruction: 'On Step 4, select the Growth plan ($149/mo) and apply promo code "LAUNCH20" (20% off). Verify the billing summary shows $119.20. Proceed to Step 5 and verify the same discounted total appears in the launch summary.', expected: 'Step 4 billing: $149 - 20% = $119.20. Step 5 summary must show the same $119.20 — not the undiscounted $149. The discount should carry across steps.' },
  { instruction: 'On Step 5, click the "Launch Workspace" button rapidly 3–5 times in quick succession. Observe whether the button disables immediately after the first click, and whether multiple submissions are triggered.', expected: 'The button should disable immediately on first click to prevent double-submission. Only ONE launch should be triggered regardless of how many times the user clicks. A loading state should appear instantly.' },
];

// ── Assessment Catalog ────────────────────────────────────────

export const ASSESSMENT_CATALOG: Assessment[] = [
  {
    id: 'acme-shop',
    title: 'Onboarding Assessment: Acme Shop Checkout',
    description: 'Test this checkout page and report any bugs you find. This assessment determines your readiness to take real testing tasks.',
    difficulty: 'easy-medium',
    sandbox_url: '/sandbox/index.html',
    steps: DEFAULT_ASSESSMENT_STEPS,
    config: DEFAULT_ASSESSMENT_CONFIG,
  },
  {
    id: 'cloud-blog',
    title: 'Onboarding Assessment: CloudBlog CMS',
    description: 'Test this content management system — create posts, manage drafts, upload images, and publish content. Report any bugs you encounter.',
    difficulty: 'easy-medium',
    sandbox_url: '/sandbox/blog.html',
    steps: BLOG_STEPS,
    config: BLOG_CONFIG,
  },
  {
    id: 'swift-pay',
    title: 'Onboarding Assessment: SwiftPay Banking',
    description: 'Test this online banking platform — transfer money, review transactions, manage recipients. Pay close attention to numbers and edge cases.',
    difficulty: 'medium',
    sandbox_url: '/sandbox/banking.html',
    steps: BANKING_STEPS,
    config: BANKING_CONFIG,
  },
  {
    id: 'event-hub',
    title: 'Onboarding Assessment: EventHub Booking',
    description: 'Test this conference booking platform — browse events, select tickets, apply discounts, choose seats. Verify pricing, times, and UI behavior.',
    difficulty: 'medium-hard',
    sandbox_url: '/sandbox/booking.html',
    steps: BOOKING_STEPS,
    config: BOOKING_CONFIG,
  },
  {
    id: 'insight-board',
    title: 'Onboarding Assessment: InsightBoard Analytics',
    description: 'Test this analytics dashboard — verify KPIs, cross-reference data, test filters, and validate exports. Numbers must add up.',
    difficulty: 'hard',
    sandbox_url: '/sandbox/analytics.html',
    steps: ANALYTICS_STEPS,
    config: ANALYTICS_CONFIG,
  },
  {
    id: 'launch-pad',
    title: 'Onboarding Assessment: LaunchPad Wizard',
    description: 'Test this multi-step onboarding wizard — check state management, conditional logic, cross-step interactions, and edge cases.',
    difficulty: 'very-hard',
    sandbox_url: '/sandbox/wizard.html',
    steps: WIZARD_STEPS,
    config: WIZARD_CONFIG,
  },
];

/** Pick the default assessment (or a specific one by ID) */
export function pickRandomAssessment(): Assessment {
  // Default to InsightBoard Analytics; change to null for random selection
  const defaultId = 'insight-board';
  if (defaultId) {
    const found = ASSESSMENT_CATALOG.find(a => a.id === defaultId);
    if (found) return found;
  }
  const idx = Math.floor(Math.random() * ASSESSMENT_CATALOG.length);
  return ASSESSMENT_CATALOG[idx];
}
