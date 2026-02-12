# Quick Start

## 1. Install & Build

```bash
git clone https://github.com/lewiscutey/figma-to-code-agent.git
cd figma-to-code-agent
npm install
npm run build
```

## 2. Get Your Figma Token

1. Go to [Figma API Settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Get personal access token"
3. Copy the token

## 3. Get File Key & Node ID

From your Figma URL:

```
https://www.figma.com/design/ABC123DEF456/My-Design?node-id=100-200
                              ^^^^^^^^^^^^^^                 ^^^^^^^
                              File Key                       Node ID
```

Node ID format: `100-200` (use hyphen, not colon)

## 4. Generate Code

```bash
# React component
node dist/cli.js \
  --token YOUR_FIGMA_TOKEN \
  --file ABC123DEF456 \
  --node 100-200 \
  --framework react \
  --output ./output

# Vue component
node dist/cli.js \
  --token YOUR_FIGMA_TOKEN \
  --file ABC123DEF456 \
  --node 100-200 \
  --framework vue \
  --output ./output
```

Or use environment variable:

```bash
export FIGMA_TOKEN="your-token"
node dist/cli.js --file ABC123DEF456 --node 100-200 --output ./output
```

## 5. Preview in Browser

Add `--preview` to instantly open the result in your browser:

```bash
node dist/cli.js \
  --token YOUR_FIGMA_TOKEN \
  --file ABC123DEF456 \
  --node 100-200 \
  --framework react \
  --output ./output \
  --preview
```

This copies the generated files to the built-in test app, starts a Vite dev server, and opens your browser. Press `Ctrl+C` to stop — temporary files are cleaned up automatically.

## 6. TypeScript Output (Optional)

By default, generates `.jsx` / `.vue`. Add `--typescript` for `.tsx` output:

```bash
node dist/cli.js \
  --token YOUR_FIGMA_TOKEN \
  --file ABC123DEF456 \
  --node 100-200 \
  --framework react \
  --typescript \
  --output ./output
```

## Generated Output

For a React component, you'll get:

```
output/
├── Component.jsx          # React component
├── Component.module.css   # CSS Module styles
└── assets/                # Downloaded images
    ├── hero-image.png
    └── icon-close.png
```

For Vue, a single `.vue` file with `<template>`, `<script setup>`, and `<style scoped>`.

## What Gets Generated

- Pixel-accurate layout using absolute positioning
- Responsive scaling — auto-fits viewport width, no horizontal scrollbar
- Full typography (font family, size, weight, line-height, letter-spacing, color)
- Images exported at 2x resolution for retina displays
- Vector icons auto-detected and exported as PNG
- Hidden layers and mask shapes filtered out
- CSS Modules with scoped class names

## CLI Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--token <token>` | Figma API token (or `FIGMA_TOKEN` env) | — |
| `--file <key>` | Figma file key | — |
| `--node <id>` | Target node ID | root |
| `--framework` | `react` or `vue` | `react` |
| `--style` | `css-modules`, `tailwind`, or `css` | `css-modules` |
| `--typescript` | Enable TypeScript output | `false` |
| `--output <dir>` | Output directory | `./output` |
| `--preview` | Preview in browser after generation | — |

## AI Enhancements (Optional)

For smarter component naming and code optimization, add an LLM provider:

```bash
# AWS Bedrock
node dist/cli.js \
  --token YOUR_FIGMA_TOKEN \
  --file ABC123DEF456 \
  --framework react \
  --llm-provider bedrock \
  --llm-model anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --ai-naming \
  --output ./output

# OpenAI
LLM_API_KEY="sk-..." node dist/cli.js \
  --token YOUR_FIGMA_TOKEN \
  --file ABC123DEF456 \
  --framework react \
  --llm-provider openai \
  --llm-model gpt-4o \
  --ai-naming \
  --output ./output
```

| AI Option | What It Does |
|-----------|-------------|
| `--ai-naming` | Renames `Frame123` → `UserProfileCard` |
| `--ai-splitting` | Splits large designs into sub-components |
| `--ai-optimization` | Improves code quality and accessibility |

## Troubleshooting

**"Figma token is required"**
Set `--token` or `export FIGMA_TOKEN="your-token"`

**"Rate limited" / 429 errors**
The tool auto-retries with backoff. If persistent, wait a minute and try again. Downloaded images are cached locally to avoid repeated API calls.

**Images not showing**
Check that the `assets/` folder was generated alongside your component. Image paths are relative imports.

**Preview not working**
Make sure `test-app/test-react/node_modules` (or `test-vue`) exists. Run `npm install` inside the test-app directory first:
```bash
cd test-app/test-react && npm install
```

## Try the Pre-built Examples

The `test-app/` directory contains pre-generated components from the 4 examples shown in the README. You can preview them directly without a Figma token:

```bash
# React examples
cd test-app/test-react
npm install
npx vite --open

# Vue examples
cd test-app/test-vue
npm install
npx vite --open
```

Edit `src/main.jsx` (or `src/main.js` for Vue) to switch between components:

```jsx
// Try different pages:
import { Component } from './Component.jsx'     // MIUI12
import { Homepage } from './Homepage.jsx'        // World Peas Homepage
import { ShoppingCart } from './ShoppingCart.jsx' // Shopping Cart
import { ProductPage } from './ProductPage.jsx'  // Product Page
```
