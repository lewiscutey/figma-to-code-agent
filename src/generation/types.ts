import type { ASTNode } from '../transformation/types'

/**
 * Generated file structure
 */
export interface GeneratedFile {
  path: string
  content: string
}

/**
 * Code generator configuration
 */
export interface GeneratorConfig {
  framework: 'react' | 'vue'
  styleMode: 'css-modules' | 'tailwind' | 'css'
  typescript: boolean
  outputDir: string
}

/**
 * Code generator interface
 */
export interface CodeGenerator {
  generate(node: ASTNode, config: GeneratorConfig): GeneratedFile[]
}
