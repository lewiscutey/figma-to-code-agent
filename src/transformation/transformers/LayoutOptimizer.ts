import type { ASTNode } from '../types'
import type { Transformer } from '../TransformationPipeline'

/**
 * Optimize layout properties for better CSS generation
 */
export class LayoutOptimizer implements Transformer {
  name = 'layout-optimizer'

  transform(node: ASTNode): ASTNode {
    return this.optimizeNode(node)
  }

  private optimizeNode(node: ASTNode): ASTNode {
    const optimizedLayout = { ...node.layout }

    // Convert absolute positioning to flex when appropriate
    if (optimizedLayout.display === 'absolute' && this.canConvertToFlex(node)) {
      optimizedLayout.display = 'flex'
      optimizedLayout.flexDirection = this.inferFlexDirection(node)
    }

    // Simplify uniform padding
    if (optimizedLayout.padding) {
      const { top, right, bottom, left } = optimizedLayout.padding
      if (top === right && right === bottom && bottom === left) {
        optimizedLayout.padding = { top, right, bottom, left }
      }
    }

    return {
      ...node,
      layout: optimizedLayout,
      children: node.children.map((child) => this.optimizeNode(child)),
    }
  }

  private canConvertToFlex(node: ASTNode): boolean {
    if (node.children.length < 2) return false

    // Check if children are aligned in a row or column
    const positions = node.children.map((child) => child.layout.position)
    const isRow = this.isAlignedHorizontally(positions)
    const isColumn = this.isAlignedVertically(positions)

    return isRow || isColumn
  }

  private isAlignedHorizontally(positions: Array<{ x: number; y: number }>): boolean {
    if (positions.length < 2) return false
    const yValues = positions.map((p) => p.y)
    const avgY = yValues.reduce((a, b) => a + b, 0) / yValues.length
    return yValues.every((y) => Math.abs(y - avgY) < 10)
  }

  private isAlignedVertically(positions: Array<{ x: number; y: number }>): boolean {
    if (positions.length < 2) return false
    const xValues = positions.map((p) => p.x)
    const avgX = xValues.reduce((a, b) => a + b, 0) / xValues.length
    return xValues.every((x) => Math.abs(x - avgX) < 10)
  }

  private inferFlexDirection(node: ASTNode): 'row' | 'column' {
    const positions = node.children.map((child) => child.layout.position)
    return this.isAlignedHorizontally(positions) ? 'row' : 'column'
  }
}
