import type { ASTNode } from '../types'
import type { Transformer } from '../TransformationPipeline'
import type { LLMProvider } from '../../llm'

/**
 * Use AI to analyze and restructure the layout for better readability
 * Identifies semantic components like: Header, Nav, Card, Button, etc.
 */
export class AILayoutAnalyzer implements Transformer {
  name = 'ai-layout-analyzer'

  constructor(private llm: LLMProvider) {}

  async transform(node: ASTNode): Promise<ASTNode> {
    // Analyze top-level structure
    if (node.children.length > 0) {
      return await this.analyzeStructure(node)
    }
    return node
  }

  private async analyzeStructure(node: ASTNode): Promise<ASTNode> {
    // Create a simplified representation for AI
    const structure = this.simplifyForAI(node)

    const prompt = `Analyze this UI structure and identify semantic components.

Structure:
${JSON.stringify(structure, null, 2)}

Identify:
1. Component types (Header, Nav, Card, Button, List, Grid, etc.)
2. Semantic groupings (which nodes should be grouped together)
3. Unnecessary nesting (which containers can be removed)

Return JSON format:
{
  "components": [
    {
      "nodeId": "node-id",
      "type": "Header|Nav|Card|Button|List|Grid|Section|Article|Aside|Footer",
      "name": "descriptive-name",
      "children": ["child-node-ids"]
    }
  ],
  "removeNodes": ["node-ids-to-remove"],
  "mergeGroups": [
    {
      "parentId": "parent-node-id",
      "childIds": ["child-ids-to-merge"]
    }
  ]
}`

    try {
      const response = await this.llm.chat([
        {
          role: 'system',
          content: 'You are a UI/UX expert. Analyze component structures and provide semantic improvements. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      const analysis = JSON.parse(response.content)
      return this.applyAnalysis(node, analysis)
    } catch (error) {
      console.warn('AI layout analysis failed, using original structure:', error)
      return node
    }
  }

  private simplifyForAI(node: ASTNode, depth = 0): any {
    // Limit depth to avoid token overflow
    if (depth > 5) {
      return { id: node.id, name: node.name, type: node.type, childCount: node.children.length }
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      layout: {
        display: node.layout.display,
        flexDirection: node.layout.flexDirection,
        size: node.layout.size,
      },
      hasBackground: !!node.styles.backgroundColor,
      hasBorder: !!node.styles.border,
      hasText: node.type === 'Text',
      hasImage: node.type === 'Image',
      children: node.children.map(child => this.simplifyForAI(child, depth + 1)),
    }
  }

  private applyAnalysis(node: ASTNode, analysis: any): ASTNode {
    // Apply component type identification
    const componentMap = new Map<string, any>(
      (analysis.components || []).map((c: any) => [c.nodeId, c])
    )

    // Apply transformations
    return this.applyComponentTypes(node, componentMap, analysis.removeNodes || [])
  }

  private applyComponentTypes(
    node: ASTNode,
    componentMap: Map<string, any>,
    removeNodes: string[]
  ): ASTNode {
    // Skip removed nodes
    if (removeNodes.includes(node.id)) {
      return null as any
    }

    // Apply component type if identified
    const component = componentMap.get(node.id)
    if (component) {
      node = {
        ...node,
        metadata: {
          ...node.metadata,
          componentName: component.name,
          // Store semantic type in metadata for later use
        },
      }
    }

    // Recursively apply to children
    const children = node.children
      .map(child => this.applyComponentTypes(child, componentMap, removeNodes))
      .filter(child => child !== null)

    return {
      ...node,
      children,
    }
  }
}
