/**
 * Text Node Builder
 */

import { applyBaseProps, toFigmaColor } from './shared';

interface TextSpec {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textColor?: { r: number; g: number; b: number; a: number };
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
  opacity?: number;
}

export async function createText(spec: TextSpec): Promise<TextNode> {
  const node = figma.createText();
  const family = spec.fontFamily || 'Inter';
  const style = mapFontWeight(spec.fontWeight || 400);

  await figma.loadFontAsync({ family, style });

  applyBaseProps(node, spec);

  node.characters = spec.text || '';
  node.fontSize = spec.fontSize || 16;
  node.fontName = { family, style };

  if (spec.textColor) {
    node.fills = [{ type: 'SOLID', color: toFigmaColor(spec.textColor), opacity: spec.textColor.a !== undefined ? spec.textColor.a : 1 }];
  }

  if (spec.textAlign) {
    node.textAlignHorizontal = spec.textAlign;
  }

  return node;
}

function mapFontWeight(weight: number): string {
  if (weight <= 100) return 'Thin';
  if (weight <= 200) return 'Extra Light';
  if (weight <= 300) return 'Light';
  if (weight <= 400) return 'Regular';
  if (weight <= 500) return 'Medium';
  if (weight <= 600) return 'Semi Bold';
  if (weight <= 700) return 'Bold';
  if (weight <= 800) return 'Extra Bold';
  return 'Black';
}
