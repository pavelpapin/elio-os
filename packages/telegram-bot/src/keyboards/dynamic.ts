/**
 * Dynamic Keyboard Builders
 */

import { InlineKeyboard, button, CallbackAction } from '../types/keyboards';

export interface JobInfo {
  id: string;
  name: string;
  enabled: boolean;
}

export function buildJobListKeyboard(jobs: JobInfo[]): InlineKeyboard {
  const rows = jobs.map(job => [
    button(
      `${job.enabled ? '✅' : '⏸️'} ${job.name}`,
      'job:toggle',
      job.id
    )
  ]);

  rows.push([button('« Back', 'menu:jobs')]);

  return { inline_keyboard: rows };
}

export interface SkillOption {
  id: string;
  name: string;
  emoji: string;
}

export function buildSkillOptionsKeyboard(
  options: SkillOption[],
  backAction: string = 'menu:skills'
): InlineKeyboard {
  const rows = options.map(opt => [
    button(`${opt.emoji} ${opt.name}`, `skill:${opt.id}` as unknown as CallbackAction)
  ]);

  rows.push([button('« Back', backAction as unknown as CallbackAction)]);

  return { inline_keyboard: rows };
}

export function buildPaginationKeyboard(
  currentPage: number,
  totalPages: number,
  prefix: string
): InlineKeyboard {
  const buttons = [];

  if (currentPage > 1) {
    buttons.push(button('« Prev', `${prefix}:page` as unknown as CallbackAction, String(currentPage - 1)));
  }

  buttons.push(button(`${currentPage}/${totalPages}`, 'cancel'));

  if (currentPage < totalPages) {
    buttons.push(button('Next »', `${prefix}:page` as unknown as CallbackAction, String(currentPage + 1)));
  }

  return {
    inline_keyboard: [
      buttons,
      [button('« Back', 'menu:main')]
    ]
  };
}

export function buildResearchDepthKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        button('⚡ Quick (3)', 'skill:research', 'quick'),
        button('📊 Medium (5)', 'skill:research', 'medium')
      ],
      [
        button('🔬 Deep (7)', 'skill:research', 'deep')
      ],
      [button('« Back', 'menu:skills')]
    ]
  };
}
