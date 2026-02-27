/**
 * 交互原型生成器
 * 扩展代码生成器以支持状态管理和事件处理
 */

import type { ASTNode } from '../transformation/types';

export interface InteractionPattern {
  type: 'click' | 'hover' | 'input' | 'toggle' | 'navigation' | 'form';
  trigger: string;
  action: string;
  stateChanges: StateChange[];
}

export interface StateChange {
  stateName: string;
  stateType: 'boolean' | 'string' | 'number' | 'object' | 'array';
  initialValue: any;
  description: string;
}

export interface EventHandler {
  eventType: string;
  handlerName: string;
  parameters: string[];
  body: string;
  stateUpdates: string[];
}

export interface PrototypeConfig {
  framework: 'react' | 'vue';
  stateManagement?: 'useState' | 'useReducer' | 'vuex' | 'pinia';
  includeAnimations?: boolean;
  includeValidation?: boolean;
}

export interface GeneratedPrototype {
  componentCode: string;
  stateDefinitions: string[];
  eventHandlers: EventHandler[];
  interactions: InteractionPattern[];
  dependencies: string[];
}

/**
 * 交互原型生成器
 */
export class InteractivePrototypeGenerator {
  /**
   * 生成交互原型
   */
  async generatePrototype(
    ast: ASTNode,
    config: PrototypeConfig
  ): Promise<GeneratedPrototype> {
    // 推断交互模式
    const interactions = this.inferInteractions(ast);

    // 生成状态定义
    const stateDefinitions = this.generateStateDefinitions(interactions, config);

    // 生成事件处理器
    const eventHandlers = this.generateEventHandlers(interactions, config);

    // 生成组件代码
    const componentCode = this.generateComponentCode(ast, stateDefinitions, eventHandlers, config);

    // 收集依赖
    const dependencies = this.collectDependencies(interactions, config);

    return {
      componentCode,
      stateDefinitions,
      eventHandlers,
      interactions,
      dependencies,
    };
  }

  /**
   * 推断交互模式
   */
  private inferInteractions(ast: ASTNode): InteractionPattern[] {
    const interactions: InteractionPattern[] = [];

    this.traverseAST(ast, (node) => {
      // 推断按钮点击
      if (this.isButton(node)) {
        interactions.push(this.inferButtonInteraction(node));
      }

      // 推断输入框
      if (this.isInput(node)) {
        interactions.push(this.inferInputInteraction(node));
      }

      // 推断切换开关
      if (this.isToggle(node)) {
        interactions.push(this.inferToggleInteraction(node));
      }

      // 推断导航
      if (this.isNavigation(node)) {
        interactions.push(this.inferNavigationInteraction(node));
      }

      // 推断表单
      if (this.isForm(node)) {
        interactions.push(this.inferFormInteraction(node));
      }

      // 推断悬停效果
      if (this.hasHoverState(node)) {
        interactions.push(this.inferHoverInteraction(node));
      }
    });

    return interactions;
  }

  /**
   * 推断按钮交互
   */
  private inferButtonInteraction(node: ASTNode): InteractionPattern {
    const buttonName = this.sanitizeName(node.name);
    const action = this.inferButtonAction(node);

    return {
      type: 'click',
      trigger: `on${this.capitalize(buttonName)}Click`,
      action,
      stateChanges: this.inferStateChangesForButton(node, action),
    };
  }

  /**
   * 推断按钮动作
   */
  private inferButtonAction(node: ASTNode): string {
    const name = node.name.toLowerCase();

    if (name.includes('submit') || name.includes('send') || name.includes('save')) {
      return 'submit';
    }
    if (name.includes('cancel') || name.includes('close')) {
      return 'cancel';
    }
    if (name.includes('delete') || name.includes('remove')) {
      return 'delete';
    }
    if (name.includes('add') || name.includes('create') || name.includes('new')) {
      return 'add';
    }
    if (name.includes('edit') || name.includes('update')) {
      return 'edit';
    }
    if (name.includes('next')) {
      return 'next';
    }
    if (name.includes('prev') || name.includes('back')) {
      return 'previous';
    }

    return 'action';
  }

