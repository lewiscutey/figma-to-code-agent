import { SemanticNamer } from '../../../transformation/transformers/SemanticNamer'
import { createContainerNode, createTextNode, createComponentNode } from '../../../transformation/ASTFactory'

describe('SemanticNamer', () => {
  let namer: SemanticNamer

  beforeEach(() => {
    namer = new SemanticNamer()
  })

  it('should convert meaningful names to camelCase', () => {
    const node = createContainerNode('1', 'User Profile', '1:1', 'FRAME')

    const result = namer.transform(node)

    expect(result.name).toBe('userProfile')
  })

  it('should rename generic frame to container', () => {
    const node = createContainerNode('1', 'Frame', '1:1', 'FRAME')

    const result = namer.transform(node)

    expect(result.name).toBe('container')
  })

  it('should rename text nodes', () => {
    const node = createTextNode('1', 'Rectangle', '1:1')

    const result = namer.transform(node)

    // Text nodes use first few words of textContent or name
    expect(result.name).toBe('rectangle')
  })

  it('should use component name for components', () => {
    const node = createComponentNode('1', 'Frame', '1:1', 'Button')

    const result = namer.transform(node)

    expect(result.name).toBe('button')
  })

  it('should name flex containers by direction', () => {
    const node = createContainerNode('1', 'Group', '1:1', 'FRAME')
    node.layout.display = 'flex'
    node.layout.flexDirection = 'row'

    const result = namer.transform(node)

    expect(result.name).toBe('row')
  })

  it('should recursively rename children', () => {
    const parent = createContainerNode('1', 'Frame', '1:1', 'FRAME')
    const child = createContainerNode('2', 'Frame', '1:2', 'FRAME')
    parent.children = [child]

    const result = namer.transform(parent)

    expect(result.children[0].name).toBe('container')
  })
})
