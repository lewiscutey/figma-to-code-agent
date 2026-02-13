/**
 * Property-based tests for Figma API Client
 * Feature: figma-to-code-agent
 * Property 1: Figma API 数据完整性 - Validates: Requirements 1.1, 1.3
 * Property 3: 组件识别完整性 - Validates: Requirements 1.4
 * Property 4: 图像资源提取 - Validates: Requirements 1.5
 */

import * as fc from 'fast-check';
import axios from 'axios';
import { FigmaAPIClient } from '../../extraction/FigmaAPIClient';
import type { FigmaFile, NodeType, Node, DocumentNode } from '../../extraction/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Arbitrary for valid Figma node types
const nodeTypeArb: fc.Arbitrary<NodeType> = fc.constantFrom(
  'FRAME', 'GROUP', 'VECTOR', 'TEXT', 'RECTANGLE', 'ELLIPSE',
  'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'POLYGON', 'STAR', 'LINE'
);

// Leaf node arbitrary
const leafNodeArb: fc.Arbitrary<Node> = fc.record({
  id: fc.stringMatching(/^[0-9]+:[0-9]+$/),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: nodeTypeArb,
  visible: fc.boolean(),
  children: fc.constant([] as Node[]),
});

// Node with children (one level deep)
const figmaNodeArb: fc.Arbitrary<Node> = fc.record({
  id: fc.stringMatching(/^[0-9]+:[0-9]+$/),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: nodeTypeArb,
  visible: fc.boolean(),
  children: fc.array(leafNodeArb, { minLength: 0, maxLength: 5 }),
});

// Arbitrary for complete Figma file responses
const figmaFileArb: fc.Arbitrary<FigmaFile> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  lastModified: fc.date().map((d) => d.toISOString()),
  version: fc.stringMatching(/^[0-9]+\.[0-9]+$/),
  document: fc.array(figmaNodeArb, { minLength: 1, maxLength: 8 }).map((children) => ({
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT' as NodeType,
    children,
  })),
  components: fc.constant({}),
  styles: fc.constant({}),
});

// Helper: recursively verify every node has required fields
function verifyNodeCompleteness(node: Node | DocumentNode): boolean {
  if (!node.id || !node.name || !node.type) return false;
  if (!Array.isArray(node.children)) return false;
  return node.children.every((child) => verifyNodeCompleteness(child));
}

// Helper: count nodes of specific types in tree
function countTypes(node: Node | DocumentNode, types: string[]): number {
  let count = types.includes(node.type) ? 1 : 0;
  if (node.children) {
    count += node.children.reduce((sum, child) => sum + countTypes(child, types), 0);
  }
  return count;
}

