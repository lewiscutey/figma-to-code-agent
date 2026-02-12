import { TransformationPipeline, Transformer } from '../../transformation/TransformationPipeline'
import type { ASTNode } from '../../transformation/types'
import { createContainerNode } from '../../transformation/ASTFactory'

describe('TransformationPipeline', () => {
  let pipeline: TransformationPipeline

  beforeEach(() => {
    pipeline = new TransformationPipeline()
  })

  it('should register transformers', () => {
    const transformer: Transformer = {
      name: 'test',
      transform: (node) => node,
    }

    pipeline.register(transformer)

    expect(pipeline.getTransformers()).toHaveLength(1)
    expect(pipeline.getTransformers()[0].name).toBe('test')
  })

  it('should execute transformers in sequence', async () => {
    const node = createContainerNode('1', 'Test', '1:1', 'FRAME')

    const transformer1: Transformer = {
      name: 'add-suffix-1',
      transform: (node) => ({ ...node, name: node.name + '-1' }),
    }

    const transformer2: Transformer = {
      name: 'add-suffix-2',
      transform: (node) => ({ ...node, name: node.name + '-2' }),
    }

    pipeline.register(transformer1).register(transformer2)

    const result = await pipeline.execute(node)

    expect(result.name).toBe('Test-1-2')
  })

  it('should return original node if no transformers', async () => {
    const node = createContainerNode('1', 'Test', '1:1', 'FRAME')

    const result = await pipeline.execute(node)

    expect(result).toBe(node)
  })

  it('should clear all transformers', () => {
    const transformer: Transformer = {
      name: 'test',
      transform: (node) => node,
    }

    pipeline.register(transformer)
    expect(pipeline.getTransformers()).toHaveLength(1)

    pipeline.clear()
    expect(pipeline.getTransformers()).toHaveLength(0)
  })

  it('should support method chaining', () => {
    const transformer1: Transformer = {
      name: 'test1',
      transform: (node) => node,
    }

    const transformer2: Transformer = {
      name: 'test2',
      transform: (node) => node,
    }

    const result = pipeline.register(transformer1).register(transformer2)

    expect(result).toBe(pipeline)
    expect(pipeline.getTransformers()).toHaveLength(2)
  })
})
