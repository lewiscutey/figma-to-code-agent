#!/usr/bin/env node

import { FigmaToCodeAgent } from './FigmaToCodeAgent';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Figma-to-Code AI Agent

Usage:
  figma-to-code-agent --token <token> --file <fileKey> [options]

Options:
  --token <token>       Figma API token (required)
  --file <fileKey>      Figma file key (required)
  --node <nodeId>       Specific node ID to convert
  --framework <name>    Framework: react or vue (default: react)
  --style <mode>        Style mode: css-modules, tailwind, or css (default: css-modules)
  --typescript          Enable TypeScript output (default: false)
  --output <dir>        Output directory (default: ./output)
  --preview             Preview in browser after generation

  AI Options:
  --llm-provider <name> LLM provider: bedrock, openai, anthropic
  --llm-model <model>   Model name
  --llm-region <region> AWS region for Bedrock (default: us-east-1)
  --llm-api-key <key>   API key for OpenAI/Anthropic
  --ai-naming           Enable AI-powered component naming
  --ai-splitting        Enable AI-powered component splitting
  --ai-optimization     Enable AI-powered code optimization
  --ai-layout           Enable AI-powered layout analysis

  --help                Show this help message

Example:
  figma-to-code-agent --token abc123 --file xyz789 --framework react --output ./src/components
  figma-to-code-agent --token abc123 --file xyz789 --framework react --preview
    `);
    process.exit(0);
  }

  const preview = args.includes('--preview');

  const config = {
    figmaToken: getArg('--token', args) || process.env.FIGMA_TOKEN || '',
    fileKey: getArg('--file', args) || '',
    nodeIds: getArgs('--node', args),
    framework: (getArg('--framework', args) || 'react') as 'react' | 'vue',
    styleMode: (getArg('--style', args) || 'css-modules') as 'css-modules' | 'tailwind' | 'css',
    typescript: args.includes('--typescript'),
    outputDir: getArg('--output', args) || './output',
    llm: getArg('--llm-provider', args)
      ? {
          provider: getArg('--llm-provider', args) as 'bedrock' | 'openai' | 'anthropic',
          model: getArg('--llm-model', args) || '',
          region: getArg('--llm-region', args),
          apiKey: getArg('--llm-api-key', args) || process.env.LLM_API_KEY,
          enableAINaming: args.includes('--ai-naming'),
          enableAISplitting: args.includes('--ai-splitting'),
          enableAIOptimization: args.includes('--ai-optimization'),
          enableAILayout: args.includes('--ai-layout'),
        }
      : undefined,
  };

  if (!config.figmaToken) {
    console.error(
      'Error: Figma token is required. Use --token or set FIGMA_TOKEN environment variable.'
    );
    process.exit(1);
  }

  if (!config.fileKey) {
    console.error('Error: Figma file key is required. Use --file option.');
    process.exit(1);
  }

  console.log('Starting Figma-to-Code conversion...');
  console.log(`Framework: ${config.framework}`);
  console.log(`Style mode: ${config.styleMode}`);
  console.log(`TypeScript: ${config.typescript}`);
  console.log(`Output: ${config.outputDir}`);
  console.log('');

  try {
    console.log('Step 1/4: Extracting design from Figma...');
    const agent = new FigmaToCodeAgent(config);
    const files = await agent.convert();

    console.log('\nStep 4/4: Writing files...');

    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Write generated files to output directory
    for (const file of files) {
      const filePath = path.join(process.cwd(), file.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.content, 'utf-8');
      console.log(`✓ Generated: ${file.path}`);
    }

    console.log(`\n✓ Successfully generated ${files.length} file(s)`);

    // Preview mode: copy to test-app and launch Vite
    if (preview) {
      await startPreview(config.framework, config.outputDir, files);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

interface GeneratedFile {
  path: string;
  content: string;
}

async function startPreview(framework: 'react' | 'vue', outputDir: string, files: GeneratedFile[]) {
  const cliDir = path.dirname(path.dirname(path.resolve(__filename)));
  const testAppDir =
    framework === 'react'
      ? path.join(cliDir, 'test-app', 'test-react')
      : path.join(cliDir, 'test-app', 'test-vue');
  const srcDir = path.join(testAppDir, 'src');

  if (!fs.existsSync(testAppDir)) {
    console.error('Error: test-app directory not found at', testAppDir);
    process.exit(1);
  }

  console.log('\n🔍 Starting preview...');

  // Copy generated files and assets to test-app/src
  const outputAbsolute = path.resolve(outputDir);
  const copiedFiles: string[] = [];

  for (const file of files) {
    const srcPath = path.join(process.cwd(), file.path);
    const fileName = path.basename(file.path);
    const destPath = path.join(srcDir, fileName);
    fs.copyFileSync(srcPath, destPath);
    copiedFiles.push(destPath);
  }

  // Copy assets directory if it exists in output
  const outputAssetsDir = path.join(outputAbsolute, 'assets');
  const destAssetsDir = path.join(srcDir, 'assets');
  if (fs.existsSync(outputAssetsDir)) {
    if (!fs.existsSync(destAssetsDir)) {
      fs.mkdirSync(destAssetsDir, { recursive: true });
    }
    for (const assetFile of fs.readdirSync(outputAssetsDir)) {
      const assetSrc = path.join(outputAssetsDir, assetFile);
      const assetDest = path.join(destAssetsDir, assetFile);
      if (fs.statSync(assetSrc).isFile()) {
        fs.copyFileSync(assetSrc, assetDest);
        copiedFiles.push(assetDest);
      }
    }
  }

  // Find the main component file name
  const componentFile = files.find((f) =>
    framework === 'react'
      ? f.path.endsWith('.jsx') || f.path.endsWith('.tsx')
      : f.path.endsWith('.vue')
  );

  if (!componentFile) {
    console.error('Error: No component file found in generated output');
    return;
  }

  const componentFileName = path.basename(componentFile.path);
  const componentName = componentFileName.replace(/\.(jsx|tsx|vue)$/, '');

  // Update entry file to import the generated component
  if (framework === 'react') {
    const ext = componentFileName.endsWith('.tsx') ? '.tsx' : '.jsx';
    const entryContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import { ${componentName} } from './${componentName}${ext}'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <${componentName} />
  </React.StrictMode>
)
`;
    fs.writeFileSync(path.join(srcDir, 'main.jsx'), entryContent, 'utf-8');
  } else {
    const entryContent = `import { createApp } from 'vue'
import ${componentName} from './${componentName}.vue'

createApp(${componentName}).mount('#app')
`;
    fs.writeFileSync(path.join(srcDir, 'main.js'), entryContent, 'utf-8');
  }

  console.log(`✓ Copied files to ${testAppDir}`);

  // Install dependencies if node_modules doesn't exist
  const nodeModulesDir = path.join(testAppDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('📦 Installing dependencies...');
    const installResult = spawn('npm', ['install'], { cwd: testAppDir, stdio: 'inherit', shell: true });
    await new Promise<void>((resolve, reject) => {
      installResult.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
    });
  }

  console.log(`✓ Starting Vite dev server...\n`);

  // Launch Vite with --open
  const viteProcess = spawn('npx', ['vite', '--open'], {
    cwd: testAppDir,
    stdio: 'inherit',
    shell: true,
  });

  // Cleanup on exit: remove copied files
  const cleanup = () => {
    console.log('\n🧹 Cleaning up preview files...');
    for (const f of copiedFiles) {
      try {
        fs.unlinkSync(f);
      } catch { /* ignore cleanup errors */ }
    }
    viteProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  viteProcess.on('close', (code) => {
    // Clean up when Vite exits
    for (const f of copiedFiles) {
      try {
        fs.unlinkSync(f);
      } catch { /* ignore cleanup errors */ }
    }
    process.exit(code ?? 0);
  });
}

function getArg(flag: string, args: string[]): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

function getArgs(flag: string, args: string[]): string[] | undefined {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      values.push(args[i + 1]);
    }
  }
  return values.length > 0 ? values : undefined;
}

main();
