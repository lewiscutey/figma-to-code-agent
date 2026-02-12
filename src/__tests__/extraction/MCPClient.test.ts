/**
 * MCPClient Unit Tests
 */

import { MCPClient } from '../../extraction/MCPClient';
import WebSocket from 'ws';

type EventCallback = (...args: unknown[]) => void;

// Mock WebSocket
jest.mock('ws');

describe('MCPClient', () => {
  let client: MCPClient;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new MCPClient('ws://localhost:9001');

    // Create a mock WebSocket instance
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    } as any;

    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create instance with default URL', () => {
      const defaultClient = new MCPClient();
      expect(defaultClient).toBeInstanceOf(MCPClient);
    });

    it('should create instance with custom URL', () => {
      const customClient = new MCPClient('ws://custom:8080');
      expect(customClient).toBeInstanceOf(MCPClient);
    });

    it('should throw error if URL is empty', () => {
      expect(() => new MCPClient('')).toThrow('WebSocket URL is required');
    });
  });

  describe('connect', () => {
    it('should successfully connect to Figma Desktop', async () => {
      const connectPromise = client.connect();

      // Simulate successful connection
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }

      const status = await connectPromise;
      expect(status.connected).toBe(true);
      expect(status.message).toContain('Successfully connected');
    });

    it('should return already connected status if already connected', async () => {
      // First connection
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;

      // Second connection attempt
      const status = await client.connect();
      expect(status.connected).toBe(true);
      expect(status.message).toContain('Already connected');
    });

    it('should handle connection error', async () => {
      const connectPromise = client.connect();

      // Simulate connection error
      const errorHandler = mockWs.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) {
        (errorHandler as EventCallback)(new Error('Connection refused'));
      }

      await expect(connectPromise).rejects.toThrow('WebSocket error');
    });

    it('should timeout if connection takes too long', async () => {
      jest.useFakeTimers();

      const connectPromise = client.connect();

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(10000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');

      jest.useRealTimers();
    });
  });

  describe('getCurrentFile', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;
    });

    it('should throw error if not connected', async () => {
      const disconnectedClient = new MCPClient();
      await expect(disconnectedClient.getCurrentFile()).rejects.toThrow(
        'Not connected to Figma Desktop'
      );
    });

    it('should successfully get current file', async () => {
      const mockFile = {
        name: 'Test File',
        lastModified: '2024-01-01',
        version: '1.0',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT' as const,
          children: [],
        },
        components: {},
        styles: {},
      };

      // Start the request
      const filePromise = client.getCurrentFile();

      // Simulate response
      const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')?.[1];
      if (messageHandler) {
        const sendCall = mockWs.send.mock.calls[0];
        const request = JSON.parse(sendCall[0] as string);

        const response = {
          id: request.id,
          type: 'response',
          result: mockFile,
        };

        (messageHandler as EventCallback)(JSON.stringify(response));
      }

      const file = await filePromise;
      expect(file).toEqual(mockFile);
      expect(file.name).toBe('Test File');
    });

    it('should handle error response', async () => {
      const filePromise = client.getCurrentFile();

      // Simulate error response
      const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')?.[1];
      if (messageHandler) {
        const sendCall = mockWs.send.mock.calls[0];
        const request = JSON.parse(sendCall[0] as string);

        const response = {
          id: request.id,
          type: 'response',
          error: {
            code: -1,
            message: 'No file is currently open',
          },
        };

        (messageHandler as EventCallback)(JSON.stringify(response));
      }

      await expect(filePromise).rejects.toThrow('No file is currently open');
    });
  });

  describe('watchChanges', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;
    });

    it('should throw error if not connected', () => {
      const disconnectedClient = new MCPClient();
      expect(() => {
        disconnectedClient.watchChanges(() => {});
      }).toThrow('Not connected to Figma Desktop');
    });

    it('should throw error if callback is not a function', () => {
      expect(() => {
        client.watchChanges(null as any);
      }).toThrow('Callback function is required');
    });

    it('should register change callback', () => {
      const callback = jest.fn();
      client.watchChanges(callback);

      // Verify subscription message was sent
      expect(mockWs.send).toHaveBeenCalled();
      const sendCall = mockWs.send.mock.calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.method === 'figma.watchChanges';
      });
      expect(sendCall).toBeDefined();
    });

    it('should call callback when changes are received', () => {
      const callback = jest.fn();
      client.watchChanges(callback);

      // Simulate change notification
      const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')?.[1];
      if (messageHandler) {
        const notification = {
          id: 'notif_1',
          type: 'notification',
          method: 'figma.designChanged',
          params: {
            type: 'node_modified',
            nodeId: '1:2',
            timestamp: Date.now(),
          },
        };

        (messageHandler as EventCallback)(JSON.stringify(notification));
      }

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'node_modified',
          nodeId: '1:2',
        })
      );
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      // Connect first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;

      // Disconnect
      client.disconnect();

      expect(mockWs.close).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });

    it('should unsubscribe from changes before disconnecting', async () => {
      // Connect and watch changes
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;

      client.watchChanges(() => {});

      // Clear previous calls
      mockWs.send.mockClear();

      // Disconnect
      client.disconnect();

      // Should send unsubscribe message
      expect(mockWs.send).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;

      expect(client.isConnected()).toBe(true);
    });
  });

  describe('message serialization', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      if (openHandler) {
        (openHandler as EventCallback)();
      }
      await connectPromise;
    });

    it('should serialize request messages correctly', async () => {
      client.getCurrentFile().catch(() => {}); // Ignore promise rejection

      const sendCall = mockWs.send.mock.calls[0];
      const message = JSON.parse(sendCall[0] as string);

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('type', 'request');
      expect(message).toHaveProperty('method', 'figma.getCurrentFile');
      expect(message).toHaveProperty('params');
    });

    it('should deserialize response messages correctly', async () => {
      const mockFile = {
        name: 'Test',
        lastModified: '2024-01-01',
        version: '1.0',
        document: { id: '0:0', name: 'Doc', type: 'DOCUMENT' as const, children: [] },
        components: {},
        styles: {},
      };

      const filePromise = client.getCurrentFile();

      // Simulate response
      const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')?.[1];
      if (messageHandler) {
        const sendCall = mockWs.send.mock.calls[0];
        const request = JSON.parse(sendCall[0] as string);

        const response = JSON.stringify({
          id: request.id,
          type: 'response',
          result: mockFile,
        });

        (messageHandler as EventCallback)(response);
      }

      const file = await filePromise;
      expect(file).toEqual(mockFile);
    });
  });
});