describe('FigmaAPIClient Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createClient(): { client: FigmaAPIClient; mockGet: jest.Mock } {
    const mockAxiosInstance = { get: jest.fn() };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    // Disable cache to avoid cross-iteration interference
    const client = new FigmaAPIClient('test-token', false);
    return { client, mockGet: mockAxiosInstance.get };
  }

  it('Property 1: Figma API data contains complete node tree with id/name/type/children', async () => {
    await fc.assert(
      fc.asyncProperty(figmaFileArb, async (mockFile) => {
        const { client, mockGet } = createClient();
        mockGet.mockResolvedValue({ data: mockFile });

        const result = await client.getFile('test-file-key');

        // Document root must have required fields
        expect(result.document).toBeDefined();
        expect(result.document.id).toBe('0:0');
        expect(result.document.type).toBe('DOCUMENT');
        expect(Array.isArray(result.document.children)).toBe(true);

        // Every node in the tree must have id, name, type, children
        expect(verifyNodeCompleteness(result.document)).toBe(true);

        // Number of top-level children must match
        expect(result.document.children.length).toBe(mockFile.document.children.length);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1 (component identification): all COMPONENT/INSTANCE nodes are preserved', async () => {
    await fc.assert(
      fc.asyncProperty(figmaFileArb, async (mockFile) => {
        const { client, mockGet } = createClient();
        mockGet.mockResolvedValue({ data: mockFile });

        const result = await client.getFile('test-file-key');

        const inputComponents = countTypes(mockFile.document, ['COMPONENT', 'INSTANCE']);
        const outputComponents = countTypes(result.document, ['COMPONENT', 'INSTANCE']);

        // All component/instance nodes must be preserved
        expect(outputComponents).toBe(inputComponents);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: figma-to-code-agent, Property 3: 组件识别完整性
   * For any design file containing Figma components, the extracted data should
   * contain all component definitions (COMPONENT nodes) and all their instances
   * (INSTANCE nodes).
   */
  it('Property 3: all COMPONENT definitions and INSTANCE nodes are preserved in extraction', async () => {
    // Arbitrary that guarantees at least one COMPONENT and one INSTANCE node
    const componentNodeArb: fc.Arbitrary<Node> = fc.record({
      id: fc.stringMatching(/^[0-9]+:[0-9]+$/),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      type: fc.constant('COMPONENT' as NodeType),
      visible: fc.constant(true),
      children: fc.array(leafNodeArb, { minLength: 0, maxLength: 3 }),
    });

    const instanceNodeArb: fc.Arbitrary<Node> = fc.record({
      id: fc.stringMatching(/^[0-9]+:[0-9]+$/),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      type: fc.constant('INSTANCE' as NodeType),
      visible: fc.constant(true),
      componentId: fc.stringMatching(/^[0-9]+:[0-9]+$/),
      children: fc.constant([] as Node[]),
    });

    const fileWithComponentsArb: fc.Arbitrary<FigmaFile> = fc.tuple(
      fc.array(componentNodeArb, { minLength: 1, maxLength: 5 }),
      fc.array(instanceNodeArb, { minLength: 1, maxLength: 5 }),
      fc.array(figmaNodeArb, { minLength: 0, maxLength: 3 }),
    ).map(([components, instances, others]) => ({
      name: 'Component File',
      lastModified: new Date().toISOString(),
      version: '1.0',
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT' as NodeType,
        children: [...components, ...instances, ...others],
      },
      components: {},
      styles: {},
    }));

    await fc.assert(
      fc.asyncProperty(fileWithComponentsArb, async (mockFile) => {
        const { client, mockGet } = createClient();
        mockGet.mockResolvedValue({ data: mockFile });

        const result = await client.getFile('test-file-key');

        const inputComponentCount = countTypes(mockFile.document, ['COMPONENT']);
        const inputInstanceCount = countTypes(mockFile.document, ['INSTANCE']);
        const outputComponentCount = countTypes(result.document, ['COMPONENT']);
        const outputInstanceCount = countTypes(result.document, ['INSTANCE']);

        // Must have at least 1 of each (guaranteed by arbitrary)
        expect(inputComponentCount).toBeGreaterThanOrEqual(1);
        expect(inputInstanceCount).toBeGreaterThanOrEqual(1);

        // All must be preserved
        expect(outputComponentCount).toBe(inputComponentCount);
        expect(outputInstanceCount).toBe(inputInstanceCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: figma-to-code-agent, Property 4: 图像资源提取
   * For any design file containing image nodes, the system should return image
   * URLs for all requested node IDs, and the count of returned URLs should equal
   * the number of image nodes requested.
   */
  it('Property 4: getImages returns URLs for all requested image node IDs', async () => {
    const nodeIdArb = fc.stringMatching(/^[0-9]+:[0-9]+$/);
    const nodeIdsArb = fc.array(nodeIdArb, { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(nodeIdsArb, async (nodeIds) => {
        const { client, mockGet } = createClient();

        // Build a mock response where every nodeId has an image URL
        const images: Record<string, string> = {};
        for (const id of nodeIds) {
          images[id] = `https://figma-images.example.com/${id.replace(':', '-')}.png`;
        }

        mockGet.mockResolvedValue({ data: { images } });

        const result = await client.getImages('test-file-key', nodeIds, 'png');

        // Every requested node ID should have a corresponding image URL
        for (const id of nodeIds) {
          expect(result.images[id]).toBeDefined();
          expect(typeof result.images[id]).toBe('string');
          expect(result.images[id].length).toBeGreaterThan(0);
        }

        // Number of returned URLs should equal number of requested IDs
        expect(Object.keys(result.images).length).toBe(nodeIds.length);
      }),
      { numRuns: 100 }
    );
  });
});
