/**
 * FeedbackLoop 单元测试
 */

import { FeedbackLoop } from '../../feedback/FeedbackLoop';
import type { Feedback } from '../../feedback/FeedbackLoop';

describe('FeedbackLoop', () => {
  let feedbackLoop: FeedbackLoop;

  beforeEach(() => {
    feedbackLoop = new FeedbackLoop(5);
  });

  describe('addFeedback', () => {
    it('should add feedback with generated ID and timestamp', () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'The button color should be blue',
        severity: 'medium',
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.timestamp).toBeInstanceOf(Date);
      expect(feedback.type).toBe('style');
      expect(feedback.content).toBe('The button color should be blue');
      expect(feedback.severity).toBe('medium');
    });

    it('should store feedback in internal collection', () => {
      feedbackLoop.addFeedback({
        type: 'style',
        content: 'Test feedback',
        severity: 'low',
      });

      const allFeedbacks = feedbackLoop.getAllFeedbacks();
      expect(allFeedbacks).toHaveLength(1);
    });
  });

  describe('analyzeFeedback', () => {
    it('should analyze style feedback', async () => {
      const feedback: Feedback = {
        id: '1',
        timestamp: new Date(),
        type: 'style',
        content: 'Change the color to red and adjust padding',
        severity: 'medium',
        targetFiles: ['Component.css'],
      };

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      expect(plan.changes.length).toBeGreaterThan(0);
      expect(plan.changes.some((c) => c.description.includes('color'))).toBe(true);
      expect(plan.changes.some((c) => c.description.includes('padding'))).toBe(true);
    });

    it('should analyze structure feedback', async () => {
      const feedback: Feedback = {
        id: '2',
        timestamp: new Date(),
        type: 'structure',
        content: 'Split this component into smaller pieces',
        severity: 'high',
        targetFiles: ['LargeComponent.tsx'],
      };

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      expect(plan.changes.length).toBeGreaterThan(0);
      expect(plan.changes.some((c) => c.type === 'refactor')).toBe(true);
      expect(plan.changes.some((c) => c.description.includes('Split'))).toBe(true);
    });

    it('should analyze functionality feedback', async () => {
      const feedback: Feedback = {
        id: '3',
        timestamp: new Date(),
        type: 'functionality',
        content: 'Add a new button to submit the form',
        severity: 'high',
        targetFiles: ['Form.tsx'],
      };

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      expect(plan.changes.length).toBeGreaterThan(0);
      expect(plan.changes.some((c) => c.type === 'add')).toBe(true);
    });

    it('should analyze performance feedback', async () => {
      const feedback: Feedback = {
        id: '4',
        timestamp: new Date(),
        type: 'performance',
        content: 'The component is slow to render',
        severity: 'high',
        targetFiles: ['SlowComponent.tsx'],
      };

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      expect(plan.changes.length).toBeGreaterThan(0);
      expect(plan.changes.some((c) => c.description.includes('performance'))).toBe(true);
    });

    it('should calculate priority based on severity', async () => {
      const highSeverity: Feedback = {
        id: '5',
        timestamp: new Date(),
        type: 'style',
        content: 'High priority issue',
        severity: 'high',
      };

      const lowSeverity: Feedback = {
        id: '6',
        timestamp: new Date(),
        type: 'style',
        content: 'Low priority issue',
        severity: 'low',
      };

      const highPlan = await feedbackLoop.analyzeFeedback([highSeverity]);
      const lowPlan = await feedbackLoop.analyzeFeedback([lowSeverity]);

      expect(highPlan.priority).toBeGreaterThan(lowPlan.priority);
    });

    it('should estimate effort correctly', async () => {
      const simpleFeedback: Feedback = {
        id: '7',
        timestamp: new Date(),
        type: 'style',
        content: 'Change color',
        severity: 'low',
      };

      const complexFeedback: Feedback[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        timestamp: new Date(),
        type: 'structure',
        content: 'Complex refactoring needed',
        severity: 'high',
      }));

      const simplePlan = await feedbackLoop.analyzeFeedback([simpleFeedback]);
      const complexPlan = await feedbackLoop.analyzeFeedback(complexFeedback);

      expect(simplePlan.estimatedEffort).toBe('low');
      expect(complexPlan.estimatedEffort).toBe('high');
    });
  });

  describe('executeIteration', () => {
    it('should execute iteration successfully', async () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Change color',
        severity: 'medium',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      const applyChanges = jest.fn().mockResolvedValue(true);
      const result = await feedbackLoop.executeIteration(plan, applyChanges);

      expect(result.success).toBe(true);
      expect(result.iterationNumber).toBe(1);
      expect(result.changesApplied.length).toBeGreaterThan(0);
      expect(applyChanges).toHaveBeenCalledWith(plan.changes);
    });

    it('should handle iteration failure', async () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Change color',
        severity: 'medium',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      const applyChanges = jest.fn().mockResolvedValue(false);
      const result = await feedbackLoop.executeIteration(plan, applyChanges);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle exceptions during iteration', async () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Change color',
        severity: 'medium',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback]);

      const applyChanges = jest.fn().mockRejectedValue(new Error('Apply failed'));
      const result = await feedbackLoop.executeIteration(plan, applyChanges);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Apply failed');
    });

    it('should throw error when max iterations reached', async () => {
      const shortLoop = new FeedbackLoop(2);

      const feedback = shortLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const plan = await shortLoop.analyzeFeedback([feedback]);
      const applyChanges = jest.fn().mockResolvedValue(true);

      await shortLoop.executeIteration(plan, applyChanges);
      await shortLoop.executeIteration(plan, applyChanges);

      await expect(shortLoop.executeIteration(plan, applyChanges)).rejects.toThrow(
        'Maximum iterations (2) reached'
      );
    });
  });

  describe('confirmSatisfaction', () => {
    it('should mark last iteration as satisfied', async () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback]);
      await feedbackLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));

      feedbackLoop.confirmSatisfaction(true);

      const history = feedbackLoop.getHistory();
      expect(history.iterations[0].userSatisfied).toBe(true);
      expect(history.satisfactionReached).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should return complete iteration history', async () => {
      const feedback1 = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Change 1',
        severity: 'low',
      });

      const feedback2 = feedbackLoop.addFeedback({
        type: 'structure',
        content: 'Change 2',
        severity: 'medium',
      });

      const plan1 = await feedbackLoop.analyzeFeedback([feedback1]);
      const plan2 = await feedbackLoop.analyzeFeedback([feedback2]);

      await feedbackLoop.executeIteration(plan1, jest.fn().mockResolvedValue(true));
      await feedbackLoop.executeIteration(plan2, jest.fn().mockResolvedValue(true));

      const history = feedbackLoop.getHistory();

      expect(history.iterations).toHaveLength(2);
      expect(history.totalFeedbacks).toBe(2);
      expect(history.totalChanges).toBeGreaterThan(0);
    });

    it('should indicate when max iterations reached', async () => {
      const shortLoop = new FeedbackLoop(1);

      const feedback = shortLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const plan = await shortLoop.analyzeFeedback([feedback]);
      await shortLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));

      const history = shortLoop.getHistory();
      expect(history.maxIterationsReached).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all feedbacks and iterations', async () => {
      feedbackLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const feedback = feedbackLoop.getAllFeedbacks()[0];
      const plan = await feedbackLoop.analyzeFeedback([feedback]);
      await feedbackLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));

      feedbackLoop.reset();

      expect(feedbackLoop.getAllFeedbacks()).toHaveLength(0);
      expect(feedbackLoop.getHistory().iterations).toHaveLength(0);
    });
  });

  describe('getUnprocessedFeedbacks', () => {
    it('should return feedbacks not yet processed', async () => {
      const feedback1 = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Processed',
        severity: 'low',
      });

      const feedback2 = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Unprocessed',
        severity: 'low',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback1]);
      await feedbackLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));

      const unprocessed = feedbackLoop.getUnprocessedFeedbacks();

      expect(unprocessed).toHaveLength(1);
      expect(unprocessed[0].id).toBe(feedback2.id);
    });
  });

  describe('canContinue', () => {
    it('should return true when can continue', () => {
      expect(feedbackLoop.canContinue()).toBe(true);
    });

    it('should return false when satisfied', async () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback]);
      await feedbackLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));
      feedbackLoop.confirmSatisfaction(true);

      expect(feedbackLoop.canContinue()).toBe(false);
    });

    it('should return false when max iterations reached', async () => {
      const shortLoop = new FeedbackLoop(1);

      const feedback = shortLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const plan = await shortLoop.analyzeFeedback([feedback]);
      await shortLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));

      expect(shortLoop.canContinue()).toBe(false);
    });
  });

  describe('isSatisfied', () => {
    it('should return false initially', () => {
      expect(feedbackLoop.isSatisfied()).toBe(false);
    });

    it('should return true after satisfaction confirmed', async () => {
      const feedback = feedbackLoop.addFeedback({
        type: 'style',
        content: 'Test',
        severity: 'low',
      });

      const plan = await feedbackLoop.analyzeFeedback([feedback]);
      await feedbackLoop.executeIteration(plan, jest.fn().mockResolvedValue(true));
      feedbackLoop.confirmSatisfaction(true);

      expect(feedbackLoop.isSatisfied()).toBe(true);
    });
  });
});
