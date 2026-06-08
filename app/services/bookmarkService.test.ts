import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  toggleBookmark,
  isLessonBookmarked,
  getBookmarkedLessonIds,
} from "./bookmarkService";
import { createModule } from "./moduleService";
import { createLesson } from "./lessonService";

let lessonId: number;
let otherLessonId: number;

describe("bookmarkService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
    const mod = createModule(base.course.id, "Test Module", 1);
    lessonId = createLesson(mod.id, "L1", null, null, 1, null).id;
    otherLessonId = createLesson(mod.id, "L2", null, null, 2, null).id;
  });

  describe("toggleBookmark", () => {
    it("creates a bookmark when none exists", () => {
      const result = toggleBookmark(base.user.id, lessonId);
      expect(result.bookmarked).toBe(true);
      expect(isLessonBookmarked(base.user.id, lessonId)).toBe(true);
    });

    it("removes the bookmark when it already exists", () => {
      toggleBookmark(base.user.id, lessonId);
      const result = toggleBookmark(base.user.id, lessonId);
      expect(result.bookmarked).toBe(false);
      expect(isLessonBookmarked(base.user.id, lessonId)).toBe(false);
    });

    it("scopes bookmarks per user", () => {
      toggleBookmark(base.user.id, lessonId);
      expect(isLessonBookmarked(base.instructor.id, lessonId)).toBe(false);
    });
  });

  describe("isLessonBookmarked", () => {
    it("returns false for an unbookmarked lesson", () => {
      expect(isLessonBookmarked(base.user.id, lessonId)).toBe(false);
    });
  });

  describe("getBookmarkedLessonIds", () => {
    it("returns ids of bookmarked lessons in the course", () => {
      toggleBookmark(base.user.id, lessonId);
      toggleBookmark(base.user.id, otherLessonId);
      const ids = getBookmarkedLessonIds(base.user.id, base.course.id);
      expect(ids.sort()).toEqual([lessonId, otherLessonId].sort());
    });

    it("only returns lessons belonging to the requested course", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();
      const otherMod = createModule(otherCourse.id, "Other Module", 1);
      const otherCourseLessonId = createLesson(
        otherMod.id,
        "OL1",
        null,
        null,
        1,
        null
      ).id;

      toggleBookmark(base.user.id, lessonId);
      toggleBookmark(base.user.id, otherCourseLessonId);

      const ids = getBookmarkedLessonIds(base.user.id, base.course.id);
      expect(ids).toEqual([lessonId]);
    });

    it("returns an empty array when nothing is bookmarked", () => {
      expect(getBookmarkedLessonIds(base.user.id, base.course.id)).toEqual([]);
    });
  });
});
