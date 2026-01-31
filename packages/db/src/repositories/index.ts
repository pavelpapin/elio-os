/**
 * Repositories Index
 * Centralized repository access
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowRepository } from './workflow.js';
import { ScheduleRepository } from './schedule.js';
import { MessageRepository } from './message.js';
import { TaskRepository } from './task.js';
import { PersonRepository } from './person.js';
import { AuditRepository } from './audit.js';
import { StateRepository } from './state.js';
import { BacklogRepository } from './backlog.js';

export * from './base.js';
export * from './workflow.js';
export * from './schedule.js';
export * from './message.js';
export * from './task.js';
export * from './person.js';
export * from './audit.js';
export * from './state.js';
export * from './backlog.js';

export interface Repositories {
  workflow: WorkflowRepository;
  schedule: ScheduleRepository;
  message: MessageRepository;
  task: TaskRepository;
  person: PersonRepository;
  audit: AuditRepository;
  state: StateRepository;
  backlog: BacklogRepository;
}

export function createRepositories(client: SupabaseClient): Repositories {
  return {
    workflow: new WorkflowRepository(client),
    schedule: new ScheduleRepository(client),
    message: new MessageRepository(client),
    task: new TaskRepository(client),
    person: new PersonRepository(client),
    audit: new AuditRepository(client),
    state: new StateRepository(client),
    backlog: new BacklogRepository(client)
  };
}
