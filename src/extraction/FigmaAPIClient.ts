/**
 * Figma API Client
 * Handles communication with Figma REST API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { FigmaFile, GetFileOptions, ImageFormat, ImageMap } from './types';
import { FigmaCache } from './FigmaCache';

export class FigmaAPIClient {
  private readonly baseURL = 'https://api.figma.com/v1';
  private readonly axiosInstance: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // milliseconds
  private readonly cache: FigmaCache;
  private readonly cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours (increased from 5 minutes)

  constructor(private readonly accessToken: string, enableCache = true) {
    if (!accessToken) {
      throw new Error('Figma access token is required');
    }

    this.cache = enableCache ? new FigmaCache() : null as any;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Figma-Token': this.accessToken,
      },
      timeout: 60000, // Increased to 60 seconds
    });
  }

  /**
   * Get file's complete design data
   * @param fileKey - Figma file ID
   * @param options - Optional query parameters
   * @returns Design file data
   */
  async getFile(
    fileKey: string,
    options?: GetFileOptions
  ): Promise<FigmaFile> {
    if (!fileKey) {
      throw new Error('File key is required');
    }

    // Check cache first
    const cacheKey = `file:${fileKey}:${JSON.stringify(options || {})}`;
    if (this.cache) {
      const cached = this.cache.get<FigmaFile>(cacheKey, this.cacheMaxAge);
      if (cached) {
        console.log('✓ Using cached Figma file data (cache hit)');
        return cached;
      }
    }

    console.log('Fetching from Figma API (this may take a moment)...');
    try {
      const response = await this.retryRequest(async () => {
        return await this.axiosInstance.get<FigmaFile>(`/files/${fileKey}`, {
          params: options,
        });
      });

      console.log('✓ Successfully fetched from Figma API');

      // Cache the result
      if (this.cache) {
        this.cache.set(cacheKey, response.data);
        console.log('✓ Cached for future use');
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch Figma file');
    }
  }

  /**
   * Get image resource URLs from file
   * @param fileKey - Figma file ID
   * @param nodeIds - List of node IDs to export
   * @param format - Image format (png, jpg, svg, pdf)
   * @returns Image URL mapping
   */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    format: ImageFormat = 'png'
  ): Promise<ImageMap> {
    if (!fileKey) {
      throw new Error('File key is required');
    }

    if (!nodeIds || nodeIds.length === 0) {
      throw new Error('At least one node ID is required');
    }

    // Check cache first
    const cacheKey = `images:${fileKey}:${nodeIds.join(',')}:${format}`;
    if (this.cache) {
      const cached = this.cache.get<ImageMap>(cacheKey, this.cacheMaxAge);
      if (cached) {
        console.log('✓ Using cached image URLs');
        return cached;
      }
    }

    try {
      const response = await this.retryRequest(async () => {
        return await this.axiosInstance.get<ImageMap>(
          `/images/${fileKey}`,
          {
            params: {
              ids: nodeIds.join(','),
              format,
              scale: 2,
            },
          }
        );
      });

      if (response.data.err) {
        throw new Error(`Figma API error: ${response.data.err}`);
      }

      // Cache the result
      if (this.cache) {
        this.cache.set(cacheKey, response.data);
        console.log('✓ Cached image URLs');
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch images');
    }
  }

  /**
   * Download image resource to local file
   * @param imageUrl - Image URL
   * @param outputPath - Save path
   */
  async downloadImage(imageUrl: string, outputPath: string): Promise<void> {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    if (!outputPath) {
      throw new Error('Output path is required');
    }

    // Check if file already exists (cached locally)
    if (fs.existsSync(outputPath)) {
      console.log(`✓ Using cached image: ${path.basename(outputPath)}`);
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      console.log(`Downloading image: ${path.basename(outputPath)}...`);
      const response = await this.retryRequest(async () => {
        return await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 60000, // 60 seconds for image download
        });
      });

      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ Downloaded: ${path.basename(outputPath)}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to download image');
    }
  }

  /**
   * Retry request with exponential backoff and Retry-After header support
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        // Check for Retry-After header (429 rate limit)
        let delay = this.baseRetryDelay * (this.maxRetries - retries + 1);
        
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            const retryAfterSeconds = parseInt(retryAfter);
            const retryAfterMs = retryAfterSeconds * 1000;
            
            // If rate limit is more than 1 minute, don't retry
            if (retryAfterSeconds > 60) {
              const hours = Math.floor(retryAfterSeconds / 3600);
              const minutes = Math.floor((retryAfterSeconds % 3600) / 60);
              throw new Error(
                `Figma API rate limit exceeded. Please try again in ${hours}h ${minutes}m. ` +
                `Tip: Use a different Figma token or wait for the rate limit to reset.`
              );
            }
            
            delay = retryAfterMs;
            console.log(`Rate limited. Waiting ${retryAfterSeconds}s before retry...`);
          }
        }
        
        await this.sleep(delay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable (network errors, rate limits, server errors)
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // Retry on network errors or 5xx server errors or 429 rate limit
      return (
        !axiosError.response ||
        axiosError.response.status >= 500 ||
        axiosError.response.status === 429
      );
    }
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, message: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Authentication error
      if (axiosError.response?.status === 403) {
        return new Error(
          'Authentication failed. Please check your Figma access token.'
        );
      }

      // Not found error
      if (axiosError.response?.status === 404) {
        return new Error(
          'File not found. Please check the file key and ensure you have access to the file.'
        );
      }

      // Rate limit error
      if (axiosError.response?.status === 429) {
        return new Error(
          'Rate limit exceeded. Please try again later.'
        );
      }

      // Other API errors
      if (axiosError.response) {
        const errorData = axiosError.response.data as any;
        const errorMessage = errorData?.err || errorData?.message || 'Unknown API error';
        return new Error(`${message}: ${errorMessage}`);
      }

      // Network errors
      if (axiosError.request) {
        return new Error(
          `${message}: Network error. Please check your internet connection.`
        );
      }
    }

    // Generic error
    return new Error(`${message}: ${error.message || 'Unknown error'}`);
  }
}
