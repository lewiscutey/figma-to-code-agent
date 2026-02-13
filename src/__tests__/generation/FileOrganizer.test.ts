import { FileOrganizer } from '../../generation/FileOrganizer';
import type { ASTNode } from '../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: 'n1',
    type: 'Container',
    name: 'test',
    children: [],
    layout: {
      display: 'block',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
    styles: {},
    metadata: {
      figmaId: '1:1',
      figmaType: 'FRAME',
      isComponent: false,
      exportable: false,
    },
    ...overrides,
  } as ASTNode;
}

describe('FileOrganizer', () => {
  describe('generateFileName', () => {
    it('generates PascalCase.jsx for React', () => {
      const org = new FileOrganizer('react', './output');
      expect(org.generateFileName('my-button')).toBe('MyButton.jsx');
    });

    it('generates PascalCase.tsx for React with TypeScript', () => {
      const org = new FileOrganizer('react', './output');
      expect(org.generateFileName('my-button', true)).toBe('MyButton.tsx');
    });

    it('generates kebab-case.vue for Vue', () => {
      const org = new FileOrganizer('vue', './output');
      expect(org.generateFileName('MyButton')).toBe('my-button.vue');
    });
  });

  describe('generateStructure', () => {
    it('maps components to directories', () => {
      const org = new FileOrganizer('react', './output');
      const root = makeNode({
        type: 'Component',
        name: 'App',
        metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: true, componentName: 'App', exportable: false },
        children: [
          makeNode({
            type: 'Component',
            name: 'Header',
            metadata: { figmaId: '1:2', figmaType: 'FRAME', isComponent: true, componentName: 'Header', exportable: false },
          }),
        ],
      });
      const structure = org.generateStructure(root);
      expect(structure.get('App')).toBeDefined();
      expect(structure.get('Header')).toBeDefined();
    });
  });

  describe('generatePropsInterface', () => {
    it('generates props with children for text nodes', () => {
      const org = new FileOrganizer('react', './output');
      const node = makeNode({
        type: 'Component',
        name: 'Card',
        metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: true, componentName: 'Card', exportable: false },
        children: [
          makeNode({ type: 'Text', name: 'title' }),
        ],
      });
      const props = org.generatePropsInterface(node);
      expect(props).toContain('CardProps');
      expect(props).toContain('children');
      expect(props).toContain('className');
    });

    it('generates imageSrc prop for image children', () => {
      const org = new FileOrganizer('react', './output');
      const node = makeNode({
        type: 'Component',
        name: 'Avatar',
        metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: true, componentName: 'Avatar', exportable: false },
        children: [
          makeNode({ type: 'Image', name: 'photo' }),
        ],
      });
      const props = org.generatePropsInterface(node);
      expect(props).toContain('imageSrc');
    });

    it('returns empty string for nodes with no inferrable props', () => {
      const org = new FileOrganizer('react', './output');
      const node = makeNode({
        type: 'Component',
        name: 'Divider',
        metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: true, componentName: 'Divider', exportable: false },
      });
      const props = org.generatePropsInterface(node);
      // Should still have className
      expect(props).toContain('className');
    });
  });
});
