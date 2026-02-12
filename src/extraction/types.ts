/**
 * Figma API Types and Interfaces
 */

export interface GetFileOptions {
  version?: string;
  ids?: string[];
  depth?: number;
  geometry?: 'paths' | 'bounds';
  plugin_data?: string;
  branch_data?: boolean;
}

export type ImageFormat = 'png' | 'jpg' | 'svg' | 'pdf';

export interface ImageMap {
  err?: string;
  images: Record<string, string>;
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  version: string;
  document: DocumentNode;
  components: Record<string, Component>;
  styles: Record<string, Style>;
}

export type NodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'TEXT'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'POLYGON'
  | 'STAR'
  | 'LINE';

export interface DocumentNode {
  id: string;
  name: string;
  type: NodeType;
  children: Node[];
}

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  visible?: boolean;
  locked?: boolean;
  children?: Node[];

  // Layout properties
  absoluteBoundingBox?: Rectangle;
  constraints?: LayoutConstraint;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutAlign?: LayoutAlign;
  layoutGrow?: number;
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  layoutGrids?: LayoutGrid[];

  // Style properties
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  opacity?: number;

  // Text properties (TEXT nodes)
  characters?: string;
  style?: TypeStyle;

  // Component properties
  componentId?: string;
  componentProperties?: Record<string, any>;
}

export interface LayoutGrid {
  pattern: 'COLUMNS' | 'ROWS' | 'GRID';
  sectionSize?: number;
  visible?: boolean;
  color?: Color;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConstraint {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: Color;
  imageRef?: string;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius: number;
  color?: Color;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
}

export interface Component {
  key: string;
  name: string;
  description: string;
}

export interface Style {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}
