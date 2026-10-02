export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type Category =
  | 'Authentication'
  | 'Locators'
  | 'Forms'
  | 'Tables'
  | 'Modals & Toasts'
  | 'iFrames'
  | 'Dialogs'
  | 'Popups & Windows'
  | 'Files'
  | 'API'
  | 'Network'
  | 'Workflows';

export interface Challenge {
  id: number;
  level: Level;
  title: string;
  category: Category;
  /** Route in the app where the challenge is practiced. */
  page: string;
  description: string;
  objective: string;
  skills: string[];
  expected: string;
  hints: [string, string, string];
  /** A complete Playwright test. */
  solution: string;
  /** "Why this locator? Why waitForResponse?" style explanations. */
  why: string[];
}

/** Small helper so challenge files stay compact. */
export const ch = (c: Omit<Challenge, 'level'>, level: Level): Challenge => ({ ...c, level, solution: c.solution.trim() });

export const FIXTURE_IMPORT = "import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john";
export const BASE_IMPORT = "import { test, expect } from '@playwright/test';";
