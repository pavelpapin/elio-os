#!/usr/bin/env node
/**
 * Elio CLI
 * All skills/workflows run via BullMQ queue
 */

import { execSync } from 'child_process'
import * as memory from './managers/memory.js'
import * as jobs from './managers/jobs.js'
import * as skills from './managers/skills.js'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
}

function log(msg: string, color: keyof typeof colors = 'reset'): void {
  console.log(colors[color] + msg + colors.reset)
}

async function main(): Promise<void> {
  const [,, command, ...args] = process.argv

  switch (command) {
    case 'skill':
      await handleSkill(args)
      break
    case 'job':
      await handleJob(args)
      break
    case 'memory':
      await handleMemory(args)
      break
    case 'status':
      await showStatus()
      break
    case 'help':
    default:
      showHelp()
  }
}

async function handleSkill(args: string[]): Promise<void> {
  const [name, ...skillArgs] = args

  if (!name) {
    log('Available skills:', 'blue')
    skills.listSkills().forEach(s => log(`  - ${s.name}: ${s.description}`))
    return
  }

  log(`Running skill via BullMQ: ${name}`, 'blue')
  try {
    // Run with streaming output
    const result = await skills.runSkillWithStream(name, skillArgs, (update) => {
      if (update.type === 'output') {
        console.log(update.content)
      } else if (update.type === 'progress') {
        log(`[Progress] ${update.content}`, 'cyan')
      } else if (update.type === 'thinking') {
        log(`[Thinking] ${update.content}`, 'dim')
      }
    })

    log('Skill completed', 'green')
    console.log(result)
  } catch (err) {
    log(`Error: ${(err as Error).message}`, 'red')
    process.exit(1)
  }
}

async function handleJob(args: string[]): Promise<void> {
  const [sub, ...subargs] = args

  switch (sub) {
    case 'create': {
      const [skill, inputJson] = subargs
      const inputs = inputJson ? JSON.parse(inputJson) : {}
      try {
        const job = await jobs.createJob('skill', skill, inputs, 'cli')
        log(`Created job: ${job.id}`, 'green')
        log(`Status: queued in BullMQ`, 'dim')
      } catch (err) {
        log(`Error: ${(err as Error).message}`, 'red')
      }
      break
    }
    case 'run': {
      const result = await jobs.runJob(subargs[0])
      console.log(JSON.stringify(result, null, 2))
      break
    }
    case 'status': {
      const job = await jobs.loadJob(subargs[0])
      console.log(JSON.stringify(job, null, 2))
      break
    }
    case 'list': {
      const queued = await jobs.getQueuedJobs()
      const active = await jobs.getActiveJobs()
      log(`Queued: ${queued.length}, Active: ${active.length}`, 'blue')
      queued.forEach(j => log(`  [Q] ${j.id} - ${j.skill}`))
      active.forEach(j => log(`  [A] ${j.id} - ${j.skill}`))
      break
    }
    case 'cancel': {
      const success = await jobs.cancelJob(subargs[0])
      if (success) {
        log(`Job cancelled: ${subargs[0]}`, 'green')
      } else {
        log(`Failed to cancel job: ${subargs[0]}`, 'red')
      }
      break
    }
    case 'watch': {
      log(`Watching job: ${subargs[0]}`, 'blue')
      const unsubscribe = await jobs.subscribeToJob(subargs[0], (update) => {
        const prefix = update.type === 'error' ? '[ERROR]' :
                       update.type === 'completed' ? '[DONE]' :
                       update.type === 'progress' ? '[PROGRESS]' : '[OUTPUT]'
        log(`${prefix} ${update.content}`, update.type === 'error' ? 'red' : 'reset')

        if (update.type === 'completed' || update.type === 'error') {
          unsubscribe()
          process.exit(update.type === 'error' ? 1 : 0)
        }
      })
      break
    }
    default:
      log('Usage: elio job <create|run|status|list|cancel|watch>', 'yellow')
  }
}

async function handleMemory(args: string[]): Promise<void> {
  const [sub, ...subargs] = args

  switch (sub) {
    case 'search':
      console.log(JSON.stringify(memory.searchMemory(subargs.join(' ')), null, 2))
      break
    case 'add-fact':
      const fact = memory.addFact('user', subargs.join(' '), 'cli')
      log(`Added fact: ${fact.id}`, 'green')
      break
    case 'facts':
      console.log(JSON.stringify(memory.getFacts(subargs[0]), null, 2))
      break
    case 'people':
      console.log(JSON.stringify(memory.listPeople(), null, 2))
      break
    case 'projects':
      console.log(JSON.stringify(memory.listProjects(), null, 2))
      break
    default:
      log('Usage: elio memory <search|add-fact|facts|people|projects>', 'yellow')
  }
}

async function showStatus(): Promise<void> {
  log('=== Elio OS Status ===', 'blue')

  // Check bot service
  try {
    const status = execSync('systemctl is-active elio-bot 2>/dev/null', { encoding: 'utf-8' }).trim()
    log(`Bot: ${status}`, status === 'active' ? 'green' : 'red')
  } catch {
    log('Bot: inactive', 'red')
  }

  // Check Redis
  try {
    execSync('redis-cli ping >/dev/null 2>&1')
    log('Redis: active', 'green')
  } catch {
    log('Redis: inactive (BullMQ requires Redis)', 'red')
  }

  // Check Worker
  try {
    const status = execSync('systemctl is-active elio-worker 2>/dev/null', { encoding: 'utf-8' }).trim()
    log(`Worker: ${status}`, status === 'active' ? 'green' : 'red')
  } catch {
    log('Worker: inactive (required for job processing)', 'yellow')
  }

  // Skills
  const skillList = skills.listSkills()
  log(`Skills: ${skillList.length} (${skillList.map(s => s.name).join(', ')})`, 'dim')

  // Jobs
  const queued = await jobs.getQueuedJobs()
  const active = await jobs.getActiveJobs()
  log(`Jobs: ${queued.length} queued, ${active.length} active`, 'dim')

  // Memory
  const facts = memory.getFacts()
  const people = memory.listPeople()
  const projects = memory.listProjects()
  log(`Memory: ${facts.length} facts, ${people.length} people, ${projects.length} projects`, 'dim')
}

function showHelp(): void {
  log('=== Elio CLI (BullMQ) ===', 'blue')
  log('')
  log('All skills and workflows run via BullMQ queue.', 'dim')
  log('Requires Redis and elio-worker service.', 'dim')
  log('')
  log('Commands:', 'yellow')
  log('  elio skill [name] [args]    Run a skill (via queue)')
  log('  elio job create <skill>     Create async job')
  log('  elio job run <id>           Run/resume job')
  log('  elio job status <id>        Check job status')
  log('  elio job list               List jobs')
  log('  elio job cancel <id>        Cancel running job')
  log('  elio job watch <id>         Watch job output stream')
  log('  elio memory search <query>  Search memory')
  log('  elio memory add-fact <text> Add fact')
  log('  elio memory facts           List facts')
  log('  elio memory people          List people')
  log('  elio memory projects        List projects')
  log('  elio status                 System status')
  log('  elio help                   Show this help')
}

main().catch(err => {
  log(`Error: ${err.message}`, 'red')
  process.exit(1)
})
