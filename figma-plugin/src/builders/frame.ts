/**
 * Frame & AutoLayout Builder
 */

import { applyBaseProps, toFigmaColor } from './shared';

interface AutoLayoutSpec {
  direction: 'horizontal' | 'vertical';
  gap: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  padding?: number;
}

interface FrameSpec {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: { r: number; g: number; b: number; a: number };
  cornerRadius?: number;
  autoLayout?: AutoLayoutSpec;
}

export function createFrame(spec: FrameSpec): FrameNode {
  const frame = figma.createFrame();
  applyBaseProps(frame, spec);

  if (spec.fill) {
    frame.fills = [{ type: 'SOLID', color: toFigmaColor(spec.fill), opacity: spec.fill.a !== undefined ? spec.fill.a : 1 }];
  }

  if (spec.cornerRadius) {
    frame.cornerRadius = spec.cornerRadius;
  }

  if (spec.autoLayout) {
    applyAutoLayout(frame, spec.autoLayout);
  }

  return frame;
}

export function applyAutoLayout(frame: FrameNode, al: AutoLayoutSpec): void {
  frame.layoutMode = al.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
  frame.itemSpacing = al.gap;

  const pad = al.padding || 0;
  frame.paddingTop = al.paddingTop !== undefined ? al.paddingTop : pad;
  frame.paddingRight = al.paddingRight !== undefined ? al.paddingRight : pad;
  frame.paddingBottom = al.paddingBottom !== undefined ? al.paddingBottom : pad;
  frame.paddingLeft = al.paddingLeft !== undefined ? al.paddingLeft : pad;
}
