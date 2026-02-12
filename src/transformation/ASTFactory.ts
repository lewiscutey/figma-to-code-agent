/**
 * Factory functions for creating AST nodes
 * Provides convenient methods to construct AST nodes with default values
 */

import {
  ASTNode,
  ASTNodeType,
  LayoutInfo,
  StyleInfo,
  NodeMetadata,
  Position,
  Size,
  Spacing,
  Color,
} from './types'

/**
 * Create a default position at origin
 */
export function createPosition(x = 0, y = 0): Position {
  return { x, y }
}

/**
 * Create a default size
 */
export function createSize(width = 0, height = 0): Size {
  return { width, height }
}

/**
 * Create uniform spacing
 */
export function createSpacing(value: number): Spacing
export function createSpacing(
  top: number,
  right: number,
  bottom: number,
  left: number
): Spacing
export function createSpacing(
  topOrValue: number,
  right?: number,
  bottom?: number,
  left?: number
): Spacing {
  if (right === undefined) {
    // Uniform spacing
    return {
      top: topOrValue,
      right: topOrValue,
      bottom: topOrValue,
      left: topOrValue,
    }
  }
  return {
    top: topOrValue,
    right: right!,
    bottom: bottom!,
    left: left!,
  }
}

/**
 * Create an RGBA color
 */
export function createColor(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a }
}

/**
 * Create a default layout info
 */
export function createLayoutInfo(
  overrides: Partial<LayoutInfo> = {}
): LayoutInfo {
  return {
    display: 'block',
    position: createPosition(),
    size: createSize(),
    ...overrides,
  }
}

/**
 * Create a default style info
 */
export function createStyleInfo(overrides: Partial<StyleInfo> = {}): StyleInfo {
  return {
    ...overrides,
  }
}

/**
 * Create node metadata
 */
export function createNodeMetadata(
  figmaId: string,
  figmaType: string,
  overrides: Partial<NodeMetadata> = {}
): NodeMetadata {
  return {
    figmaId,
    figmaType,
    isComponent: false,
    exportable: true,
    ...overrides,
  }
}

/**
 * Options for creating an AST node
 */
export interface CreateASTNodeOptions {
  id: string
  type: ASTNodeType
  name: string
  layout?: Partial<LayoutInfo>
  styles?: Partial<StyleInfo>
  metadata: NodeMetadata
  children?: ASTNode[]
  parent?: ASTNode
}

/**
 * Create a complete AST node
 */
export function createASTNode(options: CreateASTNodeOptions): ASTNode {
  const {
    id,
    type,
    name,
    layout = {},
    styles = {},
    metadata,
    children = [],
    parent,
  } = options

  return {
    id,
    type,
    name,
    children,
    parent,
    layout: createLayoutInfo(layout),
    styles: createStyleInfo(styles),
    metadata,
  }
}

/**
 * Create a root AST node
 */
export function createRootNode(
  id: string,
  name: string,
  figmaId: string
): ASTNode {
  return createASTNode({
    id,
    type: 'Root',
    name,
    metadata: createNodeMetadata(figmaId, 'DOCUMENT', {
      isComponent: false,
      exportable: false,
    }),
  })
}

/**
 * Create a page AST node
 */
export function createPageNode(
  id: string,
  name: string,
  figmaId: string,
  parent?: ASTNode
): ASTNode {
  return createASTNode({
    id,
    type: 'Page',
    name,
    metadata: createNodeMetadata(figmaId, 'CANVAS'),
    parent,
  })
}

/**
 * Create a container AST node
 */
export function createContainerNode(
  id: string,
  name: string,
  figmaId: string,
  figmaType: string,
  layout?: Partial<LayoutInfo>,
  parent?: ASTNode
): ASTNode {
  return createASTNode({
    id,
    type: 'Container',
    name,
    layout,
    metadata: createNodeMetadata(figmaId, figmaType),
    parent,
  })
}

/**
 * Create a component AST node
 */
export function createComponentNode(
  id: string,
  name: string,
  figmaId: string,
  componentName: string,
  parent?: ASTNode
): ASTNode {
  return createASTNode({
    id,
    type: 'Component',
    name,
    metadata: createNodeMetadata(figmaId, 'COMPONENT', {
      isComponent: true,
      componentName,
    }),
    parent,
  })
}

/**
 * Create a text AST node
 */
export function createTextNode(
  id: string,
  name: string,
  figmaId: string,
  layout?: Partial<LayoutInfo>,
  styles?: Partial<StyleInfo>,
  parent?: ASTNode
): ASTNode {
  return createASTNode({
    id,
    type: 'Text',
    name,
    layout,
    styles,
    metadata: createNodeMetadata(figmaId, 'TEXT'),
    parent,
  })
}

/**
 * Create an image AST node
 */
export function createImageNode(
  id: string,
  name: string,
  figmaId: string,
  layout?: Partial<LayoutInfo>,
  parent?: ASTNode
): ASTNode {
  return createASTNode({
    id,
    type: 'Image',
    name,
    layout,
    metadata: createNodeMetadata(figmaId, 'IMAGE'),
    parent,
  })
}

/**
 * Create a shape AST node
 */
export function createShapeNode(
  id: string,
  name: string,
  figmaId: string,
  figmaType: string,
  layout?: Partial<LayoutInfo>,
  styles?: Partial<StyleInfo>,
  parent?: ASTNode
): ASTNode {
  return createASTNode({
    id,
    type: 'Shape',
    name,
    layout,
    styles,
    metadata: createNodeMetadata(figmaId, figmaType),
    parent,
  })
}

/**
 * Add a child node to a parent node
 */
export function addChild(parent: ASTNode, child: ASTNode): void {
  child.parent = parent
  parent.children.push(child)
}

/**
 * Remove a child node from a parent node
 */
export function removeChild(parent: ASTNode, child: ASTNode): boolean {
  const index = parent.children.indexOf(child)
  if (index !== -1) {
    parent.children.splice(index, 1)
    child.parent = undefined
    return true
  }
  return false
}

/**
 * Clone an AST node (shallow copy, children are referenced)
 */
export function cloneNode(node: ASTNode, deep = false): ASTNode {
  const cloned = createASTNode({
    id: node.id,
    type: node.type,
    name: node.name,
    layout: { ...node.layout },
    styles: { ...node.styles },
    metadata: { ...node.metadata },
    children: deep ? node.children.map((child) => cloneNode(child, true)) : [],
    parent: node.parent,
  })

  if (!deep) {
    cloned.children = [...node.children]
  }

  return cloned
}
