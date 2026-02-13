/**
 * Property-based tests for Figma API Client
 * Feature: figma-to-code-agent, Property 1: Figma API 数据完整性
 * Validates: Requirements 1.1, 1.3
 *
 * Property 1: For any valid Figma file ID, data extracted via the Figma API
 * should contain a complete document node tree where every node has id, name,
 * type, and children properties.
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
});
