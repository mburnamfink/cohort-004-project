import { eq, and, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  enrollments,
  courses,
  modules,
  lessons,
  lessonProgress,
  LessonProgressStatus,
} from "~/db/schema";

// ─── Enrollment Service ───
// Handles enrollment, unenrollment, duplicate prevention, and enrollment validation.
// Uses positional parameters (project convention).

export function getEnrollmentById(id: number) {
  return db.select().from(enrollments).where(eq(enrollments.id, id)).get();
}

export function getEnrollmentsByUser(userId: number) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .all();
}

export function getEnrollmentsByCourse(courseId: number) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .all();
}

export function getEnrollmentCountForCourse(courseId: number) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .get();

  return result?.count ?? 0;
}

export function findEnrollment(userId: number, courseId: number) {
  return db
    .select()
    .from(enrollments)
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .get();
}

export function isUserEnrolled(userId: number, courseId: number) {
  return !!findEnrollment(userId, courseId);
}

export type EnrollmentResult =
  | { ok: true; enrollment: typeof enrollments.$inferSelect }
  | { ok: false; error: string };

export function enrollUser(
  userId: number,
  courseId: number,
  sendEmail: boolean,
  skipValidation: boolean
): EnrollmentResult {
  if (!skipValidation) {
    const existing = findEnrollment(userId, courseId);
    if (existing) {
      return { ok: false, error: "User is already enrolled in this course" };
    }

    const course = db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .get();
    if (!course) {
      return { ok: false, error: "Course not found" };
    }
  }

  const enrollment = db
    .insert(enrollments)
    .values({ userId, courseId })
    .returning()
    .get();

  // sendEmail parameter accepted but not implemented (no email service — PRD out of scope)
  if (sendEmail) {
    // Would send welcome email here
  }

  return { ok: true, enrollment };
}

export function unenrollUser(
  userId: number,
  courseId: number
): EnrollmentResult {
  const existing = findEnrollment(userId, courseId);
  if (!existing) {
    return { ok: false, error: "User is not enrolled in this course" };
  }

  const enrollment = db
    .delete(enrollments)
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .returning()
    .get()!;

  return { ok: true, enrollment };
}

export function markEnrollmentComplete(userId: number, courseId: number) {
  return db
    .update(enrollments)
    .set({ completedAt: new Date().toISOString() })
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .returning()
    .get();
}

export function getUserEnrolledCourses(userId: number) {
  return db
    .select({
      enrollmentId: enrollments.id,
      courseId: enrollments.courseId,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      courseDescription: courses.description,
      coverImageUrl: courses.coverImageUrl,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .all();
}

export function getCourseEnrolledStudents(courseId: number) {
  return db
    .select({
      enrollmentId: enrollments.id,
      userId: enrollments.userId,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .all();
}
