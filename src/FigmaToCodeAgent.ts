import { FigmaAPIClient } from './extraction/FigmaAPIClient'
import { ASTParser } from './transformation/ASTParser'
import { TransformationPipeline } from './transformation/TransformationPipeline'
import { FigmaStructureOptimizer } from './transformation/transformers/FigmaStructureOptimizer'
import { ComponentExtractor } from './transformation/transformers/ComponentExtractor'
import { LayoutOptimizer } from './transformation/transformers/LayoutOptimizer'
import { SemanticNamer } from './transformation/transformers/SemanticNamer'
import { AILayoutAnalyzer } from './transformation/transformers/AILayoutAnalyzer'
import { ReactGenerator } from './generation/ReactGenerator'
import { VueGenerator } from './generation/VueGenerator'
import type { GeneratorConfig, GeneratedFile } from './generation/types'
import { LLMFactory, type LLMProvider } from './llm'
import { AISemanticNamer } from './transformation/transformers/AISemanticNamer'
import { AIComponentSplitter } from './transformation/transformers/AIComponentSplitter'
import { AICodeOptimizer } from './generation/AICodeOptimizer'

export interface AgentConfig {
  figmaToken: string
  fileKey: string
  nodeIds?: string[]
  framework: 'react' | 'vue'
  styleMode: 'css-modules' | 'tailwind' | 'css'
  typescript: boolean
  outputDir: string
  llm?: {
    provider: 'bedrock' | 'openai' | 'anthropic'
    model: string
    region?: string
    apiKey?: string
    enableAINaming?: boolean
    enableAISplitting?: boolean
    enableAIOptimization?: boolean
    enableAILayout?: boolean  // New: AI layout analysis
  }
}

export class FigmaToCodeAgent {
  private figmaClient: FigmaAPIClient
  private parser: ASTParser
  private pipeline: TransformationPipeline
  private llm?: LLMProvider
  private aiOptimizer?: AICodeOptimizer

  constructor(private config: AgentConfig) {
    this.figmaClient = new FigmaAPIClient(config.figmaToken)
    this.parser = new ASTParser()
    this.pipeline = new TransformationPipeline()

    // Initialize LLM if configured
    if (config.llm) {
      this.llm = LLMFactory.create(config.llm)
      if (config.llm.enableAIOptimization) {
        this.aiOptimizer = new AICodeOptimizer(this.llm)
      }
    }

    // Register transformers (order matters!)
    // NOTE: Use FigmaStructureOptimizer instead of aggressive SimplifyTransformer/FlattenTransformer
    // to preserve Figma layer structure for better readability
    this.pipeline
      .register(new FigmaStructureOptimizer())  // 1. Light optimization, preserve structure

    // AI layout analysis (before component extraction)
    if (config.llm?.enableAILayout && this.llm) {
      this.pipeline.register(new AILayoutAnalyzer(this.llm))  // 2. AI semantic analysis
    }

    this.pipeline
      .register(new ComponentExtractor())       // 3. Extract components
      .register(new LayoutOptimizer())          // 4. Optimize layout

    // Use AI or rule-based naming
    if (config.llm?.enableAINaming && this.llm) {
      this.pipeline.register(new AISemanticNamer(this.llm))  // 5. AI naming
    } else {
      this.pipeline.register(new SemanticNamer())  // 5. Rule-based naming
    }

    // Add AI component splitting if enabled
    if (config.llm?.enableAISplitting && this.llm) {
      this.pipeline.register(new AIComponentSplitter(this.llm))  // 6. AI splitting
    }
  }

  async convert(): Promise<GeneratedFile[]> {
      // Step 1: Extract design from Figma
      const figmaFile = await this.figmaClient.getFile(this.config.fileKey)

      // Step 2: Find target node(s) or use entire document
      let targetNode = figmaFile.document
      if (this.config.nodeIds && this.config.nodeIds.length > 0) {
        const nodeId = this.config.nodeIds[0].replace('-', ':')
        const found = this.findNodeById(figmaFile.document, nodeId)
        if (found) {
          targetNode = found
          console.log(`✓ Found target node: ${found.name} (${found.type})`)
        } else {
          console.log(`⚠ Node ${nodeId} not found, using entire document`)
        }
      }

      // Step 3: Parse to AST
      const ast = this.parser.parse(targetNode)

      // Step 4: Download images for Image nodes
      await this.downloadImages(ast)

      // Step 5: Transform AST
      const transformedAst = await this.pipeline.execute(ast)

      // Step 6: Generate code
      const generator = this.config.framework === 'react' ? new ReactGenerator() : new VueGenerator()

      const generatorConfig: GeneratorConfig = {
        framework: this.config.framework,
        styleMode: this.config.styleMode,
        typescript: this.config.typescript,
        outputDir: this.config.outputDir,
      }

      let files = generator.generate(transformedAst, generatorConfig)

      // Step 7: AI optimization (optional)
      if (this.aiOptimizer) {
        files = await this.aiOptimizer.optimize(files)
      }

      return files
    }

