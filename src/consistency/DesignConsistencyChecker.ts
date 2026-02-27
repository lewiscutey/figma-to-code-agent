/**
 * 设计一致性检查器
 * 检查设计令牌的一致性并提供修正建议
 */

import type { ASTNode } from '../transformation/types';

export interface DesignToken {
  type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
  value: string | number;
  usage: TokenUsage[];
}

export interface TokenUsage {
  nodeId: string;
  nodeName: string;
  property: string;
  location: string;
}

export interface InconsistencyReport {
  type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedNodes: string[];
  suggestions: string[];
  details: InconsistencyDetails;
}

export interface InconsistencyDetails {
  expected?: string | number;
  actual: Array<{ value: string | number; count: number }>;
  variance?: number;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  score: number; // 0-100
  inconsistencies: InconsistencyReport[];
  designTokens: Map<string, DesignToken>;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

/**
 * 设计一致性检查器
 */
export class DesignConsistencyChecker {
  private colorTolerance: number = 5; // RGB 差异容忍度
  private spacingTolerance: number = 2; // 像素差异容忍度
  private fontSizeTolerance: number = 1; // 字体大小差异容忍度

  constructor(options?: {
    colorTolerance?: number;
    spacingTolerance?: number;
    fontSizeTolerance?: number;
  }) {
    if (options) {
      this.colorTolerance = options.colorTolerance ?? this.colorTolerance;
      this.spacingTolerance = options.spacingTolerance ?? this.spacingTolerance;
      this.fontSizeTolerance = options.fontSizeTolerance ?? this.fontSizeTolerance;
    }
  }

  /**
   * 检查设计一致性
   */
  async checkConsistency(ast: ASTNode): Promise<ConsistencyCheckResult> {
    // 提取设计令牌
    const designTokens = this.extractDesignTokens(ast);

    // 检查各类一致性
    const inconsistencies: InconsistencyReport[] = [];

    inconsistencies.push(...this.checkColorConsistency(designTokens));
    inconsistencies.push(...this.checkTypographyConsistency(designTokens));
    inconsistencies.push(...this.checkSpacingConsistency(designTokens));
    inconsistencies.push(...this.checkShadowConsistency(designTokens));
    inconsistencies.push(...this.checkBorderConsistency(designTokens));

    // 计算一致性分数
    const totalChecks = designTokens.size;
    const failedChecks = inconsistencies.length;
    const passedChecks = totalChecks - failedChecks;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    return {
      isConsistent: inconsistencies.length === 0,
      score,
      inconsistencies,
      designTokens,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
      },
    };
  }

  /**
   * 提取设计令牌
   */
  private extractDesignTokens(ast: ASTNode): Map<string, DesignToken> {
    const tokens = new Map<string, DesignToken>();

    this.traverseAST(ast, (node) => {
      // 提取颜色令牌
      if (node.style?.backgroundColor) {
        this.addToken(tokens, 'color', 'background', node.style.backgroundColor, node);
      }
      if (node.style?.color) {
        this.addToken(tokens, 'color', 'text', node.style.color, node);
      }

      // 提取字体令牌
      if (node.style?.fontSize) {
        this.addToken(tokens, 'typography', 'fontSize', node.style.fontSize, node);
      }
      if (node.style?.fontFamily) {
        this.addToken(tokens, 'typography', 'fontFamily', node.style.fontFamily, node);
      }
      if (node.style?.fontWeight) {
        this.addToken(tokens, 'typography', 'fontWeight', node.style.fontWeight, node);
      }

      // 提取间距令牌
      if (node.style?.padding) {
        this.addToken(tokens, 'spacing', 'padding', node.style.padding, node);
      }
      if (node.style?.margin) {
        this.addToken(tokens, 'spacing', 'margin', node.style.margin, node);
      }
      if (node.style?.gap) {
        this.addToken(tokens, 'spacing', 'gap', node.style.gap, node);
      }

      // 提取阴影令牌
      if (node.style?.boxShadow) {
        this.addToken(tokens, 'shadow', 'boxShadow', node.style.boxShadow, node);
      }

      // 提取边框令牌
      if (node.style?.border) {
        this.addToken(tokens, 'border', 'border', node.style.border, node);
      }
      if (node.style?.borderRadius) {
        this.addToken(tokens, 'border', 'borderRadius', node.style.borderRadius, node);
      }
    });

    return tokens;
  }

  /**
   * 添加令牌
   */
  private addToken(
    tokens: Map<string, DesignToken>,
    type: DesignToken['type'],
    property: string,
    value: string | number,
    node: ASTNode
  ): void {
    const key = `${type}:${property}:${value}`;

    if (!tokens.has(key)) {
      tokens.set(key, {
        type,
        value,
        usage: [],
      });
    }

    tokens.get(key)!.usage.push({
      nodeId: node.id,
      nodeName: node.name,
      property,
      location: this.getNodePath(node),
    });
  }

