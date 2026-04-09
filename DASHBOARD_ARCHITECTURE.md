# BlendedAgents Builder Dashboard - Complete UI Architecture

## Overview
A comprehensive testing platform dashboard with two distinct user roles (Builders and Testers) using Next.js 15, React 19, TypeScript, and Tailwind CSS v4.

## Project Configuration

### Dependencies
- **Next.js**: 15.5.0 (App Router, SSR)
- **React**: 19.1.0 (Server Components, Client Components)
- **TypeScript**: 5.8.0
- **Tailwind CSS**: 4.1.0 (with @tailwindcss/postcss)
- **TanStack React Query**: 5.76.0 (Data fetching, caching, mutations)
- **Supabase**: @supabase/supabase-js, @supabase/ssr (Auth, database)
- **Lucide React**: 1.7.0 (Icons)

### Font
- **Plus Jakarta Sans** - Primary UI font (Google Fonts)

### Theme
- **Colors**: Slate, Indigo, Violet, Emerald, Teal, Amber, Red, Green, Yellow
- **Shadows**: Custom soft, lifted, and glow shadows
- **Spacing**: Standard Tailwind 4 spacing scale

---

## Root Layout Structure

### Main Layout (`src/app/layout.tsx`)
- Font configuration (Plus Jakarta Sans via Google Fonts)
- QueryClient setup with 30s staleTime, 1 retry default
- Root HTML structure with dark mode support via font variable

### Global CSS (`src/app/globals.css`)
- Tailwind v4 imports via `@import 'tailwindcss'`
- Custom theme tokens: `--font-sans`, shadow definitions (`--shadow-soft`, `--shadow-lifted`, `--shadow-glow`)
- Custom scrollbar styling (thin, slate 500 color)

### PostCSS Config
- @tailwindcss/postcss plugin

---

## Page Structure

### Public Pages (No Auth Required)

#### `/` (Root)
- **Path**: `src/app/page.tsx`
- **Type**: Client Component
- **Purpose**: Role detection & redirect
- **Logic**:
  - Dev mode: Checks `dev-session` cookie for role
  - Production: Queries Supabase `builders` and `testers` tables
  - Redirects to `/login` if no session

#### `/login`
- **Path**: `src/app/login/page.tsx`
- **Type**: Client Component
- **Features**:
  - Dev mode login (separate DevLogin component)
  - Production: Email/password form with Supabase auth
  - Forgot password link
  - Sign up links for both roles
  - Gradient background blobs (indigo/violet)

#### `/forgot-password`
- **Path**: `src/app/forgot-password/page.tsx`
- **Type**: Client Component
- **Features**: Password reset form, email validation, success message

#### `/signup/builder`
- **Path**: `src/app/signup/builder/page.tsx`
- **Type**: Client Component
- **Fields**: Display name, email, password
- **Color scheme**: Indigo/violet gradient

#### `/signup/tester`
- **Path**: `src/app/signup/tester/page.tsx`
- **Type**: Client Component
- **Fields**: Display name, email, password, region selector
- **Color scheme**: Emerald/teal gradient
- **Regions**: Egypt, MENA, Southeast Asia, South Asia, Sub-Saharan Africa, Latin America, Global

---

## Builder Dashboard (`/builder/*`)

### Layout (`src/app/builder/layout.tsx`)
- **Sidebar**: Fixed left sidebar (w-56, indigo-950 background)
- **Main Content**: ml-56 with max-w-5xl container
- **Auth**: Role verification against `builders` table
- **Components**:
  - Sidebar with nav items
  - CreditBalance widget (compact mode)
  - User profile info
  - Logout button

### Navigation Items (Builder)
1. Dashboard (Home icon, `/builder`)
2. Test Cases (ClipboardList icon, `/builder/test-cases`)
3. Templates (FileText icon, `/builder/templates`)
4. Credits (Coins icon, `/builder/credits`)
5. Settings (Settings icon, `/builder/settings`)

### Pages

#### `/builder` (Dashboard)
- **Path**: `src/app/builder/page.tsx`
- **Type**: Client Component
- **Components**:
  - 3-column stat cards: Available Credits, Total Tests, Completion Rate
  - Recent Test Cases table (5 items)
  - Create New Test button
- **Data**: Uses `getBalance()`, `listTestCases()`
- **Table columns**: Title, Status, Steps, Cost, Created date

#### `/builder/test-cases`
- **Path**: `src/app/builder/test-cases/page.tsx`
- **Type**: Client Component
- **View modes**: Kanban board (default), List view
- **Features**:
  - Search bar
  - Drag-and-drop between columns
  - 5 status columns: Queued, Assigned, In Progress, Completed, Cancelled
  - Each column with colored headers and borders
  - DraggableCard component with title, template type badge, description, tags, footer with step count/cost
  - Optimistic updates on drag
