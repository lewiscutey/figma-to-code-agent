/**
 * Property-based tests for MCP Client
 * Feature: figma-to-code-agent, Property 2: MCP 协议数据提取
 * Validates: Requirements 1.2
 *
 * Property 2: For any Figma Desktop instance connected via MCP protocol,
 * the system should be able to read the complete design data of the currently
 * open file.
 */

import * as fc from 'fast-check';
import WebSocket from 'ws';
import { MCPClient } from '../../extraction/MCPClient';
import type { FigmaFile, NodeType, Node, DocumentNode } from '../../extraction/types';

type EventCallback = (...args: unknown[]) => void;

jest.mock('ws');

// Arbitrary for valid Figma node types
const nodeTypeArb: fc.Arbitrary<NodeType> = fc.constantFrom(
  'FRAME', 'GROUP', 'VECTOR', 'TEXT', 'RECTANGLE', 'ELLIPSE',
  'COMPONENT', 'COMPONENT_SET', 'INSTANCE'
);

// Leaf node arbitrary
const leafNodeArb: fc.Arbitrary<Node> = fc.record({
  id: fc.stringMatching(/^[0-9]+:[0-9]+$/),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: nodeTypeArb,
  children: fc.constant([] as Node[]),
});

// Node with children
const figmaNodeArb: fc.Arbitrary<Node> = fc.record({
  id: fc.stringMatching(/^[0-9]+:[0-9]+$/),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: nodeTypeArb,
  children: fc.array(leafNodeArb, { minLength: 0, maxLength: 5 }),
});

// Arbitrary for complete Figma file data returned via MCP
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

// Helper: count total nodes in tree
function countNodes(node: Node | DocumentNode): number {
  return 1 + (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);
}

describe('MCPClient Property Tests', () => {
  let mockWs: { on: jest.Mock; send: jest.Mock; close: jest.Mock; readyState: number };

  function resetMockWs(): void {
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    };
    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockWs();
  });

  async function createConnectedClient(): Promise<MCPClient> {
    const client = new MCPClient('ws://localhost:9001');
    const connectPromise = client.connect();
    const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
    if (openHandler) (openHandler as EventCallback)();
    await connectPromise;
    return client;
  }

  function simulateFileResponse(mockFile: FigmaFile): void {
    const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];
    if (messageHandler) {
      const sendCall = mockWs.send.mock.calls[mockWs.send.mock.calls.length - 1];
      const request = JSON.parse(sendCall[0] as string);
      const response = {
        id: request.id,
        type: 'response',
        result: mockFile,
      };
      (messageHandler as EventCallback)(JSON.stringify(response));
    }
  }

  it('Property 2: MCP protocol reads complete design data with all nodes', async () => {
    await fc.assert(
      fc.asyncProperty(figmaFileArb, async (mockFile) => {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        resetMockWs();

        const client = await createConnectedClient();

        // Start getCurrentFile request
        const filePromise = client.getCurrentFile();

        // Simulate MCP response with the generated file data
        simulateFileResponse(mockFile);

        const result = await filePromise;

        // Result must contain complete document
        expect(result).toBeDefined();
        expect(result.document).toBeDefined();
        expect(result.document.id).toBe('0:0');
        expect(result.document.type).toBe('DOCUMENT');

        // Every node must have id, name, type, children
        expect(verifyNodeCompleteness(result.document)).toBe(true);

        // Total node count must match
        expect(countNodes(result.document)).toBe(countNodes(mockFile.document));

        // File metadata must be preserved
        expect(result.name).toBe(mockFile.name);
        expect(result.version).toBe(mockFile.version);

        client.disconnect();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2 (message serialization): MCP requests are valid JSON with correct method', async () => {
    await fc.assert(
      fc.asyncProperty(figmaFileArb, async (mockFile) => {
        jest.clearAllMocks();
        resetMockWs();

        const client = await createConnectedClient();

        const filePromise = client.getCurrentFile();
        simulateFileResponse(mockFile);
        await filePromise;

        // Verify the sent message is valid JSON with correct structure
        const requestCall = mockWs.send.mock.calls.find((call: any[]) => {
          const msg = JSON.parse(call[0] as string);
          return msg.method === 'figma.getCurrentFile';
        });

        expect(requestCall).toBeDefined();
        const request = JSON.parse(requestCall![0] as string);
        expect(request).toHaveProperty('id');
        expect(request).toHaveProperty('type', 'request');
        expect(request).toHaveProperty('method', 'figma.getCurrentFile');

        client.disconnect();
      }),
      { numRuns: 100 }
    );
  });
});