  /**
   * 检查颜色一致性
   */
  private checkColorConsistency(tokens: Map<string, DesignToken>): InconsistencyReport[] {
    const inconsistencies: InconsistencyReport[] = [];
    const colorTokens = Array.from(tokens.values()).filter((t) => t.type === 'color');

    // 按属性分组
    const byProperty = this.groupByProperty(colorTokens);

    for (const [property, colors] of Object.entries(byProperty)) {
      // 检查是否有相似但不完全相同的颜色
      const similarGroups = this.findSimilarColors(colors);

      for (const group of similarGroups) {
        if (group.length > 1) {
          const affectedNodes = group.flatMap((t) => t.usage.map((u) => u.nodeName));
          const values = group.map((t) => ({ value: t.value, count: t.usage.length }));

          inconsistencies.push({
            type: 'color',
            severity: 'medium',
            description: `发现 ${group.length} 个相似但不完全相同的 ${property} 颜色`,
            affectedNodes,
            suggestions: [
              `统一使用最常用的颜色值：${this.getMostCommon(values)}`,
              `创建设计令牌来管理这些颜色`,
            ],
            details: {
              actual: values,
            },
          });
        }
      }
    }

    return inconsistencies;
  }

  /**
   * 检查字体一致性
   */
  private checkTypographyConsistency(
    tokens: Map<string, DesignToken>
  ): InconsistencyReport[] {
    const inconsistencies: InconsistencyReport[] = [];
    const typoTokens = Array.from(tokens.values()).filter((t) => t.type === 'typography');

    // 检查字体大小
    const fontSizes = typoTokens.filter((t) => t.usage[0].property === 'fontSize');
    const sizeGroups = this.findSimilarNumbers(
      fontSizes,
      this.fontSizeTolerance
    );

    for (const group of sizeGroups) {
      if (group.length > 1) {
        const affectedNodes = group.flatMap((t) => t.usage.map((u) => u.nodeName));
        const values = group.map((t) => ({ value: t.value, count: t.usage.length }));

        inconsistencies.push({
          type: 'typography',
          severity: 'low',
          description: `发现 ${group.length} 个相似的字体大小`,
          affectedNodes,
          suggestions: [
            `统一使用：${this.getMostCommon(values)}`,
            `建立字体大小体系（如 12px, 14px, 16px, 20px, 24px）`,
          ],
          details: {
            actual: values,
            variance: this.calculateVariance(group.map((t) => Number(t.value))),
          },
        });
      }
    }

    // 检查字体家族
    const fontFamilies = typoTokens.filter((t) => t.usage[0].property === 'fontFamily');
    if (fontFamilies.length > 3) {
      inconsistencies.push({
        type: 'typography',
        severity: 'high',
        description: `使用了 ${fontFamilies.length} 种不同的字体家族，建议减少到 2-3 种`,
        affectedNodes: fontFamilies.flatMap((t) => t.usage.map((u) => u.nodeName)),
        suggestions: [
          '选择一个主字体用于正文',
          '选择一个辅助字体用于标题',
          '移除不必要的字体',
        ],
        details: {
          actual: fontFamilies.map((t) => ({ value: t.value, count: t.usage.length })),
        },
      });
    }

    return inconsistencies;
  }

  /**
   * 检查间距一致性
   */
  private checkSpacingConsistency(tokens: Map<string, DesignToken>): InconsistencyReport[] {
    const inconsistencies: InconsistencyReport[] = [];
    const spacingTokens = Array.from(tokens.values()).filter((t) => t.type === 'spacing');

    // 检查是否遵循 8px 网格系统
    const nonGridAligned = spacingTokens.filter((t) => {
      const value = Number(t.value);
      return !isNaN(value) && value % 8 !== 0;
    });

    if (nonGridAligned.length > 0) {
      inconsistencies.push({
        type: 'spacing',
        severity: 'medium',
        description: `发现 ${nonGridAligned.length} 个不符合 8px 网格系统的间距值`,
        affectedNodes: nonGridAligned.flatMap((t) => t.usage.map((u) => u.nodeName)),
        suggestions: [
          '调整间距值为 8 的倍数（8px, 16px, 24px, 32px 等）',
          '使用设计令牌来确保一致性',
        ],
        details: {
          actual: nonGridAligned.map((t) => ({ value: t.value, count: t.usage.length })),
        },
      });
    }

    // 检查相似间距
    const similarGroups = this.findSimilarNumbers(spacingTokens, this.spacingTolerance);

    for (const group of similarGroups) {
      if (group.length > 1) {
        const affectedNodes = group.flatMap((t) => t.usage.map((u) => u.nodeName));
        const values = group.map((t) => ({ value: t.value, count: t.usage.length }));

        inconsistencies.push({
          type: 'spacing',
          severity: 'low',
          description: `发现 ${group.length} 个相似的间距值`,
          affectedNodes,
          suggestions: [
            `统一使用：${this.getMostCommon(values)}`,
            '建立间距体系（如 4px, 8px, 12px, 16px, 24px, 32px）',
          ],
          details: {
            actual: values,
            variance: this.calculateVariance(group.map((t) => Number(t.value))),
          },
        });
      }
    }

    return inconsistencies;
  }

