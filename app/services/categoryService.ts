import { eq, sql } from "drizzle-orm";
import { db } from "~/db";
import { categories, courses } from "~/db/schema";

// ─── Category Service ───
// Handles category CRUD, slug generation, and uniqueness validation.
// Uses positional parameters (project convention).

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getAllCategories() {
  return db.select().from(categories).orderBy(categories.name).all();
}

export function getCategoryById(id: number) {
  return db.select().from(categories).where(eq(categories.id, id)).get();
}

export function getCategoryBySlug(slug: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get();
}

export function getCategoryByName(name: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .get();
}

export function getAllCategoriesWithCourseCounts() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      courseCount: sql<number>`count(${courses.id})`,
    })
    .from(categories)
    .leftJoin(courses, eq(categories.id, courses.categoryId))
    .groupBy(categories.id)
    .orderBy(categories.name)
    .all();
}

export type CategoryResult =
  | { ok: true; category: typeof categories.$inferSelect }
  | { ok: false; error: string };

export function createCategory(name: string): CategoryResult {
  const slug = slugify(name);

  if (getCategoryByName(name)) {
    return {
      ok: false,
      error: `A category with the name "${name}" already exists.`,
    };
  }

  if (getCategoryBySlug(slug)) {
    return {
      ok: false,
      error: `A category with the slug "${slug}" already exists.`,
    };
  }

  const category = db
    .insert(categories)
    .values({ name, slug })
    .returning()
    .get();
  return { ok: true, category };
}

export function updateCategory(id: number, name: string): CategoryResult {
  const slug = slugify(name);

  const existingName = getCategoryByName(name);
  if (existingName && existingName.id !== id) {
    return {
      ok: false,
      error: `A category with the name "${name}" already exists.`,
    };
  }

  const existingSlug = getCategoryBySlug(slug);
  if (existingSlug && existingSlug.id !== id) {
    return {
      ok: false,
      error: `A category with the slug "${slug}" already exists.`,
    };
  }

  const category = db
    .update(categories)
    .set({ name, slug })
    .where(eq(categories.id, id))
    .returning()
    .get();
  return { ok: true, category };
}

export function deleteCategory(id: number): CategoryResult {
  const courseCount = db
    .select({ count: sql<number>`count(*)` })
    .from(courses)
    .where(eq(courses.categoryId, id))
    .get();

  const count = courseCount?.count ?? 0;
  if (count > 0) {
    return {
      ok: false,
      error: `Cannot delete: ${count} course${count === 1 ? "" : "s"} use this category.`,
    };
  }

  const category = db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning()
    .get()!;
  return { ok: true, category };
}
