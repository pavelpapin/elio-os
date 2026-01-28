/**
 * Figma Adapter
 * Exposes Figma REST API + Plugin bridge as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as figma from '../../integrations/figma/index.js';

// Schemas

const getFileSchema = z.object({
  fileKey: z.string().describe('Figma file key (from URL: figma.com/file/{key}/...)')
});

const getNodeSchema = z.object({
  fileKey: z.string().describe('Figma file key'),
  nodeIds: z.string().describe('Comma-separated node IDs')
});

const getImagesSchema = z.object({
  fileKey: z.string().describe('Figma file key'),
  nodeIds: z.string().describe('Comma-separated node IDs'),
  format: z.enum(['png', 'svg', 'jpg', 'pdf']).optional().describe('Export format (default: png)'),
  scale: z.number().optional().describe('Export scale (default: 2)')
});

const getComponentsSchema = z.object({
  fileKey: z.string().describe('Figma file key')
});

const getStylesSchema = z.object({
  fileKey: z.string().describe('Figma file key')
});

const getCommentsSchema = z.object({
  fileKey: z.string().describe('Figma file key')
});

const addCommentSchema = z.object({
  fileKey: z.string().describe('Figma file key'),
  message: z.string().describe('Comment text')
});

const projectFilesSchema = z.object({
  projectId: z.string().describe('Figma project ID')
});

const teamProjectsSchema = z.object({
  teamId: z.string().describe('Figma team ID')
});

const createDesignSchema = z.object({
  spec: z.string().describe('DesignSpec JSON: { name, width, height, background?, children: DesignNode[] }')
});

const modifyNodeSchema = z.object({
  nodeId: z.string().describe('Figma node ID to modify'),
  changes: z.string().describe('JSON with changes: Partial<DesignNode>')
});

const statusSchema = z.object({});

// Tools

const tools: AdapterTool[] = [
  {
    name: 'file',
    description: 'Get Figma file structure (document tree, pages, frames)',
    type: 'read',
    schema: getFileSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getFileSchema>;
      const file = await figma.getFile(p.fileKey);
      return JSON.stringify({
        name: file.name,
        lastModified: file.lastModified,
        version: file.version,
        pages: file.document.children?.map(page => ({
          id: page.id,
          name: page.name,
          childCount: page.children?.length ?? 0
        }))
      }, null, 2);
    }
  },
  {
    name: 'node',
    description: 'Get specific nodes from a Figma file by their IDs',
    type: 'read',
    schema: getNodeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getNodeSchema>;
      const ids = p.nodeIds.split(',').map(s => s.trim());
      const nodes = await figma.getFileNodes(p.fileKey, ids);
      return JSON.stringify(nodes, null, 2);
    }
  },
  {
    name: 'images',
    description: 'Export Figma nodes as images (PNG, SVG, JPG, PDF)',
    type: 'read',
    schema: getImagesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getImagesSchema>;
      const ids = p.nodeIds.split(',').map(s => s.trim());
      const images = await figma.getImages(p.fileKey, ids, p.format ?? 'png', p.scale ?? 2);
      return JSON.stringify(images, null, 2);
    }
  },
  {
    name: 'components',
    description: 'List all components in a Figma file',
    type: 'read',
    schema: getComponentsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getComponentsSchema>;
      const components = await figma.getComponents(p.fileKey);
      return JSON.stringify(components, null, 2);
    }
  },
  {
    name: 'styles',
    description: 'List all styles (colors, text, effects) in a Figma file',
    type: 'read',
    schema: getStylesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getStylesSchema>;
      const styles = await figma.getStyles(p.fileKey);
      return JSON.stringify(styles, null, 2);
    }
  },
  {
    name: 'comments',
    description: 'Get comments on a Figma file',
    type: 'read',
    schema: getCommentsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getCommentsSchema>;
      const comments = await figma.getComments(p.fileKey);
      return JSON.stringify(comments, null, 2);
    }
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a Figma file',
    type: 'write',
    schema: addCommentSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof addCommentSchema>;
      const comment = await figma.addComment(p.fileKey, p.message);
      return JSON.stringify(comment, null, 2);
    }
  },
  {
    name: 'projects',
    description: 'List projects in a Figma team',
    type: 'read',
    schema: teamProjectsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof teamProjectsSchema>;
      const projects = await figma.getTeamProjects(p.teamId);
      return JSON.stringify(projects, null, 2);
    }
  },
  {
    name: 'project_files',
    description: 'List files in a Figma project',
    type: 'read',
    schema: projectFilesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof projectFilesSchema>;
      const files = await figma.getProjectFiles(p.projectId);
      return JSON.stringify(files, null, 2);
    }
  },
  {
    name: 'create',
    description: 'Create a design in Figma via the plugin bridge. Send DesignSpec JSON.',
    type: 'write',
    schema: createDesignSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof createDesignSchema>;
      const spec = JSON.parse(p.spec);
      const result = await figma.createDesign(spec);
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'modify',
    description: 'Modify an existing Figma node via the plugin bridge',
    type: 'write',
    schema: modifyNodeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof modifyNodeSchema>;
      const changes = JSON.parse(p.changes);
      const result = await figma.modifyNode({ nodeId: p.nodeId, changes });
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'status',
    description: 'Check Figma plugin connection status',
    type: 'read',
    schema: statusSchema,
    execute: async () => {
      const status = figma.getStatus();
      return JSON.stringify(status, null, 2);
    }
  }
];

export const figmaAdapter: Adapter = {
  name: 'figma',
  isAuthenticated: figma.isAuthenticated,
  tools
};
