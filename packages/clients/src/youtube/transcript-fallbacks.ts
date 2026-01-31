/**
 * YouTube Transcript Fallback Methods
 * yt-dlp subtitles + Groq Whisper transcription
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { GroqCredentials } from './types.js';
import { loadCredentialsSync, GROQ_API_BASE, logger } from './credentials.js';

const execAsync = promisify(exec);

/**
 * Parse VTT subtitle file to clean text
 */
function parseVttToText(vttContent: string): string {
  const lines = vttContent.split('\n');
  const texts: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.startsWith('WEBVTT') || line.startsWith('Kind:') || line.startsWith('Language:')) continue;
    if (line.includes('-->') || line.trim() === '') continue;
    if (line.startsWith(' ')) continue;

    const clean = line.replace(/<[^>]+>/g, '').trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      texts.push(clean);
    }
  }

  return texts.join(' ');
}

/**
 * Extract subtitles via yt-dlp
 */
export async function extractSubtitlesViaYtdlp(
  videoId: string,
  languages: string[] = ['ru', 'en']
): Promise<{ text: string; language: string } | null> {
  const tempDir = os.tmpdir();
  const outputBase = path.join(tempDir, `subs_${videoId}`);
  const langArg = languages.join(',');

  try {
    logger.info(`Extracting subtitles for ${videoId} via yt-dlp...`);
    const pythonPath = '/tmp/ytdlp';
    const denoPath = `${process.env.HOME || '/root'}/.deno/bin`;
    const envVars = `PYTHONPATH=${pythonPath} PATH=${denoPath}:$PATH`;

    const cmd = `${envVars} python3 -m yt_dlp --write-auto-subs --sub-lang ${langArg} --skip-download --no-warnings -o "${outputBase}" "https://www.youtube.com/watch?v=${videoId}" 2>&1`;

    await execAsync(cmd, { timeout: 60000 });

    for (const lang of languages) {
      const vttPath = `${outputBase}.${lang}.vtt`;
      if (fs.existsSync(vttPath)) {
        const vttContent = fs.readFileSync(vttPath, 'utf-8');
        const text = parseVttToText(vttContent);
        fs.unlinkSync(vttPath);

        if (text.length > 50) {
          logger.info(`Subtitles extracted (${lang}): ${text.length} chars`);
          return { text, language: lang };
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Subtitle extraction failed', { error: String(error) });
    for (const lang of languages) {
      const vttPath = `${outputBase}.${lang}.vtt`;
      try { if (fs.existsSync(vttPath)) fs.unlinkSync(vttPath); } catch { /* ignore */ }
    }
    return null;
  }
}

/**
 * Transcribe via Groq Whisper
 */
export async function transcribeViaWhisper(videoId: string): Promise<string | null> {
  const credentials = loadCredentialsSync<GroqCredentials>('groq.json');
  if (!credentials) {
    logger.info('Groq not configured, skipping Whisper fallback');
    return null;
  }

  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `yt_audio_${videoId}.mp3`);

  try {
    logger.info(`Downloading audio for ${videoId} via yt-dlp...`);
    const pythonPath = '/tmp/ytdlp';
    const denoPath = `${process.env.HOME || '/root'}/.deno/bin`;
    const cookiesPath = '/root/.claude/secrets/youtube-cookies.txt';
    const cookiesFlag = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';
    const envVars = `PYTHONPATH=${pythonPath} PATH=${denoPath}:$PATH`;
    const cmd = `${envVars} python3 -m yt_dlp -x --audio-format mp3 --audio-quality 5 --no-warnings ${cookiesFlag} -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}" 2>&1`;
    await execAsync(cmd, { timeout: 300000 });

    if (!fs.existsSync(outputPath)) {
      logger.error('Audio download failed - file not created');
      return null;
    }

    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / (1024 * 1024);
    logger.info(`Audio downloaded: ${sizeMB.toFixed(2)}MB`);

    if (sizeMB > 25) {
      logger.error(`Audio too large: ${sizeMB.toFixed(1)}MB > 25MB limit`);
      fs.unlinkSync(outputPath);
      return null;
    }

    logger.info('Transcribing via Groq Whisper...');
    const fileBuffer = fs.readFileSync(outputPath);
    const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', blob, path.basename(outputPath));
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    const response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${credentials.api_key}` },
      body: formData
    });

    fs.unlinkSync(outputPath);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Groq API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json() as { text: string };
    logger.info(`Whisper transcription complete: ${data.text.length} chars`);
    return data.text;
  } catch (error) {
    logger.error('Whisper transcription failed', { error: String(error) });
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { /* ignore */ }
    return null;
  }
}
