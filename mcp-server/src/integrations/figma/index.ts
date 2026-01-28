/**
 * Figma Integration
 * REST API for reading + WebSocket bridge for design creation
 */

export { isAuthenticated } from './api.js';
export {
  getFile,
  getFileNodes,
  getImages,
  getComponents,
  getStyles,
  getComments,
  addComment,
  getTeamProjects,
  getProjectFiles
} from './api.js';

export {
  startServer,
  stopServer,
  isPluginConnected,
  getStatus,
  createDesign,
  modifyNode,
  getSelection,
  ping
} from './ws-server.js';

export type {
  FigmaFile,
  FigmaNode,
  FigmaComment,
  FigmaComponent,
  FigmaStyle,
  FigmaProject,
  FigmaProjectFile,
  DesignSpec,
  DesignNode,
  ModifySpec,
  PluginCommand,
  PluginResponse
} from './types.js';
