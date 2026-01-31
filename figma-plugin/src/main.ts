/**
 * Elio Design Bridge - Figma Plugin Main Thread
 * Receives commands from UI (WebSocket) and executes Figma API calls
 */

import { interpretSpec } from './interpreter';

interface PluginCommand {
  id: string;
  type: 'create_design' | 'modify_node' | 'get_selection' | 'ping';
  payload: unknown;
}

interface PluginResponse {
  id: string;
  status: 'ok' | 'error';
  data?: Record<string, unknown>;
  error?: string;
}

figma.showUI(__html__, { width: 300, height: 280, themeColors: true });

figma.ui.onmessage = async (msg: { type: string; command?: PluginCommand }) => {
  if (msg.type !== 'command' || !msg.command) return;

  const { command } = msg;
  let response: PluginResponse;

  try {
    switch (command.type) {
      case 'create_design':
        response = await handleCreateDesign(command);
        break;
      case 'modify_node':
        response = await handleModifyNode(command);
        break;
      case 'get_selection':
        response = handleGetSelection(command);
        break;
      case 'ping':
        response = { id: command.id, status: 'ok', data: { pong: true } };
        break;
      default:
        response = { id: command.id, status: 'error', error: `Unknown command: ${command.type}` };
    }
  } catch (err) {
    response = {
      id: command.id,
      status: 'error',
      error: err instanceof Error ? err.message : String(err)
    };
  }

  figma.ui.postMessage({ type: 'response', response });
};

async function handleCreateDesign(command: PluginCommand): Promise<PluginResponse> {
  const spec = command.payload as {
    name: string;
    width: number;
    height: number;
    background?: { r: number; g: number; b: number; a: number };
    children: unknown[];
  };

  const rootFrame = await interpretSpec(spec as Parameters<typeof interpretSpec>[0]);

  // Center in viewport
  const viewCenter = figma.viewport.center;
  rootFrame.x = viewCenter.x - rootFrame.width / 2;
  rootFrame.y = viewCenter.y - rootFrame.height / 2;

  figma.currentPage.appendChild(rootFrame);
  figma.viewport.scrollAndZoomIntoView([rootFrame]);

  return {
    id: command.id,
    status: 'ok',
    data: {
      nodeId: rootFrame.id,
      name: rootFrame.name,
      width: rootFrame.width,
      height: rootFrame.height
    }
  };
}

async function handleModifyNode(command: PluginCommand): Promise<PluginResponse> {
  const payload = command.payload as { nodeId: string; changes: Record<string, unknown> };
  const node = figma.getNodeById(payload.nodeId);

  if (!node) {
    return { id: command.id, status: 'error', error: `Node ${payload.nodeId} not found` };
  }

  const changes = payload.changes;
  const sceneNode = node as SceneNode;

  if (changes.x !== undefined) (sceneNode as FrameNode).x = changes.x as number;
  if (changes.y !== undefined) (sceneNode as FrameNode).y = changes.y as number;
  if (changes.width !== undefined && changes.height !== undefined) {
    (sceneNode as FrameNode).resize(changes.width as number, changes.height as number);
  }
  if (changes.name !== undefined) sceneNode.name = changes.name as string;
  if (changes.opacity !== undefined) sceneNode.opacity = changes.opacity as number;

  if (changes.fill && 'fills' in sceneNode) {
    const fill = changes.fill as { r: number; g: number; b: number; a: number };
    (sceneNode as GeometryMixin).fills = [{
      type: 'SOLID',
      color: { r: fill.r, g: fill.g, b: fill.b },
      opacity: fill.a !== undefined ? fill.a : 1
    }];
  }

  if (changes.text !== undefined && sceneNode.type === 'TEXT') {
    const textNode = sceneNode as TextNode;
    await figma.loadFontAsync(textNode.fontName as FontName);
    textNode.characters = changes.text as string;
  }

  return {
    id: command.id,
    status: 'ok',
    data: { nodeId: sceneNode.id, name: sceneNode.name }
  };
}

function handleGetSelection(command: PluginCommand): PluginResponse {
  const selection = figma.currentPage.selection;
  const nodes = selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : 0,
    y: 'y' in node ? node.y : 0,
    width: 'width' in node ? node.width : 0,
    height: 'height' in node ? node.height : 0
  }));

  return {
    id: command.id,
    status: 'ok',
    data: { selection: nodes as unknown as Record<string, unknown> }
  };
}