    /**
     * Download images for all Image nodes in the AST
     */
    private async downloadImages(ast: import('./transformation/types').ASTNode): Promise<void> {
          const imageNodes: import('./transformation/types').ASTNode[] = []
          this.collectImageNodes(ast, imageNodes)
          this.collectIconNodes(ast, imageNodes)

          if (imageNodes.length === 0) return

          console.log(`Found ${imageNodes.length} image(s) to download...`)

          const fs = await import('fs')
          const path = await import('path')
          const assetsDir = path.join(this.config.outputDir, 'assets')

          // Try to use locally cached files first before hitting API
          const nodesNeedingDownload: import('./transformation/types').ASTNode[] = []
          for (const node of imageNodes) {
            const fileName = this.sanitizeFileName(node.name) + '.png'
            const filePath = path.join(assetsDir, fileName)
            if (fs.existsSync(filePath)) {
              console.log(`✓ Using cached image: ${fileName}`)
              node.metadata.imageRef = `./assets/${fileName}`
              if (node.type !== 'Image') {
                (node as any).type = 'Image'
                node.children = []
              }
            } else {
              nodesNeedingDownload.push(node)
            }
          }

          if (nodesNeedingDownload.length === 0) return

          const nodeIds = nodesNeedingDownload.map(n => n.metadata.figmaId)

          try {
            const imageMap = await this.figmaClient.getImages(this.config.fileKey, nodeIds, 'png')

            if (imageMap.images) {
              if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true })
              }

              for (const node of nodesNeedingDownload) {
                const imageUrl = imageMap.images[node.metadata.figmaId]
                if (imageUrl) {
                  const fileName = this.sanitizeFileName(node.name) + '.png'
                  const filePath = path.join(assetsDir, fileName)
                  try {
                    await this.figmaClient.downloadImage(imageUrl, filePath)
                    node.metadata.imageRef = `./assets/${fileName}`
                    if (node.type !== 'Image') {
                      (node as any).type = 'Image'
                      node.children = []
                    }
                  } catch (err) {
                    console.log(`⚠ Failed to download image: ${node.name}`)
                  }
                }
              }
            }
          } catch (err) {
            console.log(`⚠ Failed to fetch image URLs, using placeholders`)
          }
        }

    private collectImageNodes(node: import('./transformation/types').ASTNode, result: import('./transformation/types').ASTNode[]): void {
          if (node.type === 'Image') {
            result.push(node)
          }
          node.children.forEach(child => this.collectImageNodes(child, result))
        }

        /**
         * Find containers whose children are all Shape/Vector nodes (icons).
         * These should be exported as images since CSS can't render SVG paths.
         */
        /**
             * Find containers whose children are all Shape/Vector nodes (icons).
             * These should be exported as images since CSS can't render SVG paths.
             * Only matches small containers (< 200px) to avoid exporting large sections.
             */
            /**
                 * Find containers whose descendants are all Shape/Vector nodes.
                 * These should be exported as images since CSS can't render SVG paths.
                 * Skips containers that also have Text or Image children (mixed content).
                 */
                private collectIconNodes(node: import('./transformation/types').ASTNode, result: import('./transformation/types').ASTNode[]): void {
                  if (node.type === 'Container' && node.children.length > 0) {
                    const hasShape = this.hasShapeDescendant(node)
                    const hasTextOrImage = this.hasTextOrImageDescendant(node)
                    if (hasShape && !hasTextOrImage) {
                      result.push(node)
                      return // Don't recurse — export this whole container
                    }
                  }
                  node.children.forEach(child => this.collectIconNodes(child, result))
                }

                private hasShapeDescendant(node: import('./transformation/types').ASTNode): boolean {
                  if (node.type === 'Shape') return true
                  return node.children.some(c => this.hasShapeDescendant(c))
                }

                private hasTextOrImageDescendant(node: import('./transformation/types').ASTNode): boolean {
                  if (node.type === 'Text' || node.type === 'Image') return true
                  return node.children.some(c => this.hasTextOrImageDescendant(c))
                }

    private sanitizeFileName(name: string): string {
          return name
            .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (Chinese, etc.)
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, 50) || 'icon'
        }

    private findNodeById(node: any, id: string): any {
      if (node.id === id) return node
      if (node.children) {
        for (const child of node.children) {
          const found = this.findNodeById(child, id)
          if (found) return found
        }
      }
      return null
    }
}
