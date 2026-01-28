/**
 * Figma REST API Client
 */

import { httpRequest, buildQueryString } from '../../utils/http.js';
import { loadCredentialsSync } from '../../utils/credentials.js';
import type {
  FigmaCredentials,
  FigmaFile,
  FigmaNode,
  FigmaComment,
  FigmaComponent,
  FigmaStyle,
  FigmaProject,
  FigmaProjectFile,
  FigmaCommentsResponse,
  FigmaImagesResponse,
  FigmaComponentsResponse,
  FigmaStylesResponse,
  FigmaProjectsResponse,
  FigmaFilesResponse
} from './types.js';

const CREDENTIALS_FILE = 'figma.json';

export function loadCredentials(): FigmaCredentials | null {
  return loadCredentialsSync<FigmaCredentials>(CREDENTIALS_FILE);
}

export function isAuthenticated(): boolean {
  return loadCredentials() !== null;
}

export async function figmaRequest<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T> {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error('Figma not authenticated. Add api_token to /root/.claude/secrets/figma.json');
  }

  return httpRequest<T>({
    hostname: 'api.figma.com',
    path: `/v1${endpoint}`,
    method,
    headers: {
      'X-Figma-Token': credentials.api_token
    },
    body
  });
}

// File operations

export async function getFile(fileKey: string): Promise<FigmaFile> {
  return figmaRequest<FigmaFile>(`/files/${fileKey}`);
}

export async function getFileNodes(
  fileKey: string,
  nodeIds: string[]
): Promise<Record<string, { document: FigmaNode }>> {
  const ids = nodeIds.join(',');
  const qs = buildQueryString({ ids });
  const response = await figmaRequest<{ nodes: Record<string, { document: FigmaNode }> }>(
    `/files/${fileKey}/nodes${qs}`
  );
  return response.nodes;
}

// Image exports

export async function getImages(
  fileKey: string,
  nodeIds: string[],
  format: 'png' | 'svg' | 'jpg' | 'pdf' = 'png',
  scale = 2
): Promise<Record<string, string>> {
  const ids = nodeIds.join(',');
  const qs = buildQueryString({ ids, format, scale });
  const response = await figmaRequest<FigmaImagesResponse>(
    `/images/${fileKey}${qs}`
  );
  return response.images;
}

// Components and styles

export async function getComponents(fileKey: string): Promise<FigmaComponent[]> {
  const response = await figmaRequest<FigmaComponentsResponse>(
    `/files/${fileKey}/components`
  );
  return response.meta.components;
}

export async function getStyles(fileKey: string): Promise<FigmaStyle[]> {
  const response = await figmaRequest<FigmaStylesResponse>(
    `/files/${fileKey}/styles`
  );
  return response.meta.styles;
}

// Comments

export async function getComments(fileKey: string): Promise<FigmaComment[]> {
  const response = await figmaRequest<FigmaCommentsResponse>(
    `/files/${fileKey}/comments`
  );
  return response.comments;
}

export async function addComment(
  fileKey: string,
  message: string
): Promise<FigmaComment> {
  return figmaRequest<FigmaComment>(
    `/files/${fileKey}/comments`,
    'POST',
    { message }
  );
}

// Projects

export async function getTeamProjects(teamId: string): Promise<FigmaProject[]> {
  const response = await figmaRequest<FigmaProjectsResponse>(
    `/teams/${teamId}/projects`
  );
  return response.projects;
}

export async function getProjectFiles(projectId: string): Promise<FigmaProjectFile[]> {
  const response = await figmaRequest<FigmaFilesResponse>(
    `/projects/${projectId}/files`
  );
  return response.files;
}
