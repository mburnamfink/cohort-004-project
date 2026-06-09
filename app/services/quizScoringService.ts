import { eq, and } from "drizzle-orm";
import { db } from "~/db";
import {
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "~/db/schema";

// ─── Quiz Scoring Service ───
// Scores a quiz submission, persists the attempt and its answers, and reports
// per-question results. Pass/fail uses the quiz's own passingScore threshold.

export type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

export type QuizResult = {
  attemptId: number;
  score: number;
  passed: boolean;
  grade: string;
  totalCorrect: number;
  totalQuestions: number;
  questionResults: QuestionResult[];
};

export type ComputeResultOutcome =
  | { ok: true; result: QuizResult }
  | { ok: false; error: string };

function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

/**
 * Scores `selectedAnswers` (a map of questionId → selected optionId) against
 * the quiz's correct options, records the attempt, and returns the result.
 */
export function computeResult(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
): ComputeResultOutcome {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz) {
    return { ok: false, error: "Quiz not found" };
  }

  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  const questionResults: QuestionResult[] = [];
  let correctCount = 0;

  for (const question of questions) {
    const selectedOptionId = selectedAnswers[question.id] ?? null;

    const correctOption = db
      .select()
      .from(quizOptions)
      .where(
        and(
          eq(quizOptions.questionId, question.id),
          eq(quizOptions.isCorrect, true)
        )
      )
      .get();
    const correctOptionId = correctOption?.id ?? null;

    const correct =
      selectedOptionId !== null && selectedOptionId === correctOptionId;
    if (correct) correctCount++;

    questionResults.push({
      questionId: question.id,
      correct,
      selectedOptionId,
      correctOptionId,
    });
  }

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const passed = score >= quiz.passingScore;

  const attempt = db
    .insert(quizAttempts)
    .values({ userId, quizId, score, passed })
    .returning()
    .get();

  for (const result of questionResults) {
    if (result.selectedOptionId !== null) {
      db.insert(quizAnswers)
        .values({
          attemptId: attempt.id,
          questionId: result.questionId,
          selectedOptionId: result.selectedOptionId,
        })
        .run();
    }
  }

  return {
    ok: true,
    result: {
      attemptId: attempt.id,
      score,
      passed,
      grade: calculateGrade(score),
      totalCorrect: correctCount,
      totalQuestions,
      questionResults,
    },
  };
}
