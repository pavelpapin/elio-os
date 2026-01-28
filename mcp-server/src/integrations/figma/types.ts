/**
 * Figma Integration Types
 */

export interface FigmaCredentials {
  api_token: string;
}

// REST API types

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: BoundingBox;
  fills?: Paint[];
  strokes?: Paint[];
  characters?: string;
  style?: TextStyle;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Paint {
  type: string;
  color?: RgbaColor;
  opacity?: number;
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeightPx?: number;
  letterSpacing?: number;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  nodeId: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

export interface FigmaComment {
  id: string;
  message: string;
  createdAt: string;
  user: { handle: string; imgUrl: string };
  orderId: string;
}

export interface FigmaProject {
  id: string;
  name: string;
}

export interface FigmaProjectFile {
  key: string;
  name: string;
  thumbnailUrl: string;
  lastModified: string;
}

export interface FigmaImageExport {
  nodeId: string;
  url: string;
}

// WebSocket protocol types

export interface PluginCommand {
  id: string;
  type: 'create_design' | 'modify_node' | 'get_selection' | 'ping';
  payload: DesignSpec | ModifySpec | null;
}

export interface PluginResponse {
  id: string;
  status: 'ok' | 'error';
  data?: { nodeId: string; fileUrl: string };
  error?: string;
}

// Design spec types (Claude → Plugin)

export interface DesignSpec {
  name: string;
  width: number;
  height: number;
  background?: RgbaColor;
  children: DesignNode[];
}

export interface DesignNode {
  type: 'frame' | 'text' | 'rectangle' | 'ellipse' | 'group' | 'component';
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: RgbaColor;
  stroke?: RgbaColor;
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textColor?: RgbaColor;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
  children?: DesignNode[];
  autoLayout?: AutoLayoutSpec;
}

export interface AutoLayoutSpec {
  direction: 'horizontal' | 'vertical';
  gap: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  padding?: number;
}

export interface ModifySpec {
  nodeId: string;
  changes: Partial<DesignNode>;
}

// API response wrappers

export interface FigmaFilesResponse {
  files: FigmaProjectFile[];
}

export interface FigmaCommentsResponse {
  comments: FigmaComment[];
}

export interface FigmaImagesResponse {
  images: Record<string, string>;
}

export interface FigmaComponentsResponse {
  meta: { components: FigmaComponent[] };
}

export interface FigmaStylesResponse {
  meta: { styles: FigmaStyle[] };
}

export interface FigmaProjectsResponse {
  projects: FigmaProject[];
}