  /**
   * 推断按钮的状态变化
   */
  private inferStateChangesForButton(_node: ASTNode, action: string): StateChange[] {
    const changes: StateChange[] = [];

    switch (action) {
      case 'submit':
        changes.push({
          stateName: 'isSubmitting',
          stateType: 'boolean',
          initialValue: false,
          description: '提交状态',
        });
        break;
      case 'delete':
        changes.push({
          stateName: 'isDeleting',
          stateType: 'boolean',
          initialValue: false,
          description: '删除状态',
        });
        break;
      case 'add':
        changes.push({
          stateName: 'items',
          stateType: 'array',
          initialValue: [],
          description: '项目列表',
        });
        break;
      case 'next':
      case 'previous':
        changes.push({
          stateName: 'currentStep',
          stateType: 'number',
          initialValue: 0,
          description: '当前步骤',
        });
        break;
    }

    return changes;
  }

  /**
   * 推断输入框交互
   */
  private inferInputInteraction(node: ASTNode): InteractionPattern {
    const inputName = this.sanitizeName(node.name);

    return {
      type: 'input',
      trigger: `on${this.capitalize(inputName)}Change`,
      action: 'updateValue',
      stateChanges: [
        {
          stateName: inputName,
          stateType: this.inferInputType(node),
          initialValue: this.getInitialValue(this.inferInputType(node)),
          description: `${node.name} 的值`,
        },
      ],
    };
  }

  /**
   * 推断输入类型
   */
  private inferInputType(node: ASTNode): StateChange['stateType'] {
    const name = node.name.toLowerCase();

    if (name.includes('email')) return 'string';
    if (name.includes('password')) return 'string';
    if (name.includes('phone') || name.includes('number') || name.includes('age')) return 'number';
    if (name.includes('address') || name.includes('description')) return 'string';

    return 'string';
  }

  /**
   * 推断切换开关交互
   */
  private inferToggleInteraction(node: ASTNode): InteractionPattern {
    const toggleName = this.sanitizeName(node.name);

    return {
      type: 'toggle',
      trigger: `on${this.capitalize(toggleName)}Toggle`,
      action: 'toggle',
      stateChanges: [
        {
          stateName: `is${this.capitalize(toggleName)}`,
          stateType: 'boolean',
          initialValue: false,
          description: `${node.name} 的开关状态`,
        },
      ],
    };
  }

  /**
   * 推断导航交互
   */
  private inferNavigationInteraction(_node: ASTNode): InteractionPattern {
    return {
      type: 'navigation',
      trigger: 'onNavigate',
      action: 'navigate',
      stateChanges: [
        {
          stateName: 'currentPage',
          stateType: 'string',
          initialValue: 'home',
          description: '当前页面',
        },
      ],
    };
  }

  /**
   * 推断表单交互
   */
  private inferFormInteraction(_node: ASTNode): InteractionPattern {
    return {
      type: 'form',
      trigger: 'onFormSubmit',
      action: 'submitForm',
      stateChanges: [
        {
          stateName: 'formData',
          stateType: 'object',
          initialValue: {},
          description: '表单数据',
        },
        {
          stateName: 'formErrors',
          stateType: 'object',
          initialValue: {},
          description: '表单错误',
        },
        {
          stateName: 'isSubmitting',
          stateType: 'boolean',
          initialValue: false,
          description: '提交状态',
        },
      ],
    };
  }

  /**
   * 推断悬停交互
   */
  private inferHoverInteraction(node: ASTNode): InteractionPattern {
    const nodeName = this.sanitizeName(node.name);

    return {
      type: 'hover',
      trigger: `on${this.capitalize(nodeName)}Hover`,
      action: 'hover',
      stateChanges: [
        {
          stateName: `is${this.capitalize(nodeName)}Hovered`,
          stateType: 'boolean',
          initialValue: false,
          description: `${node.name} 的悬停状态`,
        },
      ],
    };
  }

  /**
   * 生成状态定义
   */
  private generateStateDefinitions(
    interactions: InteractionPattern[],
    config: PrototypeConfig
  ): string[] {
    const stateMap = new Map<string, StateChange>();

    // 收集所有状态
    for (const interaction of interactions) {
      for (const stateChange of interaction.stateChanges) {
        if (!stateMap.has(stateChange.stateName)) {
          stateMap.set(stateChange.stateName, stateChange);
        }
      }
    }

    // 生成状态定义代码
    const definitions: string[] = [];

    for (const state of Array.from(stateMap.values())) {
      if (config.framework === 'react') {
        definitions.push(this.generateReactState(state));
      } else {
        definitions.push(this.generateVueState(state));
      }
    }

    return definitions;
  }

  /**
   * 生成 React 状态
   */
  private generateReactState(state: StateChange): string {
    const initialValue = JSON.stringify(state.initialValue);
    const setterName = `set${this.capitalize(state.stateName)}`;

    return `const [${state.stateName}, ${setterName}] = useState<${this.getTypeScriptType(state.stateType)}>(${initialValue});`;
  }

