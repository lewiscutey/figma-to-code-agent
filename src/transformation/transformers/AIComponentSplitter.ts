import type { ASTNode } from '../types'
import type { Transformer } from '../TransformationPipeline'
import type { LLMProvider } from '../../llm/types'

export class AIComponentSplitter implements Transformer {
  name = 'AIComponentSplitter'

  constructor(private llm: LLMProvider) {}

  async transform(node: ASTNode): Promise<ASTNode> {
    if (this.shouldAnalyze(node)) {
      const decision = await this.analyzeComponent(node)
      if (decision.shouldSplit) {
        return this.splitComponent(node, decision.splitPoints)
      }
    }

    if (node.children) {
      node.children = await Promise.all(node.children.map((child: ASTNode) => this.transform(child)))
    }

    return node
  }

  private shouldAnalyze(node: ASTNode): boolean {
    return node.type === 'Container' && (node.children?.length || 0) > 5
  }

  private async analyzeComponent(node: ASTNode): Promise<{ shouldSplit: boolean; splitPoints: number[] }> {
    const response = await this.llm.chat([
      {
        role: 'system',
        content:
          'You are a UI architecture expert. Analyze component structure and decide if it should be split into smaller components. Return JSON: {"shouldSplit": boolean, "splitPoints": [indices]}',
      },
      {
        role: 'user',
        content: `Analyze this component:\n${JSON.stringify(this.simplifyNode(node), null, 2)}`,
      },
    ])

    return JSON.parse(response.content)
  }

  private simplifyNode(node: ASTNode): any {
    return {
      type: node.type,
      name: node.name,
      childCount: node.children?.length || 0,
      children: node.children?.map((c: ASTNode) => ({ type: c.type, name: c.name })),
    }
  }

  private splitComponent(node: ASTNode, splitPoints: number[]): ASTNode {
    // Simple split logic - can be enhanced
    const newChildren: ASTNode[] = []
    let currentGroup: ASTNode[] = []

    node.children?.forEach((child: ASTNode, i: number) => {
      currentGroup.push(child)
      if (splitPoints.includes(i)) {
        newChildren.push({
          ...node,
          name: `${node.name}Part${newChildren.length + 1}`,
          children: currentGroup,
        })
        currentGroup = []
      }
    })

    if (currentGroup.length > 0) {
      newChildren.push({
        ...node,
        name: `${node.name}Part${newChildren.length + 1}`,
        children: currentGroup,
      })
    }

    return { ...node, children: newChildren }
  }
}
