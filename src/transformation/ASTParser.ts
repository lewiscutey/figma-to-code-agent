import type { Node as FigmaNode } from '../extraction/types'
import type { ASTNode, ASTNodeType, LayoutInfo } from './types'
import { createASTNode, createLayoutInfo, createStyleInfo, createNodeMetadata, createColor, createSpacing } from './ASTFactory'

export class ASTParser {
  parse(figmaNode: FigmaNode): ASTNode {
    return this.parseNode(figmaNode)
  }

  private parseNode(figmaNode: FigmaNode, parent?: ASTNode): ASTNode {
    const nodeType = this.mapNodeType(figmaNode)
    const layout = this.parseLayout(figmaNode)
    const styles = this.parseStyles(figmaNode)
    const metadata = createNodeMetadata(figmaNode.id, figmaNode.type, {
      isComponent: figmaNode.type === 'COMPONENT' || figmaNode.type === 'COMPONENT_SET',
      componentName: figmaNode.type === 'COMPONENT' ? figmaNode.name : undefined,
      exportable: false,
      textContent: figmaNode.characters,
      imageRef: this.getImageRef(figmaNode),
    })

    const astNode = createASTNode({
      id: figmaNode.id,
      type: nodeType,
      name: figmaNode.name,
      layout,
      styles,
      metadata,
      parent,
    })

    if ('children' in figmaNode && figmaNode.children) {
      astNode.children = figmaNode.children
        .filter((child) => (child as any).visible !== false)
        .filter((child) => (child as any).isMask !== true)
        .map((child) => this.parseNode(child, astNode))
    }

    return astNode
  }

  private getImageRef(figmaNode: FigmaNode): string | undefined {
    if ('fills' in figmaNode && Array.isArray(figmaNode.fills)) {
      const imageFill = figmaNode.fills.find((f: any) => f.type === 'IMAGE')
      if (imageFill && imageFill.imageRef) {
        return imageFill.imageRef
      }
    }
    return undefined
  }

  private mapNodeType(figmaNode: FigmaNode): ASTNodeType {
    // Check if it has an image fill -> treat as Image
    if (this.getImageRef(figmaNode)) {
      return 'Image'
    }

    switch (figmaNode.type) {
      case 'DOCUMENT':
        return 'Root'
      case 'CANVAS':
        return 'Page'
      case 'COMPONENT':
      case 'COMPONENT_SET':
      case 'INSTANCE':
        return 'Component'
      case 'TEXT':
        return 'Text'
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'POLYGON':
      case 'STAR':
      case 'VECTOR':
      case 'LINE':
        return 'Shape'
      case 'FRAME':
      case 'GROUP':
      default:
        return 'Container'
    }
  }

  private parseLayout(figmaNode: FigmaNode): LayoutInfo {
    const position = { x: figmaNode.absoluteBoundingBox?.x ?? 0, y: figmaNode.absoluteBoundingBox?.y ?? 0 }
    const size = { width: figmaNode.absoluteBoundingBox?.width ?? 0, height: figmaNode.absoluteBoundingBox?.height ?? 0 }

    const display = this.detectLayoutMode(figmaNode)
    const layout = createLayoutInfo({ display, position, size })

    if ('layoutMode' in figmaNode && figmaNode.layoutMode) {
      if (figmaNode.layoutMode === 'HORIZONTAL') {
        layout.flexDirection = 'row'
      } else if (figmaNode.layoutMode === 'VERTICAL') {
        layout.flexDirection = 'column'
      }

      if ('primaryAxisAlignItems' in figmaNode) {
        layout.justifyContent = this.mapAlignment(figmaNode.primaryAxisAlignItems)
      }
      if ('counterAxisAlignItems' in figmaNode) {
        layout.alignItems = this.mapAlignment(figmaNode.counterAxisAlignItems)
      }
      if ('itemSpacing' in figmaNode && typeof figmaNode.itemSpacing === 'number') {
        layout.gap = figmaNode.itemSpacing
      }
    }

    if ('paddingLeft' in figmaNode) {
      const top = (figmaNode as any).paddingTop ?? 0
      const right = (figmaNode as any).paddingRight ?? 0
      const bottom = (figmaNode as any).paddingBottom ?? 0
      const left = (figmaNode as any).paddingLeft ?? 0
      layout.padding = createSpacing(top, right, bottom, left)
    }

    return layout
  }

  private detectLayoutMode(figmaNode: FigmaNode): 'flex' | 'grid' | 'absolute' | 'block' {
    if ('layoutMode' in figmaNode && figmaNode.layoutMode && figmaNode.layoutMode !== 'NONE') {
      return 'flex'
    }

    if ('layoutGrids' in figmaNode && figmaNode.layoutGrids && figmaNode.layoutGrids.length > 0) {
      const hasGrid = figmaNode.layoutGrids.some((grid: any) => grid.pattern === 'GRID')
      if (hasGrid) return 'grid'
    }

    if ('constraints' in figmaNode && figmaNode.constraints) {
      const constraints = figmaNode.constraints as any
      if (constraints.horizontal === 'SCALE' || constraints.vertical === 'SCALE') {
        return 'absolute'
      }
    }

    return 'block'
  }

  private mapAlignment(alignment: any): string {
    switch (alignment) {
      case 'MIN':
        return 'flex-start'
      case 'CENTER':
        return 'center'
      case 'MAX':
        return 'flex-end'
      case 'SPACE_BETWEEN':
        return 'space-between'
      default:
        return 'flex-start'
    }
  }

  private parseStyles(figmaNode: FigmaNode) {
    const styles = createStyleInfo()

    if ('fills' in figmaNode && Array.isArray(figmaNode.fills) && figmaNode.fills.length > 0) {
      const fill = figmaNode.fills[0]
      if (fill.type === 'SOLID' && fill.color) {
        const fillOpacity = fill.opacity ?? 1
        // Skip completely invisible fills (opacity: 0)
        if (fillOpacity > 0) {
          styles.backgroundColor = createColor(
            Math.round(fill.color.r * 255),
            Math.round(fill.color.g * 255),
            Math.round(fill.color.b * 255),
            fillOpacity
          )
        }
      }
    }

    if ('cornerRadius' in figmaNode && typeof figmaNode.cornerRadius === 'number') {
      styles.borderRadius = figmaNode.cornerRadius
    }

    if ('opacity' in figmaNode && typeof figmaNode.opacity === 'number') {
      styles.opacity = figmaNode.opacity
    }

    if (figmaNode.type === 'TEXT' && 'style' in figmaNode && figmaNode.style) {
      const textStyle = figmaNode.style as any
      styles.typography = {
        fontFamily: textStyle.fontFamily ?? 'sans-serif',
        fontSize: textStyle.fontSize ?? 16,
        fontWeight: textStyle.fontWeight ?? 400,
        lineHeight: textStyle.lineHeightPx ?? textStyle.fontSize ?? 16,
        letterSpacing: textStyle.letterSpacing,
        textAlign: textStyle.textAlignHorizontal?.toLowerCase(),
        textDecoration: textStyle.textDecoration?.toLowerCase(),
      }
    }

    return styles
  }
}
