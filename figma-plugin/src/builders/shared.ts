/**
 * Shared builder utilities
 */

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface BaseSpec {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

export function toFigmaColor(c: RgbaColor): RGB {
  return { r: c.r, g: c.g, b: c.b };
}

export function applyBaseProps(node: SceneNode & { resize: (w: number, h: number) => void }, spec: BaseSpec): void {
  if (spec.name) node.name = spec.name;
  node.x = spec.x;
  node.y = spec.y;
  node.resize(spec.width, spec.height);
  if (spec.opacity !== undefined) node.opacity = spec.opacity;
}
