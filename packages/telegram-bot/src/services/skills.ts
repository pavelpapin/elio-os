/**
 * Skills Service
 * Runs Elio skills via BullMQ skill-execution queue
 */

import { submitSkillJob, subscribeToJob } from './bullmq.js';

export interface SkillResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function runSkill(
  skillName: string,
  args: string[]
): Promise<SkillResult> {
  try {
    const { workflowId } = await submitSkillJob(skillName, args);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, output: '', error: 'Skill timeout' });
      }, 120_000);

      subscribeToJob(
        workflowId,
        () => {},
        (output) => {
          clearTimeout(timeout);
          resolve({ success: true, output: output.trim() });
        },
        (error) => {
          clearTimeout(timeout);
          resolve({ success: false, output: '', error });
        }
      ).catch((err) => {
        clearTimeout(timeout);
        resolve({ success: false, output: '', error: (err as Error).message });
      });
    });
  } catch (err) {
    return { success: false, output: '', error: (err as Error).message };
  }
}

export function formatSkillOutput(result: SkillResult): string {
  if (!result.success) {
    return `❌ Ошибка: ${result.error || 'Unknown error'}`;
  }

  try {
    const json = JSON.parse(result.output);

    if (json.error) return `⚠️ ${json.error}`;

    if (json.transcript) {
      const preview = json.transcript.substring(0, 500);
      return `📺 *${json.language || 'Transcript'}*\n\n${preview}...`;
    }

    if (json.results) {
      return (json.results as { title: string; url: string; snippet?: string }[]).map((r, i) =>
        `${i + 1}. [${r.title}](${r.url})\n${r.snippet || ''}`
      ).join('\n\n');
    }

    return '```json\n' + JSON.stringify(json, null, 2).substring(0, 1000) + '\n```';
  } catch {
    return result.output.substring(0, 2000);
  }
}
