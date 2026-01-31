/**
 * Shape Builders (Rectangle, Ellipse)
 */

import { applyBaseProps, toFigmaColor } from './shared';

interface ShapeSpec {
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
}

export function createRectangle(spec: ShapeSpec): RectangleNode {
  const node = figma.createRectangle();
  applyBaseProps(node, spec);

  if (spec.fill) {
    node.fills = [{ type: 'SOLID', color: toFigmaColor(spec.fill), opacity: spec.fill.a !== undefined ? spec.fill.a : 1 }];
  }

  if (spec.stroke) {
    node.strokes = [{ type: 'SOLID', color: toFigmaColor(spec.stroke), opacity: spec.stroke.a !== undefined ? spec.stroke.a : 1 }];
    node.strokeWeight = spec.strokeWidth || 1;
  }

  if (spec.cornerRadius) {
    node.cornerRadius = spec.cornerRadius;
  }

  return node;
}

export function createEllipse(spec: ShapeSpec): EllipseNode {
  const node = figma.createEllipse();
  applyBaseProps(node, spec);

  if (spec.fill) {
    node.fills = [{ type: 'SOLID', color: toFigmaColor(spec.fill), opacity: spec.fill.a !== undefined ? spec.fill.a : 1 }];
  }

  if (spec.stroke) {
    node.strokes = [{ type: 'SOLID', color: toFigmaColor(spec.stroke), opacity: spec.stroke.a !== undefined ? spec.stroke.a : 1 }];
    node.strokeWeight = spec.strokeWidth || 1;
  }

  return node;
}
