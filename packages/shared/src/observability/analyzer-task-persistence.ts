/**
 * Improvement Task Persistence
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ImprovementTask } from './analyzer-types.js';

const IMPROVEMENTS_DIR = '/root/.claude/logs/improvements';

function ensureDir(): void {
  if (!existsSync(IMPROVEMENTS_DIR)) {
    mkdirSync(IMPROVEMENTS_DIR, { recursive: true });
  }
}

/**
 * Save improvement task to file
 */
export function saveImprovementTask(task: ImprovementTask): void {
  ensureDir();
  const tasksFile = join(IMPROVEMENTS_DIR, 'pending-tasks.json');

  let tasks: ImprovementTask[] = [];
  if (existsSync(tasksFile)) {
    tasks = JSON.parse(readFileSync(tasksFile, 'utf-8'));
  }

  // Check if similar task exists
  const existing = tasks.find(t =>
    t.title === task.title &&
    t.status === 'pending'
  );

  if (!existing) {
    tasks.push(task);
    writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
  }
}

/**
 * Get all pending improvement tasks
 */
export function getPendingTasks(): ImprovementTask[] {
  ensureDir();
  const tasksFile = join(IMPROVEMENTS_DIR, 'pending-tasks.json');

  if (!existsSync(tasksFile)) return [];

  const tasks: ImprovementTask[] = JSON.parse(readFileSync(tasksFile, 'utf-8'));
  return tasks.filter(t => t.status === 'pending');
}

/**
 * Update task status
 */
export function updateTaskStatus(
  taskId: string,
  status: ImprovementTask['status'],
  resolution?: string
): void {
  ensureDir();
  const tasksFile = join(IMPROVEMENTS_DIR, 'pending-tasks.json');

  if (!existsSync(tasksFile)) return;

  const tasks: ImprovementTask[] = JSON.parse(readFileSync(tasksFile, 'utf-8'));
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    task.status = status;
    if (resolution) task.resolution = resolution;
    writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
  }
}
