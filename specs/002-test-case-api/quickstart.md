# Quickstart: Test Case API

**Feature**: 002-test-case-api | **Depends on**: 001-foundation-auth, 006-credit-billing

## Prerequisites

- Node.js 20 LTS
- Supabase project (or local PostgreSQL 15+)
- 001-foundation-auth migrations applied
- 006-credit-billing migrations applied (for credit operations)

## New Environment Variables

```env
# Add to existing .env
CREDENTIAL_ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

## Database Migration

Apply the new migration for test_cases column additions:
```sql
-- Add columns to test_cases for 002-test-case-api
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS required_skills JSONB NOT NULL DEFAULT '[]';
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS callback_url TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS expected_behavior TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';

-- Add columns to test_templates
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS expected_behavior TEXT;

-- GIN indexes for filtering
CREATE INDEX IF NOT EXISTS idx_test_cases_tags ON test_cases USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_test_cases_required_skills ON test_cases USING GIN (required_skills);
```

## Testing the API

### Create a test case
```bash
curl -X POST http://localhost:3000/api/v1/test-cases \
  -H "Authorization: Bearer ba_sk_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Verify login flow",
    "description": "Test login on staging",
    "staging_url": "https://staging.example.com/login",
    "steps": [
      {"instruction": "Go to login page", "expected": "Login form visible"},
      {"instruction": "Enter credentials", "expected": "Form accepts input"},
      {"instruction": "Click Sign In", "expected": "Redirect to dashboard"}
    ],
    "expected_behavior": "User can log in successfully"
  }'
# Returns: { id, status: "queued", credit_cost: 5 }
```

### List test cases
```bash
curl http://localhost:3000/api/v1/test-cases \
  -H "Authorization: Bearer ba_sk_<your_key>"
```

### Cancel a test case
```bash
curl -X DELETE http://localhost:3000/api/v1/test-cases/<id> \
  -H "Authorization: Bearer ba_sk_<your_key>"
# Returns: { status: "cancelled", credits_refunded: 5 }
```

### Template workflow
```bash
# Create template
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Authorization: Bearer ba_sk_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Login Template", "steps": [...]}'

# Create test from template with overrides
curl -X POST http://localhost:3000/api/v1/templates/<id>/use \
  -H "Authorization: Bearer ba_sk_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{"staging_url": "https://staging-v2.example.com"}'
```

## Assignment Flow

After creating a test case:
1. Status starts as `queued`
2. pg-boss `assign-tester` job fires async, finds matching tester → status becomes `assigned`
3. Tester has 30 minutes to accept → status becomes `in_progress`
4. If tester doesn't accept in 30 min → reassignment attempt
5. If no tester found in 2 hours → status becomes `expired`, credits refunded

Monitor via: `GET /api/v1/test-cases/<id>` — check `status` and `status_history`.
