/**
 * Design Spec Interpreter
 * Converts DesignSpec JSON into Figma nodes
 */

import { createFrame } from './builders/frame';
import { createText } from './builders/text';
import { createRectangle, createEllipse } from './builders/shapes';
import { toFigmaColor } from './builders/shared';

interface DesignSpec {
  name: string;
  width: number;
  height: number;
  background?: { r: number; g: number; b: number; a: number };
  children: DesignNode[];
}

interface DesignNode {
  type: 'frame' | 'text' | 'rectangle' | 'ellipse' | 'group' | 'component';
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: { r: number; g: number; b: number; a: number };
  stroke?: { r: number; g: number; b: number; a: number };
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textColor?: { r: number; g: number; b: number; a: number };
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
  children?: DesignNode[];
  autoLayout?: {
    direction: 'horizontal' | 'vertical';
    gap: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    padding?: number;
  };
}

export async function interpretSpec(spec: DesignSpec): Promise<FrameNode> {
  const root = figma.createFrame();
  root.name = spec.name;
  root.resize(spec.width, spec.height);

  if (spec.background) {
    root.fills = [{
      type: 'SOLID',
      color: toFigmaColor(spec.background),
      opacity: spec.background.a !== undefined ? spec.background.a : 1
    }];
  }

  for (const child of spec.children) {
    const node = await createNode(child);
    if (node) root.appendChild(node);
  }

  return root;
}

async function createNode(spec: DesignNode): Promise<SceneNode | null> {
  switch (spec.type) {
    case 'frame':
      return await createFrameWithChildren(spec);
    case 'text':
      return await createText(spec);
    case 'rectangle':
      return createRectangle(spec);
    case 'ellipse':
      return createEllipse(spec);
    case 'group':
      return await createGroupNode(spec);
    case 'component':
      return await createComponentNode(spec);
    default:
      return null;
  }
}

async function createFrameWithChildren(spec: DesignNode): Promise<FrameNode> {
  const frame = createFrame(spec);
  if (spec.children) {
    for (const child of spec.children) {
      const node = await createNode(child);
      if (node) frame.appendChild(node);
    }
  }
  return frame;
}

async function createGroupNode(spec: DesignNode): Promise<FrameNode> {
  // Groups in Figma require children first, so we use a frame with no fill
  const frame = createFrame({
    name: spec.name,
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    cornerRadius: spec.cornerRadius,
    autoLayout: spec.autoLayout
  });
  frame.fills = [];
  if (spec.children) {
    for (const child of spec.children) {
      const node = await createNode(child);
      if (node) frame.appendChild(node);
    }
  }
  return frame;
}

async function createComponentNode(spec: DesignNode): Promise<ComponentNode> {
  const component = figma.createComponent();
  component.name = spec.name || 'Component';
  component.x = spec.x;
  component.y = spec.y;
  component.resize(spec.width, spec.height);

  if (spec.fill) {
    component.fills = [{
      type: 'SOLID',
      color: toFigmaColor(spec.fill),
      opacity: spec.fill.a !== undefined ? spec.fill.a : 1
    }];
  }

  if (spec.children) {
    for (const child of spec.children) {
      const node = await createNode(child);
      if (node) component.appendChild(node);
    }
  }

  return component;
}
