/**
 * YouTube Audio Download Functions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileLogger } from '../utils/file-logger.js';

const execAsync = promisify(exec);

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Download audio from YouTube video using yt-dlp
 */
export async function downloadYouTubeAudio(videoUrl: string): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return { success: false, error: 'Invalid YouTube URL' };
  }

  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `yt_audio_${videoId}.mp3`);

  // Clean up if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  try {
    fileLogger.info('groq', `Downloading audio for ${videoId}`);

    const pythonPath = '/tmp/ytdlp';
    const denoPath = `${process.env.HOME}/.deno/bin`;
    const cookiesPath = '/root/.claude/secrets/youtube-cookies.txt';
    const cookiesFlag = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';
    const envVars = `PYTHONPATH=${pythonPath} PATH=${denoPath}:$PATH`;
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cmd = `${envVars} python3 -m yt_dlp -x --audio-format mp3 --audio-quality 5 --no-warnings ${cookiesFlag} -o "${outputPath}" "${ytUrl}" 2>&1`;

    await execAsync(cmd, { timeout: 300000 });

    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Audio download failed - file not created' };
    }

    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / (1024 * 1024);

    fileLogger.info('groq', `Audio downloaded: ${sizeMB.toFixed(2)}MB`);

    if (sizeMB > 25) {
      fs.unlinkSync(outputPath);
      return { success: false, error: `Audio file too large (${sizeMB.toFixed(1)}MB). Max 25MB.` };
    }

    return { success: true, filePath: outputPath };
  } catch (error) {
    fileLogger.error('groq', 'Audio download failed', { error: String(error) });
    return { success: false, error: `Download failed: ${error}` };
  }
}
