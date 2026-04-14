# BlendedAgents Email Design System

Reference document for all email composer agents. Every transactional and notification email must follow this system exactly.

---

## 1. Brand Colors

### Core Palette

| Token               | Hex       | Usage                                              |
|----------------------|-----------|-----------------------------------------------------|
| `page-bg`            | `#faf9fb` | Outer email background (body/wrapper table)          |
| `card-bg`            | `#ffffff` | Inner content card background                        |
| `card-border`        | `#dbd6e1` | 1px border around the card                           |
| `divider`            | `#ece8f0` | Header/footer separator lines                        |
| `text-primary`       | `#1d1127` | Headings, strong labels, primary text                |
| `text-body`          | `#645574` | Body paragraphs, descriptions                        |
| `text-muted`         | `#9c8fb0` | Captions, disclaimers, fallback URLs, footer text    |
| `accent-green`       | `#2ba185` | Primary CTA buttons, logo mark background            |
| `accent-purple`      | `#6c5fc7` | Secondary/cautionary CTA (password reset, destructive)|
| `white`              | `#ffffff` | Button text, logo letter                             |

### Semantic Colors (for info boxes, badges, states)

| Token               | Hex Background | Hex Border  | Hex Text    | Usage                          |
|----------------------|----------------|-------------|-------------|--------------------------------|
| `neutral-bg`         | `#f4f2f7`      | `#dbd6e1`   | `#645574`   | Informational callouts         |
| `success-bg`         | `#edf9f5`      | `#b3e6d6`   | `#1a7a60`   | Success states, passed tests   |
| `warning-bg`         | `#fef9ec`      | `#f5dfa0`   | `#8a6d1b`   | Warnings, pending states       |
| `error-bg`           | `#fdf2f2`      | `#f5b8b8`   | `#a33b3b`   | Errors, failed tests           |

### Badge / Pill Colors

| Status     | Background  | Text        |
|------------|-------------|-------------|
| `passed`   | `#edf9f5`   | `#1a7a60`   |
| `failed`   | `#fdf2f2`   | `#a33b3b`   |
| `active`   | `#edf9f5`   | `#1a7a60`   |
| `pending`  | `#fef9ec`   | `#8a6d1b`   |
| `expired`  | `#f4f2f7`   | `#645574`   |
| `cancelled`| `#f4f2f7`   | `#9c8fb0`   |

---

## 2. Typography

### Font Stack

```
font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

This is the ONLY font stack. Use it on the `<body>` and never override it except for code blocks.

### Monospace Font Stack (code blocks only)

```
font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
```

### Type Scale

| Element        | Size   | Weight | Color       | Line Height | Letter Spacing | Extra                  |
|----------------|--------|--------|-------------|-------------|----------------|------------------------|
| Brand name     | 18px   | 700    | `#1d1127`   | default     | `-0.02em`      | In header only         |
| H2 (title)     | 20px   | 700    | `#1d1127`   | default     | none           | `margin: 0 0 8px`     |
| Body           | 14px   | 400    | `#645574`   | 1.6         | none           | `margin: 0 0 16px` or `0 0 24px` |
| Small / helper | 13px   | 400    | `#9c8fb0`   | 1.5         | none           | Disclaimers, fallbacks |
| Caption        | 12px   | 400    | `#9c8fb0`   | 1.5         | none           | Footer text            |
| Strong label   | 13px   | 600    | `#1d1127`   | default     | none           | "What's next:" style   |
| List item      | 13px   | 400    | `#645574`   | 1.8         | none           | Inside `<ul>`          |
| Code / mono    | 13px   | 400    | `#1d1127`   | 1.5         | none           | Monospace font stack   |

---

## 3. Layout Rules

### Dimensions

