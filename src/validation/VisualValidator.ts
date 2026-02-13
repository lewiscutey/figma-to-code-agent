/**
 * Visual Validation Layer
 * Renders generated code and compares with original Figma design.
 * Uses Puppeteer for headless browser rendering.
 */

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export interface ValidationConfig {
  viewports: Viewport[];
  threshold: number; // 0-1, similarity threshold
  generateDiffMap: boolean;
}

export interface Difference {
  area: { x: number; y: number; width: number; height: number };
  type: 'color' | 'position' | 'size' | 'missing' | 'extra';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ValidationResult {
  passed: boolean;
  similarity: number; // 0-100
  differences: Difference[];
  diffMap?: Buffer;
  suggestions: string[];
  viewport: Viewport;
}

export interface ComparisonResult {
  similarity: number;
  differences: Difference[];
  diffMap?: Buffer;
}

/**
 * VisualValidator renders generated code in a headless browser,
 * captures screenshots, and compares them with original design exports.
 */
export class VisualValidator {
  private defaultConfig: ValidationConfig = {
    viewports: [{ name: 'desktop', width: 1440, height: 900 }],
    threshold: 0.95,
    generateDiffMap: false,
  };

  /**
   * Validate generated HTML/CSS code against a reference image.
   */
  async validate(
    htmlContent: string,
    referenceImage: Buffer,
    config?: Partial<ValidationConfig>,
  ): Promise<ValidationResult[]> {
    const cfg = { ...this.defaultConfig, ...config };
    const results: ValidationResult[] = [];

    for (const viewport of cfg.viewports) {
      const screenshot = await this.renderCode(htmlContent, viewport);
      const comparison = this.compareImages(screenshot, referenceImage);

      results.push({
        passed: comparison.similarity / 100 >= cfg.threshold,
        similarity: comparison.similarity,
        differences: comparison.differences,
        diffMap: cfg.generateDiffMap ? comparison.diffMap : undefined,
        suggestions: this.generateSuggestions(comparison.differences),
        viewport,
      });
    }

    return results;
  }

  /**
   * Render HTML content in a headless browser and capture screenshot.
   * Requires Puppeteer to be installed.
   */
  async renderCode(htmlContent: string, viewport: Viewport): Promise<Buffer> {
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({ headless: true });
      const page = await browser.newPage();
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const screenshot = await page.screenshot({ type: 'png', fullPage: false });
      await browser.close();
      return Buffer.from(screenshot);
    } catch {
      // If Puppeteer is not available, return empty buffer
      console.warn('Puppeteer not available for rendering. Returning empty screenshot.');
      return Buffer.alloc(0);
    }
  }

  /**
   * Compare two images pixel by pixel.
   * Returns similarity score (0-100) and list of differences.
   */
  compareImages(image1: Buffer, image2: Buffer): ComparisonResult {
    // Handle empty buffers
    if (image1.length === 0 || image2.length === 0) {
      return {
        similarity: 0,
        differences: [{
          area: { x: 0, y: 0, width: 0, height: 0 },
          type: 'missing',
          severity: 'high',
          description: 'One or both images are empty',
        }],
      };
    }

    // Simple byte-level comparison (for production, use pixelmatch or similar)
    const minLen = Math.min(image1.length, image2.length);
    const maxLen = Math.max(image1.length, image2.length);
    let matchingBytes = 0;

    for (let i = 0; i < minLen; i++) {
      if (image1[i] === image2[i]) matchingBytes++;
    }

    const similarity = maxLen > 0 ? Math.round((matchingBytes / maxLen) * 100) : 0;
    const differences: Difference[] = [];

    if (similarity < 100) {
      // Size difference
      if (image1.length !== image2.length) {
        differences.push({
          area: { x: 0, y: 0, width: 0, height: 0 },
          type: 'size',
          severity: similarity < 50 ? 'high' : similarity < 80 ? 'medium' : 'low',
          description: `Image sizes differ: ${image1.length} vs ${image2.length} bytes`,
        });
      }

      // Content difference
      if (matchingBytes < minLen) {
        differences.push({
          area: { x: 0, y: 0, width: 0, height: 0 },
          type: 'color',
          severity: similarity < 50 ? 'high' : similarity < 80 ? 'medium' : 'low',
          description: `${minLen - matchingBytes} bytes differ in content`,
        });
      }
    }

    return { similarity, differences };
  }

  /**
   * Generate fix suggestions based on detected differences.
   */
  generateSuggestions(differences: Difference[]): string[] {
    const suggestions: string[] = [];

    for (const diff of differences) {
      switch (diff.type) {
        case 'color':
          suggestions.push('Check background colors and text colors match the design');
          break;
        case 'position':
          suggestions.push('Verify element positioning and margins/padding');
          break;
        case 'size':
          suggestions.push('Check element dimensions (width/height) match the design');
          break;
        case 'missing':
          suggestions.push('Some elements may be missing from the generated code');
          break;
        case 'extra':
          suggestions.push('Generated code contains elements not in the original design');
          break;
      }
    }

    // Deduplicate
    return [...new Set(suggestions)];
  }

  /**
   * Generate a validation report as a formatted string.
   */
  generateReport(results: ValidationResult[]): string {
    const lines: string[] = ['# Visual Validation Report', ''];

    for (const result of results) {
      lines.push(`## Viewport: ${result.viewport.name} (${result.viewport.width}x${result.viewport.height})`);
      lines.push(`- Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      lines.push(`- Similarity: ${result.similarity}%`);

      if (result.differences.length > 0) {
        lines.push('- Differences:');
        for (const diff of result.differences) {
          lines.push(`  - [${diff.severity.toUpperCase()}] ${diff.type}: ${diff.description}`);
        }
      }

      if (result.suggestions.length > 0) {
        lines.push('- Suggestions:');
        for (const suggestion of result.suggestions) {
          lines.push(`  - ${suggestion}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