  /**
   * 生成 Vue 状态
   */
  private generateVueState(state: StateChange): string {
    const initialValue = JSON.stringify(state.initialValue);

    return `const ${state.stateName} = ref<${this.getTypeScriptType(state.stateType)}>(${initialValue});`;
  }

  /**
   * 生成事件处理器
   */
  private generateEventHandlers(
    interactions: InteractionPattern[],
    config: PrototypeConfig
  ): EventHandler[] {
    const handlers: EventHandler[] = [];

    for (const interaction of interactions) {
      handlers.push(this.generateEventHandler(interaction, config));
    }

    return handlers;
  }

  /**
   * 生成单个事件处理器
   */
  private generateEventHandler(
    interaction: InteractionPattern,
    config: PrototypeConfig
  ): EventHandler {
    const handlerName = `handle${this.capitalize(interaction.trigger.replace('on', ''))}`;
    const parameters = this.getHandlerParameters(interaction);
    const body = this.generateHandlerBody(interaction, config);
    const stateUpdates = interaction.stateChanges.map((s) => s.stateName);

    return {
      eventType: interaction.type,
      handlerName,
      parameters,
      body,
      stateUpdates,
    };
  }

  /**
   * 获取处理器参数
   */
  private getHandlerParameters(interaction: InteractionPattern): string[] {
    switch (interaction.type) {
      case 'click':
        return ['event: React.MouseEvent'];
      case 'input':
        return ['event: React.ChangeEvent<HTMLInputElement>'];
      case 'form':
        return ['event: React.FormEvent'];
      case 'hover':
        return [];
      default:
        return ['event: React.SyntheticEvent'];
    }
  }

  /**
   * 生成处理器主体
   */
  private generateHandlerBody(interaction: InteractionPattern, _config: PrototypeConfig): string {
    const lines: string[] = [];

    switch (interaction.action) {
      case 'submit':
        lines.push('event.preventDefault();');
        lines.push('setIsSubmitting(true);');
        lines.push('// TODO: 实现提交逻辑');
        lines.push('try {');
        lines.push('  // 调用 API');
        lines.push('  console.log("提交表单");');
        lines.push('} catch (error) {');
        lines.push('  console.error("提交失败:", error);');
        lines.push('} finally {');
        lines.push('  setIsSubmitting(false);');
        lines.push('}');
        break;

      case 'updateValue':
        if (interaction.stateChanges.length > 0) {
          const stateName = interaction.stateChanges[0].stateName;
          const setterName = `set${this.capitalize(stateName)}`;
          lines.push(`${setterName}(event.target.value);`);
        }
        break;

      case 'toggle':
        if (interaction.stateChanges.length > 0) {
          const stateName = interaction.stateChanges[0].stateName;
          const setterName = `set${this.capitalize(stateName)}`;
          lines.push(`${setterName}(prev => !prev);`);
        }
        break;

      case 'next':
        lines.push('setCurrentStep(prev => prev + 1);');
        break;

      case 'previous':
        lines.push('setCurrentStep(prev => Math.max(0, prev - 1));');
        break;

      case 'navigate':
        lines.push('// TODO: 实现导航逻辑');
        lines.push('console.log("导航到:", page);');
        break;

      case 'hover':
        if (interaction.stateChanges.length > 0) {
          const stateName = interaction.stateChanges[0].stateName;
          const setterName = `set${this.capitalize(stateName)}`;
          lines.push(`${setterName}(true);`);
        }
        break;

      default:
        lines.push('// TODO: 实现交互逻辑');
        lines.push(`console.log("${interaction.action}");`);
    }

    return lines.join('\n    ');
  }

  /**
   * 生成组件代码
   */
  private generateComponentCode(
    ast: ASTNode,
    stateDefinitions: string[],
    eventHandlers: EventHandler[],
    config: PrototypeConfig
  ): string {
    if (config.framework === 'react') {
      return this.generateReactComponent(ast, stateDefinitions, eventHandlers);
    } else {
      return this.generateVueComponent(ast, stateDefinitions, eventHandlers);
    }
  }

