/**
 * Unit tests for FigmaAPIClient
 */

import axios from 'axios';
import * as fs from 'fs';
import { FigmaAPIClient } from '../../extraction/FigmaAPIClient';
import { FigmaFile, ImageMap } from '../../extraction/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FigmaAPIClient', () => {
  let client: FigmaAPIClient;
  const mockAccessToken = 'test-token-123';
  const mockFileKey = 'test-file-key';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup axios.create mock
    const mockAxiosInstance = {
      get: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    client = new FigmaAPIClient(mockAccessToken);
  });

  describe('constructor', () => {
    it('should throw error when access token is not provided', () => {
      expect(() => new FigmaAPIClient('')).toThrow('Figma access token is required');
    });

    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.figma.com/v1',
        headers: {
          'X-Figma-Token': mockAccessToken,
        },
        timeout: 60000,
      });
    });
  });

  describe('getFile', () => {
    const mockFigmaFile: FigmaFile = {
      name: 'Test File',
      lastModified: '2024-01-01T00:00:00Z',
      version: '1.0',
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [],
      },
      components: {},
      styles: {},
    };

    it('should fetch file successfully', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockAxiosInstance.get.mockResolvedValue({ data: mockFigmaFile });

      const result = await client.getFile(mockFileKey);

      expect(result).toEqual(mockFigmaFile);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/files/${mockFileKey}`,
        { params: undefined }
      );
    });

    it('should throw error when file key is not provided', async () => {
      await expect(client.getFile('')).rejects.toThrow('File key is required');
    });

    it('should handle authentication error (403)', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const error = {
        isAxiosError: true,
        response: { status: 403 },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.getFile(mockFileKey)).rejects.toThrow(
        'Authentication failed. Please check your Figma access token.'
      );
    });

    it('should handle not found error (404)', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const error = {
        isAxiosError: true,
        response: { status: 404 },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.getFile(mockFileKey)).rejects.toThrow(
        'File not found. Please check the file key and ensure you have access to the file.'
      );
    });

    it('should retry on network errors', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const networkError = {
        isAxiosError: true,
        request: {},
      };
      
      // Fail twice, then succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: mockFigmaFile });
      
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await client.getFile(mockFileKey);

      expect(result).toEqual(mockFigmaFile);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx server errors', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const serverError = {
        isAxiosError: true,
        response: { status: 500 },
      };
      
      // Fail once, then succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: mockFigmaFile });
      
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await client.getFile(mockFileKey);

      expect(result).toEqual(mockFigmaFile);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit error (429)', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429, headers: { 'retry-after': '1' } },
      };
      
      // Fail once, then succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: mockFigmaFile });
      
      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await client.getFile(mockFileKey);

      expect(result).toEqual(mockFigmaFile);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const networkError = {
        isAxiosError: true,
        request: {},
        message: 'Network error',
      };
      
      mockAxiosInstance.get.mockRejectedValue(networkError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.getFile(mockFileKey)).rejects.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('getImages', () => {
    const mockNodeIds = ['1:1', '1:2'];
    const mockImageMap: ImageMap = {
      images: {
        '1:1': 'https://example.com/image1.png',
        '1:2': 'https://example.com/image2.png',
      },
    };

    it('should fetch images successfully', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockAxiosInstance.get.mockResolvedValue({ data: mockImageMap });

      const result = await client.getImages(mockFileKey, mockNodeIds, 'png');

      expect(result).toEqual(mockImageMap);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/images/${mockFileKey}`,
        {
          params: {
            ids: '1:1,1:2',
            format: 'png',
            scale: 2,
          },
        }
      );
    });

    it('should throw error when file key is not provided', async () => {
      await expect(client.getImages('', mockNodeIds)).rejects.toThrow(
        'File key is required'
      );
    });

    it('should throw error when node IDs are empty', async () => {
      await expect(client.getImages(mockFileKey, [])).rejects.toThrow(
        'At least one node ID is required'
      );
    });

    it('should handle API error response', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const errorResponse: ImageMap = {
        err: 'Invalid node IDs',
        images: {},
      };
      mockAxiosInstance.get.mockResolvedValue({ data: errorResponse });

      await expect(client.getImages(mockFileKey, mockNodeIds)).rejects.toThrow(
        'Figma API error: Invalid node IDs'
      );
    });

    it('should use default format when not specified', async () => {
      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockAxiosInstance.get.mockResolvedValue({ data: mockImageMap });

      await client.getImages(mockFileKey, mockNodeIds);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/images/${mockFileKey}`,
        expect.objectContaining({
          params: expect.objectContaining({
            format: 'png',
          }),
        })
      );
    });
  });

  describe('downloadImage', () => {
    const mockImageUrl = 'https://example.com/image.png';
    const mockOutputPath = '/path/to/output/image.png';
    const mockImageData = Buffer.from('fake-image-data');

    beforeEach(() => {
      // existsSync: false for output file (not cached), true for directory
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => undefined);
      mockedFs.writeFileSync.mockImplementation(() => undefined);
    });

    it('should download image successfully', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedAxios.get.mockResolvedValue({ data: mockImageData });

      await client.downloadImage(mockImageUrl, mockOutputPath);

      expect(mockedAxios.get).toHaveBeenCalledWith(mockImageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        mockOutputPath,
        mockImageData
      );
    });

    it('should skip download if file already exists (cached)', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      await client.downloadImage(mockImageUrl, mockOutputPath);

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedAxios.get.mockResolvedValue({ data: mockImageData });

      await client.downloadImage(mockImageUrl, mockOutputPath);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/path/to/output', {
        recursive: true,
      });
    });

    it('should throw error when image URL is not provided', async () => {
      await expect(client.downloadImage('', mockOutputPath)).rejects.toThrow(
        'Image URL is required'
      );
    });

    it('should throw error when output path is not provided', async () => {
      await expect(client.downloadImage(mockImageUrl, '')).rejects.toThrow(
        'Output path is required'
      );
    });

    it('should retry on network errors', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      const networkError = {
        isAxiosError: true,
        request: {},
      };
      
      // Fail once, then succeed
      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: mockImageData });
      
      mockedAxios.isAxiosError.mockReturnValue(true);

      await client.downloadImage(mockImageUrl, mockOutputPath);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        mockOutputPath,
        mockImageData
      );
    });
  });
});