| Property              | Value          |
|------------------------|---------------|
| Card max-width         | `480px`       |
| Card border-radius     | `12px`        |
| Card border            | `1px solid #dbd6e1` |
| Card background        | `#ffffff`     |
| Card overflow          | `hidden`      |
| Body padding (outer)   | `40px 0`      |
| Header padding         | `32px 32px 24px` |
| Body section padding   | `32px`        |
| Footer padding         | `20px 32px`   |

### Spacing System

All spacing uses multiples of 4px. Common values:

| Token    | Value  | Usage                                    |
|----------|--------|------------------------------------------|
| `xs`     | `4px`  | Tight gaps                               |
| `sm`     | `8px`  | Between heading and subtext              |
| `md`     | `12px` | Logo mark to brand name                  |
| `base`   | `16px` | Between paragraphs, between list and CTA |
| `lg`     | `24px` | Between body text and CTA, major sections|
| `xl`     | `32px` | Section padding                          |
| `xxl`    | `40px` | Outer wrapper padding                    |

### Borders

| Element          | Style                    |
|------------------|--------------------------|
| Card border      | `1px solid #dbd6e1`      |
| Header separator | `1px solid #ece8f0`      |
| Footer separator | `1px solid #ece8f0`      |
| Info box border  | `1px solid` + semantic   |
| Button radius    | `8px`                    |
| Card radius      | `12px`                   |
| Logo mark radius | `10px`                   |
| Badge radius     | `4px`                    |
| Code block radius| `6px`                    |
| Info box radius  | `8px`                    |

### Mobile Responsiveness

The card is set to `width="480"` on the inner table. For mobile clients, include this `@media` block inside a `<style>` tag in the `<head>` (it is supported by Apple Mail, Gmail app on iOS, and most modern mobile clients):

```html
<style>
  @media only screen and (max-width: 520px) {
    .email-card { width: 100% !important; }
    .email-body { padding: 24px 20px !important; }
    .email-header { padding: 24px 20px 20px !important; }
    .email-footer { padding: 16px 20px !important; }
  }
</style>
```

Apply the corresponding class names as attributes on the relevant `<td>` elements. Note: many email clients strip `<style>` blocks, so the inline styles are always the baseline. The `@media` block is a progressive enhancement.

---

## 4. Component Library

### 4.1 Email Wrapper (outer table + background)

