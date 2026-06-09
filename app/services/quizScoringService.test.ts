import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { QuestionType } from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import { computeResult } from "./quizScoringService";

/**
 * Builds a quiz with two questions, each having one correct and one wrong
 * option. Returns the ids needed to submit answers.
 */
function seedQuiz(passingScore: number) {
  const module = testDb
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Module 1", position: 1 })
    .returning()
    .get();

  const lesson = testDb
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 1", position: 1 })
    .returning()
    .get();

  const quiz = testDb
    .insert(schema.quizzes)
    .values({ lessonId: lesson.id, title: "Quiz 1", passingScore })
    .returning()
    .get();

  const questions = [0, 1].map((i) =>
    testDb
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz.id,
        questionText: `Q${i}`,
        questionType: QuestionType.MultipleChoice,
        position: i,
      })
      .returning()
      .get()
  );

  const options = questions.map((q) => {
    const correct = testDb
      .insert(schema.quizOptions)
      .values({ questionId: q.id, optionText: "right", isCorrect: true })
      .returning()
      .get();
    const wrong = testDb
      .insert(schema.quizOptions)
      .values({ questionId: q.id, optionText: "wrong", isCorrect: false })
      .returning()
      .get();
    return { question: q, correct, wrong };
  });

  return { quiz, options };
}

describe("quizScoringService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("computeResult", () => {
    it("returns ok: false when the quiz does not exist", () => {
      const outcome = computeResult(base.user.id, 9999, {});
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.error).toBe("Quiz not found");
      }
    });

    it("scores a fully correct submission and passes", () => {
      const { quiz, options } = seedQuiz(0.7);
      const answers = {
        [options[0].question.id]: options[0].correct.id,
        [options[1].question.id]: options[1].correct.id,
      };

      const outcome = computeResult(base.user.id, quiz.id, answers);

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.score).toBe(1);
      expect(outcome.result.totalCorrect).toBe(2);
      expect(outcome.result.totalQuestions).toBe(2);
      expect(outcome.result.passed).toBe(true);
      expect(outcome.result.grade).toBe("A");
    });

    it("marks a submission below the quiz passingScore as not passed", () => {
      const { quiz, options } = seedQuiz(0.7);
      const answers = {
        [options[0].question.id]: options[0].correct.id,
        [options[1].question.id]: options[1].wrong.id,
      };

      const outcome = computeResult(base.user.id, quiz.id, answers);

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.result.score).toBe(0.5);
      expect(outcome.result.passed).toBe(false);
    });

    it("treats an unanswered question as incorrect with a null selection", () => {
      const { quiz, options } = seedQuiz(0.7);
      const answers = { [options[0].question.id]: options[0].correct.id };

      const outcome = computeResult(base.user.id, quiz.id, answers);

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      const unanswered = outcome.result.questionResults.find(
        (r) => r.questionId === options[1].question.id
      );
      expect(unanswered?.correct).toBe(false);
      expect(unanswered?.selectedOptionId).toBeNull();
    });

    it("persists the attempt and only the answered questions", () => {
      const { quiz, options } = seedQuiz(0.7);
      const answers = { [options[0].question.id]: options[0].correct.id };

      const outcome = computeResult(base.user.id, quiz.id, answers);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      const attempts = testDb.select().from(schema.quizAttempts).all();
      expect(attempts).toHaveLength(1);
      expect(attempts[0].id).toBe(outcome.result.attemptId);

      const storedAnswers = testDb.select().from(schema.quizAnswers).all();
      expect(storedAnswers).toHaveLength(1);
      expect(storedAnswers[0].questionId).toBe(options[0].question.id);
    });
  });
});
