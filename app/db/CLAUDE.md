Database is SQLite via better-sqlite3 + Drizzle. The db instance is initialized in `app/db/index.ts` with WAL mode and foreign keys enabled. Don't create new Database connections in service code unless you have a really good reason.

---

DB ids are always `integer().primaryKey({ autoIncrement: true })`. Don't use UUIDs.

---

Timestamps in the database are stored as ISO strings in `text` columns, not as unix timestamps or integers. Use `$defaultFn(() => new Date().toISOString())` for defaults.

---

Booleans in SQLite are stored as integers with Drizzle's `mode: "boolean"`, e.g. `integer("ppp_enabled", { mode: "boolean" })`.

---

For soft deletes, use a nullable `text("deleted_at")` column. Don't actually delete rows. See `lessonComments` in the schema for an example.

---

Price values are stored in cents (integers). Display them with `formatPrice()` from `~/lib/utils`.
