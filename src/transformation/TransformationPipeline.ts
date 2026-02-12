import type { ASTNode } from './types';

/**
 * Transformer interface for AST transformations
 */
export interface Transformer {
  name: string;
  transform(node: ASTNode): ASTNode | Promise<ASTNode>;
}

/**
 * Transformation pipeline for applying multiple transformers
 */
export class TransformationPipeline {
  private transformers: Transformer[] = [];

  /**
   * Register a transformer
   */
  register(transformer: Transformer): this {
    this.transformers.push(transformer);
    return this;
  }

  /**
   * Execute all transformers in sequence
   */
  async execute(node: ASTNode): Promise<ASTNode> {
    let currentNode = node;
    for (const transformer of this.transformers) {
      currentNode = await transformer.transform(currentNode);
    }
    return currentNode;
  }

  /**
   * Get all registered transformers
   */
  getTransformers(): Transformer[] {
    return [...this.transformers];
  }

  /**
   * Clear all transformers
   */
  clear(): void {
    this.transformers = [];
  }
}
