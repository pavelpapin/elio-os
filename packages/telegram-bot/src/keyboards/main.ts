/**
 * Main Menu Keyboards
 */

import { InlineKeyboard, button } from '../types/keyboards';

export const mainMenuKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      button('🔬 Skills', 'menu:skills'),
      button('⏰ Jobs', 'menu:jobs')
    ],
    [
      button('🧠 Memory', 'menu:memory'),
      button('⚙️ Settings', 'menu:settings')
    ],
    [
      button('🔄 New Session', 'session:new')
    ]
  ]
};

export const skillsMenuKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      button('🔍 Deep Research', 'skill:research'),
      button('📺 YouTube', 'skill:youtube')
    ],
    [
      button('👤 Person OSINT', 'skill:person'),
      button('🌐 Web Search', 'skill:websearch')
    ],
    [
      button('« Back', 'menu:main')
    ]
  ]
};

export const jobsMenuKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      button('📋 List Jobs', 'job:list'),
      button('➕ Add Job', 'job:add')
    ],
    [
      button('« Back', 'menu:main')
    ]
  ]
};

export const memoryMenuKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      button('📝 Facts', 'memory:facts'),
      button('👥 People', 'memory:people')
    ],
    [
      button('« Back', 'menu:main')
    ]
  ]
};

export const settingsMenuKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      button('📊 Status', 'session:status')
    ],
    [
      button('« Back', 'menu:main')
    ]
  ]
};

export const backToMainKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [button('« Back to Menu', 'menu:main')]
  ]
};

export const cancelKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [button('❌ Cancel', 'cancel')]
  ]
};

export const confirmKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      button('✅ Confirm', 'confirm'),
      button('❌ Cancel', 'cancel')
    ]
  ]
};
