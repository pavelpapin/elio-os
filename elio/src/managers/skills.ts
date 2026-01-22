/**
 * Skills Manager
 * Run skills via BullMQ queue (no direct spawn)
 */

import * as fs from 'fs'
import * as path from 'path'
import type { SkillConfig } from '../types/index.js'
import { SKILLS_DIR } from '../utils/paths.js'
import { readJson } from '../utils/fs.js'
import { createJob, subscribeToJob } from './jobs.js'

export function listSkills(): SkillConfig[] {
  if (!fs.existsSync(SKILLS_DIR)) return []

  return fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'skill.json')))
    .map(d => readJson<SkillConfig>(path.join(SKILLS_DIR, d, 'skill.json')))
    .filter((s): s is SkillConfig => s !== null)
}

export function getSkill(name: string): SkillConfig | null {
  return readJson<SkillConfig>(path.join(SKILLS_DIR, name, 'skill.json'))
}

/**
 * Run skill via BullMQ queue
 * Returns output when skill completes
 */
export async function runSkill(name: string, args: string[]): Promise<string> {
  const skill = getSkill(name)
  if (!skill) {
    throw new Error(`Skill not found: ${name}`)
  }

  // Convert args to inputs object based on skill config
  const inputs: Record<string, unknown> = {}
  const inputKeys = Object.keys(skill.inputs || {})

  args.forEach((arg, index) => {
    const key = inputKeys[index] || `arg${index}`
    inputs[key] = arg
  })

  // Create job in BullMQ queue
  const job = await createJob('skill', name, inputs, 'cli')

  // Wait for completion via stream subscription
  return new Promise((resolve, reject) => {
    const outputs: string[] = []
    const timeout = setTimeout(() => {
      reject(new Error(`Skill execution timeout after ${skill.timeout || 300}s`))
    }, (skill.timeout || 300) * 1000)

    subscribeToJob(job.id, (update) => {
      if (update.type === 'output') {
        outputs.push(update.content)
      } else if (update.type === 'completed') {
        clearTimeout(timeout)
        resolve(outputs.join('\n'))
      } else if (update.type === 'error') {
        clearTimeout(timeout)
        reject(new Error(update.content))
      }
    }).catch(reject)
  })
}

/**
 * Run skill with real-time output streaming
 */
export async function runSkillWithStream(
  name: string,
  args: string[],
  onOutput: (update: { type: string; content: string }) => void
): Promise<string> {
  const skill = getSkill(name)
  if (!skill) {
    throw new Error(`Skill not found: ${name}`)
  }

  const inputs: Record<string, unknown> = {}
  const inputKeys = Object.keys(skill.inputs || {})

  args.forEach((arg, index) => {
    const key = inputKeys[index] || `arg${index}`
    inputs[key] = arg
  })

  const job = await createJob('skill', name, inputs, 'cli')

  return new Promise((resolve, reject) => {
    const outputs: string[] = []
    const timeout = setTimeout(() => {
      reject(new Error(`Skill execution timeout after ${skill.timeout || 300}s`))
    }, (skill.timeout || 300) * 1000)

    subscribeToJob(job.id, (update) => {
      onOutput(update)

      if (update.type === 'output') {
        outputs.push(update.content)
      } else if (update.type === 'completed') {
        clearTimeout(timeout)
        resolve(outputs.join('\n'))
      } else if (update.type === 'error') {
        clearTimeout(timeout)
        reject(new Error(update.content))
      }
    }).catch(reject)
  })
}

/**
 * Get skill status from workflow state
 */
export async function getSkillStatus(jobId: string): Promise<{
  status: string
  progress: number
  error?: string
} | null> {
  try {
    const workflow = await import('@elio/workflow')
    const client = workflow.createWorkflowClient()
    return client.query(`skill-${jobId}`, 'status')
  } catch {
    return null
  }
}