- **Actions**: Create Test, From Template buttons
- **Modal**: TestCaseDialog for full details

#### `/builder/test-cases/new`
- **Path**: `src/app/builder/test-cases/new/page.tsx`
- **Type**: Client Component with Suspense
- **Template type selector**: Flow Test / Review Test toggle
- **Shared Fields**:
  - Title, Description, Staging URL, Environment (staging/production/localhost)
  - Callback URL, External ID, Tags (advanced section)
- **Flow Test Fields**:
  - Expected Behavior
  - Steps with StepEditor (add/remove/reorder)
- **Review Test Fields**:
  - Context (textarea)
  - Devices to check (multi-select: desktop/mobile/tablet variants)
  - Focus areas (layout, typography, forms, images, content, functionality)
  - Ignore areas
- **Credit display**: Shows estimated cost as steps are added
- **Actions**: Cancel, Create Test Case buttons

#### `/builder/test-cases/[id]`
- **Path**: `src/app/builder/test-cases/[id]/page.tsx`
- **Type**: Client Component
- **Displays**:
  - Breadcrumb navigation
  - Test title with template type badge
  - Status badge
  - Meta info: Cost, Steps, Devices, Created date, Staging URL
  - Tags
  - Status timeline (transitions)
  - Steps (for flow test) or Context/Devices/Focus/Ignore (for review test)
  - Test results if completed (via TestResultView component)
  - Cancel button (for queued/assigned only)

#### `/builder/templates`
- **Path**: `src/app/builder/templates/page.tsx`
- **Type**: Client Component
- **Display**: 2-column grid of template cards
- **Card content** (per template):
  - Icon, template name, description
  - Pricing badge (Fixed Price / Base + Bonus)
  - Required fields list
  - Optional fields list
  - Pricing details (base + per-step or base + bonus breakdown)
  - "Create Test Case" button (styled by template type)
  - "View Schema" button

#### `/builder/templates/[id]`
- **Path**: `src/app/builder/templates/[id]/page.tsx`
- **Type**: Client Component
- **Displays**:
  - Breadcrumb navigation
  - Template name and description
  - Request fields schema (table with name, type, description, required/optional)
  - Step schema (for flow test)
  - Finding schema (for review test)
  - Pricing section with detailed breakdown
  - "Create Test Case" action button

#### `/builder/credits`
- **Path**: `src/app/builder/credits/page.tsx`
- **Type**: Client Component
- **Components**:
  - CreditBalance card (expanded, showing available/reserved/total/rate)
  - Credit packs grid (3 columns)
  - Each pack shows: name, credit count, price, per-credit rate, "Popular" badge (if applicable)
  - Buy button (primary for popular, secondary for others)
  - Current rate display
  - TransactionHistory component (with pagination)

#### `/builder/settings`
- **Path**: `src/app/builder/settings/page.tsx`
- **Type**: Client Component
- **Sections**:
  1. **Profile Section**: Display name, email, plan, member since (read-only)
  2. **API Keys Section**:
     - Generate new key input
     - Key list with prefix, label, created/last used dates
     - Revoke button (per key)
     - Success alert when key created (show full key once)
  3. **Webhook Section**:
     - Webhook URL input
     - Secret input (min 16 chars)
     - Save and Test Ping buttons
     - Status messages
  4. **Webhook Delivery History**:
     - Table: Event, Status, Attempts, Delivered
     - Pagination support

---

## Tester Dashboard (`/tester/*`)

### Layout (`src/app/tester/layout.tsx`)
- **Sidebar**: Fixed left sidebar (w-56, white background with border)
- **Main Content**: ml-56 with max-w-4xl container
- **Auth**: Role verification against `testers` table
- **Components**:
  - Sidebar with nav items
  - AvailabilityToggle component
  - Logout button

### Navigation Items (Tester)
1. Tasks (ClipboardList icon, `/tester/tasks`)
2. Profile (User icon, `/tester/profile`)
3. Earnings (DollarSign icon, `/tester/earnings`)

### Pages

#### `/tester/tasks`
- **Path**: `src/app/tester/tasks/page.tsx`
- **Type**: Client Component
- **Tab-based interface**: Available, My Tasks, Completed
- **Available Tasks Tab**:
  - Cards for each available task
  - Request/Withdraw button per task
  - Info: step count, environment, request count, posted date, tags
- **My Tasks Tab**:
  - Assigned tasks
  - Link to task detail page
  - Status badge
- **Completed Tasks Tab**:
  - Completed tasks
  - Info: step count, completed date, earnings (+$X.XX)
