/**
 * Core data structures for AST representation
 * These types define the fundamental building blocks for the Abstract Syntax Tree
 */

/**
 * 2D position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Rectangle combining position and size
 */
export interface Rectangle extends Position, Size {}

/**
 * RGBA color representation
 */
export interface Color {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

/**
 * Spacing for padding/margin (box model)
 */
export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Border style definition
 */
export interface Border {
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  color: Color;
}

/**
 * Shadow effect (drop shadow or inner shadow)
 */
export interface Shadow {
  type: 'drop-shadow' | 'inner-shadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: Color;
}

/**
 * Typography style definition
 */
export interface Typography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

/**
 * Layout information for AST nodes
 */
export interface LayoutInfo {
  display: 'flex' | 'grid' | 'block' | 'inline' | 'absolute';
  position: Position;
  size: Size;
  flexDirection?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  padding?: Spacing;
  margin?: Spacing;
}

/**
 * Style information for AST nodes
 */
export interface StyleInfo {
  backgroundColor?: Color;
  borderRadius?: number | number[];
  border?: Border;
  boxShadow?: Shadow[];
  opacity?: number;
  typography?: Typography;
}

/**
 * Metadata about the original Figma node
 */
export interface NodeMetadata {
  figmaId: string;
  figmaType: string;
  isComponent: boolean;
  componentName?: string;
  exportable: boolean;
  textContent?: string;
  imageRef?: string;
}

/**
 * AST node types
 */
export type ASTNodeType = 'Root' | 'Page' | 'Container' | 'Component' | 'Text' | 'Image' | 'Shape';

/**
 * Core AST node structure
 * Represents a single node in the abstract syntax tree
 */
export interface ASTNode {
  id: string;
  type: ASTNodeType;
  name: string;
  children: ASTNode[];
  parent?: ASTNode;
  layout: LayoutInfo;
  styles: StyleInfo;
  metadata: NodeMetadata;
}
