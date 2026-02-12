import { ComponentExtractor } from '../../../transformation/transformers/ComponentExtractor'
import { createContainerNode, createTextNode } from '../../../transformation/ASTFactory'

describe('ComponentExtractor', () => {
  let extractor: ComponentExtractor

  beforeEach(() => {
    extractor = new ComponentExtractor()
  })

  it('should mark repeated patterns as components', () => {
    const root = createContainerNode('1', 'Root', '1:1', 'FRAME')

    // Create two identical Container children (not Text — Text nodes are never converted)
    const child1 = createContainerNode('2', 'Button', '1:2', 'FRAME')
    child1.styles.backgroundColor = { r: 0, g: 0, b: 255, a: 1 }
    child1.styles.borderRadius = 4

    const child2 = createContainerNode('3', 'Button', '1:3', 'FRAME')
    child2.styles.backgroundColor = { r: 0, g: 0, b: 255, a: 1 }
    child2.styles.borderRadius = 4

    root.children = [child1, child2]
    child1.parent = root
    child2.parent = root

    const result = extractor.transform(root)

    expect(result.children[0].type).toBe('Component')
    expect(result.children[0].metadata.isComponent).toBe(true)
    expect(result.children[1].type).toBe('Component')
    expect(result.children[1].metadata.isComponent).toBe(true)
  })

  it('should not mark unique nodes as components', () => {
    const root = createContainerNode('1', 'Root', '1:1', 'FRAME')

    const child1 = createTextNode('2', 'Text1', '1:2')
    child1.styles.backgroundColor = { r: 255, g: 0, b: 0, a: 1 }

    const child2 = createTextNode('3', 'Text2', '1:3')
    child2.styles.backgroundColor = { r: 0, g: 255, b: 0, a: 1 }

    root.children = [child1, child2]
    child1.parent = root
    child2.parent = root

    const result = extractor.transform(root)

    expect(result.children[0].type).toBe('Text')
    expect(result.children[0].metadata.isComponent).toBe(false)
    expect(result.children[1].type).toBe('Text')
    expect(result.children[1].metadata.isComponent).toBe(false)
  })

  it('should never convert Text/Image/Shape nodes to Component', () => {
    const root = createContainerNode('1', 'Root', '1:1', 'FRAME')

    // Two identical Text nodes — should NOT become Component
    const child1 = createTextNode('2', 'Label', '1:2')
    const child2 = createTextNode('3', 'Label', '1:3')

    root.children = [child1, child2]
    child1.parent = root
    child2.parent = root

    const result = extractor.transform(root)

    expect(result.children[0].type).toBe('Text')
    expect(result.children[1].type).toBe('Text')
  })

  it('should preserve existing components', () => {
    const root = createContainerNode('1', 'Root', '1:1', 'FRAME')

    const child = createTextNode('2', 'ExistingComponent', '1:2')
    child.metadata.isComponent = true
    child.metadata.componentName = 'ExistingComponent'

    root.children = [child]
    child.parent = root

    const result = extractor.transform(root)

    expect(result.children[0].metadata.isComponent).toBe(true)
    expect(result.children[0].metadata.componentName).toBe('ExistingComponent')
  })

  it('should generate meaningful component names', () => {
    const root = createContainerNode('1', 'Root', '1:1', 'FRAME')

    const child1 = createContainerNode('2', 'Button', '1:2', 'FRAME')
    const child2 = createContainerNode('3', 'Button', '1:3', 'FRAME')

    root.children = [child1, child2]
    child1.parent = root
    child2.parent = root

    const result = extractor.transform(root)

    expect(result.children[0].metadata.componentName).toBe('Button')
  })
})
