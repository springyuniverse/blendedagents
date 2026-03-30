import { describe, it, expect } from 'vitest';

// Integration tests — these will hit a real PostgreSQL database
// They are expected to FAIL until the implementation is complete

describe('Template CRUD - Integration', () => {
  it('create template, list templates, update template, delete template', () => {
    // Given a builder
    // When they create a template with title, steps, expected_behavior
    // Then it appears in list
    // When updated with a new title
    // Then the title changes
    // When deleted
    // Then it no longer appears in list
    expect(true).toBe(false);
  });

  it('deleted template does not affect existing test cases', () => {
    // Given a template used to create a test case
    // When the template is deleted
    // Then the test case still exists with its original steps and data
    expect(true).toBe(false);
  });
});