- **Refetch interval**: 5s for available/my, 10s for completed

#### `/tester/tasks/[id]`
- **Path**: `src/app/tester/tasks/[id]/page.tsx`
- **Type**: Client Component
- **Components**:
  - Back button
  - Task title and description
  - Recording toggle (RecordingToggle component)
  - Staging URL, environment, expected behavior
  - Credentials panel (CredentialsPanel component) - shown after start
  - Start Test button (or credentials after started)
  - Progress bar (step completion %)
  - StepResult components (one per step)
  - Complete Test button (shows TestSubmission after all steps done)
- **Recording**: Screen recording integration via useScreenRecording hook
- **Step workflow**: Pass, Fail, Block, Skip actions per step
- **Fail submission**: Requires severity, actual behavior, screenshot
- **TestSubmission**: Final submission with verdict selector, summary textarea

#### `/tester/profile`
- **Path**: `src/app/tester/profile/page.tsx`
- **Type**: Client Component
- **Editable fields**:
  - Display name
  - Timezone
- **Read-only fields**:
  - Email
  - Region
  - Skills (badges)
  - Languages (badges)
- **Statistics card**: Tasks completed, total tasks, avg completion time, total earnings
- **Save/Cancel buttons** (shows only when dirty)

#### `/tester/earnings`
- **Path**: `src/app/tester/earnings/page.tsx`
- **Type**: Client Component
- **Display**:
  - Total earnings large card
  - Earnings table: Date, Test Case ID, Amount, Status
  - Status badge (completed/pending/paid)
- **Refetch interval**: Default (no explicit interval)

---

## Shared Components

### StatusBadge (`src/components/StatusBadge.tsx`)
- Maps status strings to styled badges
- Statuses: queued, assigned, in_progress, completed, cancelled, expired
- Uses semantic colors (slate, blue, yellow, green, red, orange)

### CreditBalance (`src/components/CreditBalance.tsx`)
- Two modes: compact (sidebar) and expanded (page)
- Compact: Icon + credit count + (reserved count if > 0)
- Expanded: Large number display + available/reserved/total/rate breakdown
- Uses React Query with 30s refetch interval

### StepEditor (`src/components/StepEditor.tsx`)
- Manages array of steps (instruction + expected_behavior)
- Add/remove/reorder buttons
- Shows estimated cost
- Used in test case creation form

### TestCaseDialog (`src/components/TestCaseDialog.tsx`)
- Modal dialog for viewing test case details
- Backdrop click or Escape key to close
- Shows all test case info
- Displays TestResultView if completed
- Cancel button for queued/assigned tests

### TestResultView (`src/components/TestResultView.tsx`)
- Displays test results for both flow and review tests
- **Flow test**: Recording video, step results with status/severity/notes/screenshot
- **Review test**: Findings with severity badges, category, device, location, screenshot
- Verdict badge (pass/fail/partial/blocked/issues_found/no_issues)
- Credits breakdown for review tests

### TransactionHistory (`src/components/TransactionHistory.tsx`)
- Table: Type, Description, Amount, Date
- Pagination support
- Loading skeleton
- Empty state

### Tester Components

#### AvailabilityToggle (`src/components/tester/AvailabilityToggle.tsx`)
- Toggle switch (iOS-style)
- Shows available/unavailable status
- Updates via `toggleAvailability` API
- Refetches profile on update

#### ScreenshotUpload (`src/components/tester/ScreenshotUpload.tsx`)
- Drag-and-drop file input
- Generates presigned URL
- Uploads to S3 via PUT
- Shows preview on success
- Validates image type and size (10MB max)

#### StepResult (`src/components/tester/StepResult.tsx`)
- Per-step result UI with conditional forms
- Pass/Fail/Block/Skip buttons
- Fail form: Severity, actual behavior, screenshot, notes
- Skip form: Reason
- Displays completed result state
- Updates via step result submission API

#### TestSubmission (`src/components/tester/TestSubmission.tsx`)
- Final submission form after all steps
- Verdict selector (Pass/Fail/Partial/Blocked)
- Summary textarea (min 10 chars)
- Shows recording notice if active
- Summary character counter
- Stops recording on submit

---

## Styling System

### Colors by Role
- **Builder**: Indigo (600, 950 sidebar) / Violet
- **Tester**: Emerald (600) / Teal (600)

### Shadow Tokens (CSS variables)
- `--shadow-soft`: 0 4px 20px -2px rgba(79, 70, 229, 0.1)
- `--shadow-lifted`: 0 10px 25px -5px rgba(79, 70, 229, 0.15), 0 8px 10px -6px rgba(79, 70, 229, 0.1)
- `--shadow-glow`: 0 4px 14px 0 rgba(79, 70, 229, 0.3)

