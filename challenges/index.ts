import { BEGINNER } from './beginner';
import { INTERMEDIATE } from './intermediate';
import { ADVANCED } from './advanced';
import { EXPERT } from './expert';
import type { Challenge, Level } from './types';

export type { Challenge, Level, Category } from './types';

export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export const ALL_CHALLENGES: Challenge[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED, ...EXPERT].sort((a, b) => a.id - b.id);

export const LEVEL_INFO: Record<Level, { title: string; blurb: string }> = {
  beginner: { title: 'Beginner', blurb: 'Login, navigation, basic locators, forms, dropdowns, checkboxes, radio buttons and assertions.' },
  intermediate: { title: 'Intermediate', blurb: 'Dynamic locators, tables, pagination, sorting, filtering, modals, toasts, files, iframes and dialogs.' },
  advanced: { title: 'Advanced', blurb: 'Nested iframes, popups, tabs, windows, auth state, cookies, storage, API responses and network interception.' },
  expert: { title: 'Expert', blurb: 'Hybrid UI + API + database flows, multiple users, parallel workflows, failures and the final secure payment.' },
};
