import { Injectable, Logger } from '@nestjs/common';

export interface LinkedInApplyResult {
  success: boolean;
  message: string;
}

/**
 * LinkedIn Easy Apply via Playwright headless browser automation.
 *
 * SETUP REQUIRED:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * In production Docker: base image mcr.microsoft.com/playwright:v1.44.0-jammy
 * Env vars: LINKEDIN_EMAIL, LINKEDIN_PASSWORD (shared service account)
 *            OR per-candidate LinkedIn session cookies (preferred to avoid 2FA)
 *
 * NOTE: LinkedIn actively detects automation. Production use requires:
 *   - Stealth mode (playwright-extra + puppeteer-extra-plugin-stealth)
 *   - Human-like delays between actions
 *   - Per-candidate session cookies to avoid repeated login flags
 *   - Residential proxy rotation for scale
 */
@Injectable()
export class LinkedInApplyService {
  private readonly logger = new Logger(LinkedInApplyService.name);

  async apply(params: {
    jobUrl: string;
    candidateName: string;
    email: string;
    phone?: string;
    coverLetter?: string;
    linkedinEmail?: string;
    linkedinPassword?: string;
  }): Promise<LinkedInApplyResult> {
    // Dynamically require playwright to avoid startup crash if not installed
    let chromium: any;
    try {
      // Dynamic require so missing playwright doesn't crash at startup (installed separately)

      const pw = require('playwright');
      chromium = pw.chromium;
    } catch {
      throw new Error(
        'Playwright not installed. Run: npm install playwright && npx playwright install chromium',
      );
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    try {
      // Log in if credentials provided
      if (params.linkedinEmail && params.linkedinPassword) {
        await page.goto('https://www.linkedin.com/login', {
          waitUntil: 'networkidle',
        });
        await page.fill('#username', params.linkedinEmail);
        await page.fill('#password', params.linkedinPassword);
        await page.click('[type="submit"]');
        await page
          .waitForNavigation({ waitUntil: 'networkidle', timeout: 15_000 })
          .catch(() => {});

        // Check if login succeeded (no challenge page)
        if (
          page.url().includes('challenge') ||
          page.url().includes('checkpoint')
        ) {
          throw new Error(
            'LinkedIn login challenge (CAPTCHA/2FA) — manual intervention needed',
          );
        }
      }

      // Navigate to job
      await page.goto(params.jobUrl, {
        waitUntil: 'networkidle',
        timeout: 20_000,
      });
      await page.waitForTimeout(1500);

      // Click Easy Apply button
      const easyApplyBtn = page
        .locator('button:has-text("Easy Apply"), button.jobs-apply-button')
        .first();
      if (
        !(await easyApplyBtn.isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        return {
          success: false,
          message:
            'Easy Apply button not found — job may not support Easy Apply',
        };
      }
      await easyApplyBtn.click();
      await page.waitForTimeout(1000);

      // Fill modal form fields (name, phone, email if present)
      await this.fillFormField(
        page,
        '[id*="phoneNumber"], [name*="phone"]',
        params.phone ?? '',
      );
      await this.fillFormField(
        page,
        '[id*="email"], [name*="email"]',
        params.email,
      );

      // Cover letter textarea if visible
      if (params.coverLetter) {
        const coverLetterArea = page
          .locator('textarea[id*="coverLetter"], textarea[name*="coverLetter"]')
          .first();
        if (
          await coverLetterArea.isVisible({ timeout: 2_000 }).catch(() => false)
        ) {
          await coverLetterArea.fill(params.coverLetter);
        }
      }

      // Walk through multi-step form — click Next/Review/Submit
      for (let step = 0; step < 10; step++) {
        await page.waitForTimeout(800);

        const submitBtn = page
          .locator('button[aria-label*="Submit application"]')
          .first();
        if (await submitBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(2_000);
          this.logger.log(
            { jobUrl: params.jobUrl, candidate: params.candidateName },
            'LinkedIn application submitted',
          );
          return {
            success: true,
            message: 'Application submitted via Easy Apply',
          };
        }

        const nextBtn = page
          .locator(
            'button[aria-label="Continue to next step"], button:has-text("Next")',
          )
          .first();
        if (await nextBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await nextBtn.click();
        } else {
          break;
        }
      }

      return {
        success: false,
        message:
          'Could not complete Easy Apply form — unexpected form structure',
      };
    } finally {
      await browser.close();
    }
  }

  private async fillFormField(page: any, selector: string, value: string) {
    if (!value) return;
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await el.clear();
        await el.fill(value);
      }
    } catch {
      /* field not present */
    }
  }
}
