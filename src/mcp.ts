#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server for Figma-to-Code Agent
 * Exposes tools for Claude Skills and other MCP-enabled clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { FigmaToCodeAgent } from './FigmaToCodeAgent';
import * as fs from 'fs';
import * as path from 'path';

// Parse Figma URL to extract file key and node ID
function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const fileIndex = pathParts.indexOf('file');
  
  if (fileIndex === -1 || fileIndex + 1 >= pathParts.length) {
    throw new Error('Invalid Figma URL: could not extract file key');
  }
  
  const fileKey = pathParts[fileIndex + 1];
  const nodeId = urlObj.searchParams.get('node-id') || undefined;
  
  return { fileKey, nodeId };
}

// Create MCP server
const server = new Server(
  {
    name: 'figma-to-code-agent',
    version: '0.8.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'figma_to_code',
        description: 'Convert Figma design to production-ready React or Vue code',
        inputSchema: {
          type: 'object',
          properties: {
            figmaUrl: {
              type: 'string',
              description: 'The URL of the Figma design',
            },
            framework: {
              type: 'string',
              enum: ['react', 'vue'],
              default: 'react',
            },
            styleMode: {
              type: 'string',
              enum: ['css-modules', 'tailwind', 'css'],
              default: 'css-modules',
            },
            typescript: {
              type: 'boolean',
              default: false,
            },
            outputPath: {
              type: 'string',
              default: './output',
            },
            enableAI: {
              type: 'boolean',
              default: false,
            },
            extractTokens: {
              type: 'string',
              enum: ['css', 'scss', 'json', 'js'],
            },
          },
          required: ['figmaUrl'],
        },
      },
      {
        name: 'analyze_design',
        description: 'Analyze Figma design for complexity and issues',
        inputSchema: {
          type: 'object',
          properties: {
            figmaUrl: {
              type: 'string',
              description: 'The URL of the Figma design to analyze',
            },
            checkAccessibility: {
              type: 'boolean',
              default: true,
            },
            checkPerformance: {
              type: 'boolean',
              default: true,
            },
            checkConsistency: {
              type: 'boolean',
              default: true,
            },
          },
          required: ['figmaUrl'],
        },
      },
      {
        name: 'update_component',
        description: 'Update existing component to match new Figma design',
        inputSchema: {
          type: 'object',
          properties: {
            figmaUrl: {
              type: 'string',
              description: 'The URL of the new Figma design',
            },
            componentPath: {
              type: 'string',
              description: 'Path to the existing component file',
            },
            preserveLogic: {
              type: 'boolean',
              default: true,
            },
            updateMode: {
              type: 'string',
              enum: ['styles-only', 'structure-only', 'full'],
              default: 'full',
            },
          },
          required: ['figmaUrl', 'componentPath'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'figma_to_code': {
        const {
          figmaUrl,
          framework = 'react',
          styleMode = 'css-modules',
          typescript = false,
          outputPath = './output',
          enableAI = false,
          extractTokens,
        } = args as any;

        if (!figmaUrl) {
          throw new Error('figmaUrl is required');
        }

        const figmaToken = process.env.FIGMA_TOKEN;
        if (!figmaToken) {
          throw new Error('FIGMA_TOKEN environment variable is required');
        }

        const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

        const config = {
          figmaToken,
          fileKey,
          nodeIds: nodeId ? [nodeId] : undefined,
          framework: framework as 'react' | 'vue',
          styleMode: styleMode as 'css-modules' | 'tailwind' | 'css',
          typescript,
          outputDir: outputPath,
          extractTokens: extractTokens as 'css' | 'scss' | 'json' | 'js' | undefined,
          llm: enableAI
            ? {
                provider: (process.env.LLM_PROVIDER || 'bedrock') as 'bedrock' | 'openai' | 'anthropic',
                model: process.env.LLM_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0',
                region: process.env.AWS_REGION,
                apiKey: process.env.LLM_API_KEY,
                enableAINaming: true,
                enableAISplitting: true,
                enableAIOptimization: true,
                enableAILayout: true,
              }
            : undefined,
        };

        const agent = new FigmaToCodeAgent(config);
        const files = await agent.convert();

        // Write files
        const outputDir = path.resolve(process.cwd(), outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const generatedFiles: Array<{ path: string; type: string }> = [];
        let componentsGenerated = 0;
        let assetsDownloaded = 0;
        let tokensExtracted = 0;

        for (const file of files) {
          const filePath = path.join(outputDir, path.basename(file.path));
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, file.content, 'utf-8');

          let fileType = 'component';
          if (file.path.includes('assets/')) {
            fileType = 'asset';
            assetsDownloaded++;
          } else if (file.path.includes('tokens')) {
            fileType = 'token';
            tokensExtracted++;
          } else if (file.path.match(/\.(css|scss|module\.css)$/)) {
            fileType = 'style';
          } else {
            componentsGenerated++;
          }

          generatedFiles.push({
            path: path.relative(process.cwd(), filePath),
            type: fileType,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  files: generatedFiles,
                  summary: {
                    componentsGenerated,
                    assetsDownloaded,
                    tokensExtracted,
                  },
                  message: `Successfully generated ${files.length} file(s) in ${outputPath}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'analyze_design': {
        const { figmaUrl } = args as any;

        if (!figmaUrl) {
          throw new Error('figmaUrl is required');
        }

        const figmaToken = process.env.FIGMA_TOKEN;
        if (!figmaToken) {
          throw new Error('FIGMA_TOKEN environment variable is required');
        }

        const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

        const agent = new FigmaToCodeAgent({
          figmaToken,
          fileKey,
          nodeIds: nodeId ? [nodeId] : undefined,
          framework: 'react',
          styleMode: 'css-modules',
          typescript: false,
          outputDir: './output',
        });

        // Run conversion to get AST stats
        let nodeCount = 0;
        let complexity = 'low';
        const issues: string[] = [];
        const suggestions: string[] = [];

        try {
          const files = await agent.convert();
          nodeCount = files.length;
          if (nodeCount > 10) complexity = 'high';
          else if (nodeCount > 5) complexity = 'medium';

          for (const file of files) {
            if (file.content.length > 10000) {
              issues.push(`${path.basename(file.path)} is large (${Math.round(file.content.length / 1000)}KB) — consider splitting`);
            }
          }
        } catch (err) {
          issues.push(`Analysis encountered an error: ${err instanceof Error ? err.message : String(err)}`);
        }

        suggestions.push(
          'Consider using semantic HTML elements for better accessibility',
          'Ensure all interactive elements have proper ARIA labels',
          'Optimize image assets for web performance',
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  analysis: { complexity, nodeCount, issues, suggestions },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'update_component': {
        const { figmaUrl, componentPath, updateMode = 'full' } = args as any;

        if (!figmaUrl || !componentPath) {
          throw new Error('figmaUrl and componentPath are required');
        }

        const figmaToken = process.env.FIGMA_TOKEN;
        if (!figmaToken) {
          throw new Error('FIGMA_TOKEN environment variable is required');
        }

        const resolvedPath = path.resolve(process.cwd(), componentPath);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Component file not found: ${componentPath}`);
        }

        const isReact = resolvedPath.match(/\.(jsx|tsx)$/);
        const isVue = resolvedPath.endsWith('.vue');
        if (!isReact && !isVue) {
          throw new Error('Component must be a .jsx, .tsx, or .vue file');
        }

        const framework = isVue ? 'vue' : 'react';
        const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

        const agent = new FigmaToCodeAgent({
          figmaToken,
          fileKey,
          nodeIds: nodeId ? [nodeId] : undefined,
          framework: framework as 'react' | 'vue',
          styleMode: 'css-modules',
          typescript: resolvedPath.endsWith('.tsx'),
          outputDir: path.dirname(resolvedPath),
        });

        const files = await agent.convert();

        const updatedFiles: string[] = [];
        for (const file of files) {
          const destPath = path.resolve(process.cwd(), file.path);
          const dir = path.dirname(destPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          if (updateMode === 'styles-only' && !file.path.match(/\.(css|scss|module\.css)$/)) {
            continue;
          }
          if (updateMode === 'structure-only' && file.path.match(/\.(css|scss|module\.css)$/)) {
            continue;
          }

          fs.writeFileSync(destPath, file.content, 'utf-8');
          updatedFiles.push(file.path);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  updatedFiles,
                  updateMode,
                  message: `Updated ${updatedFiles.length} file(s)`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Figma-to-Code MCP server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