Every email starts with this outer wrapper. Do not modify.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{EMAIL_TITLE}}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .email-card { width: 100% !important; }
      .email-body { padding: 24px 20px !important; }
      .email-header { padding: 24px 20px 20px !important; }
      .email-footer { padding: 16px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#faf9fb;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #dbd6e1;border-radius:12px;overflow:hidden;">

          <!-- HEADER -->
          <!-- BODY -->
          <!-- FOOTER -->

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### 4.2 Header (logo mark + brand name)

Identical in every email. Do not modify.

```html
<!-- Header -->
<tr>
  <td class="email-header" style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #ece8f0;">
    <div style="display:inline-block;width:44px;height:44px;background-color:#2ba185;border-radius:10px;line-height:44px;text-align:center;margin-bottom:12px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;">B</span>
    </div>
    <h1 style="margin:0;font-size:18px;font-weight:700;color:#1d1127;letter-spacing:-0.02em;">
      BlendedAgents
    </h1>
  </td>
</tr>
```

---

### 4.3 Body Section Open / Close

All body content goes inside a single `<tr><td>` with 32px padding.

```html
<!-- Body -->
<tr>
  <td class="email-body" style="padding:32px;">

    <!-- All body content here -->

  </td>
</tr>
```

---

### 4.4 Section Separator (within body)

Use between distinct content blocks within the body area. Not between header/body/footer -- those use the border-bottom/border-top approach.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-top:1px solid #ece8f0;font-size:0;line-height:0;height:1px;">&nbsp;</td>
  </tr>
</table>
```

---

### 4.5 CTA Button -- Primary

Used for the main action in the email. Green background.

```html
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#2ba185;border-radius:8px;">
      <a href="{{CTA_URL}}" target="_blank"
         style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        {{CTA_LABEL}}
      </a>
    </td>
  </tr>
</table>
```

### 4.6 CTA Button -- Secondary (Cautionary / Destructive)

Used for password resets, account deletion, security-sensitive actions. Purple background.

```html
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#6c5fc7;border-radius:8px;">
      <a href="{{CTA_URL}}" target="_blank"
         style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        {{CTA_LABEL}}
      </a>
    </td>
  </tr>
</table>
```

### 4.7 CTA Button -- Ghost / Tertiary

Used for optional secondary actions (e.g., "View documentation", "Learn more"). No background fill.

```html
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border:1px solid #dbd6e1;border-radius:8px;">
      <a href="{{CTA_URL}}" target="_blank"
         style="display:inline-block;padding:11px 28px;font-size:14px;font-weight:600;color:#1d1127;text-decoration:none;">
        {{CTA_LABEL}}
      </a>
    </td>
  </tr>
</table>
```

---

### 4.8 Info Box / Callout -- Neutral

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#f4f2f7;border:1px solid #dbd6e1;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#645574;">
        {{INFO_TEXT}}
      </p>
    </td>
  </tr>
</table>
```

### 4.9 Info Box / Callout -- Success

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#edf9f5;border:1px solid #b3e6d6;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#1a7a60;">
        {{SUCCESS_TEXT}}
      </p>
    </td>
  </tr>
</table>
```

### 4.10 Info Box / Callout -- Warning

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#fef9ec;border:1px solid #f5dfa0;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#8a6d1b;">
        {{WARNING_TEXT}}
      </p>
    </td>
  </tr>
</table>
```

### 4.11 Info Box / Callout -- Error

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#fdf2f2;border:1px solid #f5b8b8;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#a33b3b;">
        {{ERROR_TEXT}}
      </p>
    </td>
  </tr>
</table>
```

---

### 4.12 Data Row (label: value pairs)

Use for receipts, account summaries, credit balances, test case details. Each row is a `<tr>` inside a wrapper table.

**Single data row:**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
  <tr>
    <td style="padding:8px 0;font-size:13px;color:#9c8fb0;width:140px;vertical-align:top;">
      {{LABEL}}
    </td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1d1127;vertical-align:top;">
      {{VALUE}}
    </td>
  </tr>
</table>
```

**Full data block with multiple rows (preferred -- single table for alignment):**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="padding:8px 0;font-size:13px;color:#9c8fb0;width:140px;vertical-align:top;border-bottom:1px solid #ece8f0;">
      {{LABEL_1}}
    </td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1d1127;vertical-align:top;border-bottom:1px solid #ece8f0;">
      {{VALUE_1}}
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:13px;color:#9c8fb0;width:140px;vertical-align:top;border-bottom:1px solid #ece8f0;">
      {{LABEL_2}}
    </td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1d1127;vertical-align:top;border-bottom:1px solid #ece8f0;">
      {{VALUE_2}}
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:13px;color:#9c8fb0;width:140px;vertical-align:top;">
      {{LABEL_3}}
    </td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1d1127;vertical-align:top;">
      {{VALUE_3}}
    </td>
  </tr>
</table>
```

Note: the last row in a data block omits the `border-bottom` to avoid a double line before the next section.

---

### 4.13 Code Block

Use for API keys, credit amounts, referral codes, URLs, or any machine-readable value.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#f4f2f7;border:1px solid #dbd6e1;border-radius:6px;padding:12px 16px;">
      <code style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace;font-size:13px;color:#1d1127;word-break:break-all;">
        {{CODE_VALUE}}
      </code>
    </td>
  </tr>
</table>
```

**Inline code** (within a paragraph):

```html
<code style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace;font-size:12px;color:#1d1127;background-color:#f4f2f7;padding:2px 6px;border-radius:4px;">{{CODE_VALUE}}</code>
```

---

### 4.14 Styled Bullet List

```html
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1d1127;">
  {{LIST_HEADING}}
</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:13px;line-height:1.8;color:#645574;">
  <li>{{ITEM_1}}</li>
  <li>{{ITEM_2}}</li>
  <li>{{ITEM_3}}</li>
</ul>
```

If no heading is needed, omit the `<p>` and set the `<ul>` margin to `0 0 24px`.

---

### 4.15 Footer

Standard across every email. The `{{FOOTER_REASON}}` line explains why the user got this email.

```html
<!-- Footer -->
<tr>
  <td class="email-footer" style="padding:20px 32px;border-top:1px solid #ece8f0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9c8fb0;">
      {{FOOTER_TEXT}}
    </p>
  </td>
</tr>
```

Footer text guidelines:
- First line: why they received this email. Example: "You received this email because you signed up for BlendedAgents."
- Second line (optional, after `<br />`): safety note or expiry info. Example: "If you didn't create an account, you can safely ignore this email."
- Never include unsubscribe links for transactional emails (they are required by the action).
- For marketing/notification emails that are optional: add an unsubscribe line after a `<br />`:

```html
<br /><a href="{{UNSUBSCRIBE_URL}}" style="color:#9c8fb0;text-decoration:underline;">Unsubscribe</a>
```

---

### 4.16 Badge / Status Pill

Use inline within text or inside data rows to show statuses.

```html
<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;line-height:1.5;border-radius:4px;background-color:{{BADGE_BG}};color:{{BADGE_TEXT}};">
  {{BADGE_LABEL}}
</span>
```

Example for "Passed":
```html
<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;line-height:1.5;border-radius:4px;background-color:#edf9f5;color:#1a7a60;">
  Passed
</span>
```

Example for "Failed":
```html
<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;line-height:1.5;border-radius:4px;background-color:#fdf2f2;color:#a33b3b;">
  Failed
</span>
```

---

### 4.17 Fallback URL Block

For emails with a CTA button, always provide a plaintext fallback link below the button.

```html
<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#9c8fb0;">
  If the button doesn't work, copy and paste this link into your browser:
</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#9c8fb0;word-break:break-all;">
  {{FALLBACK_URL}}
</p>
```

---

### 4.18 Heading with Personalization

When addressing the user by name:

```html
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1d1127;">
  {{GREETING}}, {{DISPLAY_NAME}}!
</h2>
```

When no personalization:

```html
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1d1127;">
  {{HEADING_TEXT}}
</h2>
```

---

### 4.19 Amount / Highlight Number

For showing credit amounts, dollar values, or key metrics prominently.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="text-align:center;padding:20px 0;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9c8fb0;">
        {{AMOUNT_LABEL}}
      </p>
      <p style="margin:0;font-size:32px;font-weight:700;color:#1d1127;">
        {{AMOUNT_VALUE}}
      </p>
    </td>
  </tr>
</table>
```

---

## 5. Template Structure (Complete Base Skeleton)

Every email agent MUST start from this skeleton. Replace the placeholder comments with actual components from Section 4.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{EMAIL_TITLE}}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .email-card { width: 100% !important; }
      .email-body { padding: 24px 20px !important; }
      .email-header { padding: 24px 20px 20px !important; }
      .email-footer { padding: 16px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#faf9fb;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #dbd6e1;border-radius:12px;overflow:hidden;">

          <!-- ============ HEADER ============ -->
          <tr>
            <td class="email-header" style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #ece8f0;">
              <div style="display:inline-block;width:44px;height:44px;background-color:#2ba185;border-radius:10px;line-height:44px;text-align:center;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;">B</span>
              </div>
              <h1 style="margin:0;font-size:18px;font-weight:700;color:#1d1127;letter-spacing:-0.02em;">
                BlendedAgents
              </h1>
            </td>
          </tr>

          <!-- ============ BODY ============ -->
          <tr>
            <td class="email-body" style="padding:32px;">

              <!-- Heading -->
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1d1127;">
                {{HEADING}}
              </h2>

              <!-- Body text -->
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#645574;">
                {{BODY_TEXT}}
              </p>

              <!-- Primary CTA (if needed) -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#2ba185;border-radius:8px;">
                    <a href="{{CTA_URL}}" target="_blank"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      {{CTA_LABEL}}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Additional content: info boxes, data rows, lists, etc. -->

            </td>
          </tr>

          <!-- ============ FOOTER ============ -->
          <tr>
            <td class="email-footer" style="padding:20px 32px;border-top:1px solid #ece8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9c8fb0;">
                {{FOOTER_TEXT}}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 6. Tone Guidelines

### Voice and Personality

BlendedAgents speaks to developers and AI agents. The tone is:

- **Direct.** Say what you need to say in one sentence, not three. "Your credits have been added." not "We are pleased to inform you that your credit balance has been updated."
- **Developer-friendly.** Assume the reader understands technical terms. Use "API key," "webhook," "endpoint" without explanation.
- **Confident but not arrogant.** State facts. Avoid hedging ("We think you might want to...") and hype ("Amazing news!").
- **Respectful of time.** Every email should be scannable in under 10 seconds. Lead with what happened, then what to do about it.

### Writing Rules

1. **Subject lines:** Actionable and specific. "Your test results are ready" not "Update from BlendedAgents." Include the key noun: credits, test, payout, account.
2. **Opening line:** State the event or outcome immediately. No pleasantries ("Hope you're doing well").
3. **CTA buttons:** Use verb-first labels. "View Results" not "Click Here." 2-3 words max.
4. **Numbers:** Use exact values. "$12.50" not "your balance." "3 of 5 tests passed" not "most tests passed."
5. **No exclamation marks** except in genuinely celebratory contexts (account approval, first payout). Maximum one per email.
6. **No emoji** in email body text. The brand is clean and professional.
7. **Contractions are fine.** "You're" over "You are." "Didn't" over "Did not." Keeps it human.
8. **Error emails:** Be factual, not apologetic. State what happened, what it means, what they can do.
9. **Footer disclaimers:** Always explain why they received the email. Use passive voice here -- it's expected: "You received this email because..."

### Subject Line Examples

| Email Type                | Good Subject Line                      | Bad Subject Line              |
|---------------------------|----------------------------------------|-------------------------------|
| Test results ready        | "3 of 5 tests passed for ProjectName"  | "Your test results!"         |
| Credits purchased         | "250 credits added to your account"    | "Purchase confirmation"      |
| Payout sent               | "$150.00 payout initiated"             | "Great news about your money"|
| Account approved          | "You're approved -- start testing"     | "Welcome to BlendedAgents!"  |
| Test assigned to tester   | "New test available: LoginFlow"        | "You have a new task"        |
| API key created           | "Your new API key is ready"            | "API key notification"       |
| Password reset            | "Reset your BlendedAgents password"    | "Password help"              |
| Low credit warning        | "Your credit balance is running low"   | "Important account update"   |

---

## 7. Variable Convention

All template variables use double curly braces with SCREAMING_SNAKE_CASE:

```
{{VARIABLE_NAME}}
```

### Reserved Variable Names

These variables are available globally across all email templates:

| Variable              | Type   | Description                                |
|-----------------------|--------|--------------------------------------------|
| `{{DISPLAY_NAME}}`    | string | User's display name or first name          |
| `{{EMAIL_ADDRESS}}`   | string | Recipient's email address                  |
| `{{DASHBOARD_URL}}`   | string | Link to the user's dashboard               |
| `{{SUPPORT_URL}}`     | string | Link to support/help page                  |
| `{{UNSUBSCRIBE_URL}}` | string | Unsubscribe link (notification emails only)|
| `{{CURRENT_YEAR}}`    | string | Four-digit year for copyright footers      |

### Naming Rules

1. Use `SCREAMING_SNAKE_CASE` -- all uppercase, underscores between words.
2. Prefix with the domain when ambiguous: `TEST_NAME`, `CREDIT_AMOUNT`, `PAYOUT_TOTAL`.
3. URL variables end in `_URL`: `DASHBOARD_URL`, `RESULTS_URL`, `CONFIRMATION_URL`.
4. Count variables end in `_COUNT`: `TEST_COUNT`, `CREDIT_COUNT`.
5. Date variables end in `_DATE`: `CREATED_DATE`, `EXPIRY_DATE`.
6. Amount variables end in `_AMOUNT`: `CREDIT_AMOUNT`, `PAYOUT_AMOUNT`.
7. Boolean-driven sections: use HTML comments to mark conditional blocks that the backend will include or exclude:

```html
<!-- IF:HAS_SCREEN_RECORDING -->
<p style="...">A screen recording is available for this test.</p>
<!-- ENDIF:HAS_SCREEN_RECORDING -->
```

### Supabase / Go Template Compatibility Note

Some emails (confirm-signup, magic-link, reset-password) are rendered by Supabase Auth, which uses Go template syntax: `{{ .ConfirmationURL }}`. For those specific templates, use the Supabase syntax as-is. For all new emails rendered by the BlendedAgents backend, use the `{{VARIABLE_NAME}}` convention documented here.

---

## 8. Quick Reference Checklist

Before submitting any email template, verify:

- [ ] Uses the exact base skeleton from Section 5
- [ ] Header is identical to Section 4.2 (no modifications)
- [ ] All CSS is inline (no external stylesheets, no `<style>` except the mobile `@media` block)
- [ ] Layout uses `<table role="presentation">` -- no `<div>` for structure
- [ ] Card width is `480` with `class="email-card"`
- [ ] Body padding td has `class="email-body"`
- [ ] Font stack matches exactly: `'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`
- [ ] Colors match the palette in Section 1 -- no custom or approximate values
- [ ] CTA button uses the correct variant (green primary / purple secondary / ghost tertiary)
- [ ] Every CTA button has a fallback URL block below it
- [ ] Footer explains why the user received this email
- [ ] Variables use `{{SCREAMING_SNAKE_CASE}}`
- [ ] No emoji anywhere in the template
- [ ] `<title>` tag contains a meaningful value
- [ ] `lang="en"` is set on `<html>`
- [ ] All `<table>` tags include `role="presentation"`, `cellpadding="0"`, `cellspacing="0"`
- [ ] All images (if any) have `alt` text, `width`/`height` attributes, and `style="display:block;"`
- [ ] No JavaScript -- email clients strip it
- [ ] Tested rendering: single column at 480px, no horizontal scroll

---

## 9. Anti-Patterns (Do Not Do)

1. **Do not use `<div>` for layout.** Outlook does not support CSS on divs reliably. Use tables.
2. **Do not use `float`, `flexbox`, or `grid`.** Email clients have inconsistent support.
3. **Do not use `position: absolute` or `position: relative`** for layout purposes.
4. **Do not use `margin` on tables for centering.** Use `align="center"` on the `<td>`.
5. **Do not use shorthand CSS** where possible. Write `padding-top:12px;padding-right:28px;padding-bottom:12px;padding-left:28px;` only if shorthand fails in testing -- in practice `padding:12px 28px;` works in all major clients and is our standard.
6. **Do not add images from external URLs** without a fallback. Always set `alt` text that makes sense on its own.
7. **Do not nest tables more than 3 levels deep.** Our structure is: outer wrapper > card > component. That is the limit.
8. **Do not invent new colors.** Use only the colors defined in Section 1.
9. **Do not change the header or footer structure.** They are locked.
10. **Do not use `<h1>` in the body.** `<h1>` is reserved for the brand name in the header. Body headings use `<h2>`.