  /**
   * 检查阴影一致性
   */
  private checkShadowConsistency(tokens: Map<string, DesignToken>): InconsistencyReport[] {
    const inconsistencies: InconsistencyReport[] = [];
    const shadowTokens = Array.from(tokens.values()).filter((t) => t.type === 'shadow');

    if (shadowTokens.length > 5) {
      inconsistencies.push({
        type: 'shadow',
        severity: 'medium',
        description: `使用了 ${shadowTokens.length} 种不同的阴影，建议减少到 3-5 种`,
        affectedNodes: shadowTokens.flatMap((t) => t.usage.map((u) => u.nodeName)),
        suggestions: [
          '定义阴影层级（如 small, medium, large）',
          '移除不必要的阴影变体',
          '使用设计令牌管理阴影',
        ],
        details: {
          actual: shadowTokens.map((t) => ({ value: t.value, count: t.usage.length })),
        },
      });
    }

    return inconsistencies;
  }

  /**
   * 检查边框一致性
   */
  private checkBorderConsistency(tokens: Map<string, DesignToken>): InconsistencyReport[] {
    const inconsistencies: InconsistencyReport[] = [];
    const borderTokens = Array.from(tokens.values()).filter((t) => t.type === 'border');

    // 检查圆角
    const borderRadii = borderTokens.filter((t) => t.usage[0].property === 'borderRadius');
    if (borderRadii.length > 4) {
      inconsistencies.push({
        type: 'border',
        severity: 'low',
        description: `使用了 ${borderRadii.length} 种不同的圆角值，建议减少到 3-4 种`,
        affectedNodes: borderRadii.flatMap((t) => t.usage.map((u) => u.nodeName)),
        suggestions: [
          '定义圆角体系（如 4px, 8px, 16px）',
          '使用设计令牌管理圆角',
        ],
        details: {
          actual: borderRadii.map((t) => ({ value: t.value, count: t.usage.length })),
        },
      });
    }

    return inconsistencies;
  }

  /**
   * 查找相似颜色
   */
  private findSimilarColors(colors: DesignToken[]): DesignToken[][] {
    const groups: DesignToken[][] = [];
    const processed = new Set<DesignToken>();

    for (const color of colors) {
      if (processed.has(color)) continue;

      const group = [color];
      processed.add(color);

      for (const other of colors) {
        if (processed.has(other)) continue;

        if (this.areColorsSimilar(String(color.value), String(other.value))) {
          group.push(other);
          processed.add(other);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * 判断颜色是否相似
   */
  private areColorsSimilar(color1: string, color2: string): boolean {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    if (!rgb1 || !rgb2) return false;

    const diff =
      Math.abs(rgb1.r - rgb2.r) +
      Math.abs(rgb1.g - rgb2.g) +
      Math.abs(rgb1.b - rgb2.b);

    return diff <= this.colorTolerance * 3;
  }

  /**
   * 解析颜色
   */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // 支持 hex 和 rgb 格式
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }

    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }

    return null;
  }

  /**
   * 查找相似数字
   */
  private findSimilarNumbers(tokens: DesignToken[], tolerance: number): DesignToken[][] {
    const groups: DesignToken[][] = [];
    const processed = new Set<DesignToken>();

    for (const token of tokens) {
      if (processed.has(token)) continue;

      const value = Number(token.value);
      if (isNaN(value)) continue;

      const group = [token];
      processed.add(token);

      for (const other of tokens) {
        if (processed.has(other)) continue;

        const otherValue = Number(other.value);
        if (isNaN(otherValue)) continue;

        if (Math.abs(value - otherValue) <= tolerance) {
          group.push(other);
          processed.add(other);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * 按属性分组
   */
  private groupByProperty(tokens: DesignToken[]): Record<string, DesignToken[]> {
    const groups: Record<string, DesignToken[]> = {};

    for (const token of tokens) {
      const property = token.usage[0].property;
      if (!groups[property]) {
        groups[property] = [];
      }
      groups[property].push(token);
    }

    return groups;
  }

  /**
   * 获取最常用的值
   */
  private getMostCommon(values: Array<{ value: string | number; count: number }>): string | number {
    return values.reduce((a, b) => (a.count > b.count ? a : b)).value;
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.round(variance * 100) / 100;
  }

  /**
   * 遍历 AST
   */
  private traverseAST(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);

    if (node.children) {
      for (const child of node.children) {
        this.traverseAST(child, callback);
      }
    }
  }

  /**
   * 获取节点路径
   */
  private getNodePath(node: ASTNode): string {
    const path: string[] = [];
    let current: ASTNode | undefined = node;

    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }

    return path.join(' > ');
  }
}