  /**
   * 生成 React 组件
   */
  private generateReactComponent(
    ast: ASTNode,
    stateDefinitions: string[],
    eventHandlers: EventHandler[]
  ): string {
    const componentName = this.capitalize(this.sanitizeName(ast.name));

    const lines: string[] = [];
    lines.push(`import React, { useState } from 'react';`);
    lines.push('');
    lines.push(`export const ${componentName}: React.FC = () => {`);
    lines.push('  // 状态定义');

    for (const stateDef of stateDefinitions) {
      lines.push(`  ${stateDef}`);
    }

    lines.push('');
    lines.push('  // 事件处理器');

    for (const handler of eventHandlers) {
      lines.push(`  const ${handler.handlerName} = (${handler.parameters.join(', ')}) => {`);
      lines.push(`    ${handler.body}`);
      lines.push('  };');
      lines.push('');
    }

    lines.push('  return (');
    lines.push('    <div>');
    lines.push('      {/* TODO: 添加组件 JSX */}');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('};');

    return lines.join('\n');
  }

  /**
   * 生成 Vue 组件
   */
  private generateVueComponent(
    _ast: ASTNode,
    stateDefinitions: string[],
    eventHandlers: EventHandler[]
  ): string {
    const lines: string[] = [];
    lines.push('<template>');
    lines.push('  <div>');
    lines.push('    <!-- TODO: 添加组件模板 -->');
    lines.push('  </div>');
    lines.push('</template>');
    lines.push('');
    lines.push('<script setup lang="ts">');
    lines.push("import { ref } from 'vue';");
    lines.push('');
    lines.push('// 状态定义');

    for (const stateDef of stateDefinitions) {
      lines.push(stateDef);
    }

    lines.push('');
    lines.push('// 事件处理器');

    for (const handler of eventHandlers) {
      lines.push(`const ${handler.handlerName} = (${handler.parameters.join(', ')}) => {`);
      lines.push(`  ${handler.body}`);
      lines.push('};');
      lines.push('');
    }

    lines.push('</script>');

    return lines.join('\n');
  }

  /**
   * 收集依赖
   */
  private collectDependencies(
    interactions: InteractionPattern[],
    config: PrototypeConfig
  ): string[] {
    const dependencies = new Set<string>();

    if (config.framework === 'react') {
      dependencies.add('react');

      if (config.stateManagement === 'useReducer') {
        // useReducer 是 React 内置的
      }
    } else {
      dependencies.add('vue');

      if (config.stateManagement === 'pinia') {
        dependencies.add('pinia');
      } else if (config.stateManagement === 'vuex') {
        dependencies.add('vuex');
      }
    }

    // 根据交互类型添加依赖
    for (const interaction of interactions) {
      if (interaction.type === 'form' && config.includeValidation) {
        if (config.framework === 'react') {
          dependencies.add('react-hook-form');
          dependencies.add('zod');
        } else {
          dependencies.add('vee-validate');
        }
      }

      if (config.includeAnimations) {
        dependencies.add('framer-motion');
      }
    }

    return Array.from(dependencies);
  }

  // ========== 辅助方法 ==========

  /**
   * 判断是否为按钮
   */
  private isButton(node: ASTNode): boolean {
    return (
      node.name.toLowerCase().includes('button') ||
      node.name.toLowerCase().includes('btn')
    );
  }

  /**
   * 判断是否为输入框
   */
  private isInput(node: ASTNode): boolean {
    return (
      node.name.toLowerCase().includes('input') ||
      node.name.toLowerCase().includes('field')
    );
  }

  /**
   * 判断是否为切换开关
   */
  private isToggle(node: ASTNode): boolean {
    return (
      node.name.toLowerCase().includes('toggle') ||
      node.name.toLowerCase().includes('switch') ||
      node.name.toLowerCase().includes('checkbox')
    );
  }

  /**
   * 判断是否为导航
   */
  private isNavigation(node: ASTNode): boolean {
    return (
      node.name.toLowerCase().includes('nav') ||
      node.name.toLowerCase().includes('menu') ||
      node.name.toLowerCase().includes('tab')
    );
  }

  /**
   * 判断是否为表单
   */
  private isForm(node: ASTNode): boolean {
    return node.name.toLowerCase().includes('form');
  }

  /**
   * 判断是否有悬停状态
   */
  private hasHoverState(node: ASTNode): boolean {
    // 检查是否有悬停样式变化
    return !!(node.styles && node.name.toLowerCase().includes('hover'));
  }

  /**
   * 清理名称
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_$&');
  }

  /**
   * 首字母大写
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 获取 TypeScript 类型
   */
  private getTypeScriptType(stateType: StateChange['stateType']): string {
    switch (stateType) {
      case 'boolean':
        return 'boolean';
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'array':
        return 'any[]';
      case 'object':
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }

  /**
   * 获取初始值
   */
  private getInitialValue(stateType: StateChange['stateType']): any {
    switch (stateType) {
      case 'boolean':
        return false;
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
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
}