### Component Patterns
- **Cards**: `bg-white border border-slate-100 rounded-xl shadow-soft`
- **Buttons**: 
  - Primary gradient: `bg-gradient-to-r from-indigo-600 to-violet-600 text-white`
  - Secondary: `border border-slate-200 text-slate-700 hover:bg-slate-50`
  - Hover: `-translate-y-0.5` transform + shadow-glow
- **Inputs**: `border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500`
- **Status badges**: Semantic colors with background tints

### Layout Constants
- Sidebar width: `w-56`
- Main container max-width: `max-w-5xl` (builder), `max-w-4xl` (tester)
- Padding: `px-6 py-8`

---

## State Management & Data Fetching

### React Query Setup
- Default staleTime: 30 seconds
- Default retry: 1
- Query keys by feature:
  - Credit balance: `['credit-balance']`
  - Test cases: `['test-cases', { search?, page? }]`
  - Test case detail: `['test-case', id]`
  - Test results: `['test-results', id]`
  - Templates: `['templates']`, `['template', id]`
  - API keys: `['api-keys']`
  - Webhook history: `['webhook-history']`
  - Tester profile: `['tester-profile']`
  - Tester tasks: `['tester-tasks']`, `['available-tasks']`, `['tester-completed']`
  - Earnings: `['tester-earnings']`
  - Transactions: `['transactions', page]`

### Authentication
- Supabase SSR integration
- Cookie-based sessions (dev mode: `dev-session` cookie)
- Role-based redirects in layouts

---

## API Integration Points

### Builder APIs (`src/lib/api.ts`)
- `getMe()` - User profile
- `getBalance()` - Credit balance
- `getPacks()` - Available credit packs
- `topup(packId)` - Initiate purchase
- `listTestCases(options)` - Test case listing
- `createTestCase(input)` - Create new test
- `getTestCase(id)` - Test detail
- `getTestResults(id)` - Test results
- `updateTestCaseStatus(id, status)` - Move test between columns
- `cancelTestCase(id)` - Cancel test
- `listTemplates()` - Template listing
- `getTemplate(id)` - Template detail
- `listApiKeys()` - API keys list
- `createApiKey(label?)` - Generate key
- `revokeApiKey(id)` - Revoke key
- `updateWebhook(url, secret)` - Webhook config
- `pingWebhook()` - Test webhook
- `getWebhookHistory()` - Webhook deliveries
- `getTransactions(page)` - Transaction history

### Tester APIs (`src/lib/tester-api.ts`)
- `getTasks()` - Assigned tasks
- `getAvailableTasks()` - Available tasks
- `getCompletedTasks()` - Completed tasks
- `requestTask(id)` - Request task
- `withdrawRequest(id)` - Withdraw request
- `getTask(id)` - Task detail
- `startTask(id)` - Start task execution
- `submitStepResult(id, index, result)` - Submit step verdict
- `submitTest(id, result)` - Final submission
- `getProfile()` - Tester profile
- `updateProfile(data)` - Update profile
- `toggleAvailability(isAvailable)` - Availability toggle
- `getEarnings()` - Earnings history
- `getPresignedUrl(options)` - Screenshot upload URL
- `getProfileStats()` - Profile statistics

---

## Hooks

### useScreenRecording (`src/hooks/useScreenRecording.ts`)
- Manages screen recording for test execution
- Methods: `startRecording()`, `stopRecording()`
- Returns: `isRecording`, `startRecording`, `stopRecording`

---

## Middleware

### Middleware (`src/middleware.ts`)
- Likely handles authentication redirects and session validation

---

## Dev Server

- Port: 4002 (configured in package.json scripts)
- Start command: `npm run dev`

---

## Summary of All Pages

### Public (No Sidebar)
- `/` - Role detection redirect
- `/login` - Login form
- `/forgot-password` - Password reset
- `/signup/builder` - Builder registration
- `/signup/tester` - Tester registration

### Builder (24 total pages)
1. `/builder` - Dashboard overview
2. `/builder/test-cases` - Kanban/list board
3. `/builder/test-cases/new` - Create test
4. `/builder/test-cases/[id]` - Test detail
5. `/builder/templates` - Template listing
6. `/builder/templates/[id]` - Template schema
7. `/builder/credits` - Credit management
8. `/builder/settings` - Account settings

### Tester (8 total pages)
1. `/tester/tasks` - Task list with tabs
2. `/tester/tasks/[id]` - Task execution
3. `/tester/profile` - Profile management
4. `/tester/earnings` - Earnings history

### Total: 30 unique pages
