/**
 * MCP (Model Context Protocol) Client
 * Handles direct communication with Figma Desktop via WebSocket
 */

import WebSocket from 'ws';
import { FigmaFile } from './types';

export interface ConnectionStatus {
  connected: boolean;
  message?: string;
}

export interface DesignChanges {
  type: 'node_added' | 'node_removed' | 'node_modified';
  nodeId: string;
  timestamp: number;
  data?: any;
}

interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export class MCPClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private messageId = 0;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
    }
  >();
  private changeCallbacks: Array<(changes: DesignChanges) => void> = [];
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 2000; // milliseconds

  constructor(private readonly wsUrl: string = 'ws://localhost:9001') {
    if (!wsUrl) {
      throw new Error('WebSocket URL is required');
    }
  }

  /**
   * Connect to Figma Desktop
   * @returns Connection status
   */
  async connect(): Promise<ConnectionStatus> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return {
        connected: true,
        message: 'Already connected',
      };
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        const timeout = setTimeout(() => {
          if (!this.connected) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve({
            connected: true,
            message: 'Successfully connected to Figma Desktop',
          });
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          this.connected = false;
          reject(new Error(`WebSocket error: ${error.message}`));
        });

        this.ws.on('close', () => {
          this.connected = false;
          this.handleDisconnect();
        });
      } catch (error) {
        reject(new Error(`Failed to connect: ${(error as Error).message}`));
      }
    });
  }

  /**
   * Get current open file data
   * @returns Design file data
   */
  async getCurrentFile(): Promise<FigmaFile> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Figma Desktop. Please call connect() first.');
    }

    try {
      const response = await this.sendRequest('figma.getCurrentFile', {});

      if (!response || !response.document) {
        throw new Error('Invalid response: missing document data');
      }

      return response as FigmaFile;
    } catch (error) {
      throw new Error(`Failed to get current file: ${(error as Error).message}`);
    }
  }

  /**
   * Watch for design file changes
   * @param callback - Change callback function
   */
  watchChanges(callback: (changes: DesignChanges) => void): void {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback function is required');
    }

    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Figma Desktop. Please call connect() first.');
    }

    this.changeCallbacks.push(callback);

    // Subscribe to changes if this is the first callback
    if (this.changeCallbacks.length === 1) {
      this.sendNotification('figma.watchChanges', { enabled: true }).catch((error) => {
        console.error('Failed to subscribe to changes:', error);
      });
    }
  }

  /**
   * Disconnect from Figma Desktop
   */
  disconnect(): void {
    if (this.ws) {
      // Unsubscribe from changes
      if (this.changeCallbacks.length > 0) {
        this.sendNotification('figma.watchChanges', { enabled: false }).catch((error) => {
          console.error('Failed to unsubscribe from changes:', error);
        });
      }

      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.changeCallbacks = [];
    this.pendingRequests.clear();
  }

  /**
   * Send a request and wait for response
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    const id = this.generateMessageId();
    const message: MCPMessage = {
      id,
      type: 'request',
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      try {
        this.ws!.send(JSON.stringify(message));

        // Set timeout for request
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 30000); // 30 second timeout
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * Send a notification (no response expected)
   */
  private async sendNotification(method: string, params: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    const message: MCPMessage = {
      id: this.generateMessageId(),
      type: 'notification',
      method,
      params,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: MCPMessage = JSON.parse(data.toString());

      if (message.type === 'response') {
        // Handle response to a request
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);

          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
      } else if (message.type === 'notification') {
        // Handle notifications (e.g., design changes)
        if (message.method === 'figma.designChanged' && message.params) {
          this.notifyChangeCallbacks(message.params as DesignChanges);
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnect(): void {
    // Reject all pending requests
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();

    // Attempt reconnection if not manually disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
        );
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Notify all change callbacks
   */
  private notifyChangeCallbacks(changes: DesignChanges): void {
    this.changeCallbacks.forEach((callback) => {
      try {
        callback(changes);
      } catch (error) {
        console.error('Error in change callback:', error);
      }
    });
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${++this.messageId}_${Date.now()}`;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}
