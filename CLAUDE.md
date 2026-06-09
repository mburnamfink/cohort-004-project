When you have a function with more than one parameter with the same type (i.e. `string`), use an object parameter instead of positional parameters:

```ts
// BAD
const addUserToPost = (userId: string, postId: string) => {};

// GOOD
const addUserToPost = (opts: { userId: string; postId: string }) => {};
```

---

Use `~/*` import alias for anything inside `/app`. Don't use relative imports like `../../lib/utils`, use `~/lib/utils` instead.

---

Don't use `any`. If you need a type you're not sure about, check the Drizzle schema or use `typeof` inference.

---

Anything marked as a 'service' (by the name of the file, for instance `authTokenService.ts`) should have tests written for them in an accompanying `.test.ts` file.

---

When returning tagged/discriminated results from services (not validation), use `{ ok: true, ... } | { ok: false, error: string }` pattern. See couponService for reference.

---

Tests use vitest with globals. Every test file needs to mock the db module like this:

```ts
let testDb: ReturnType<typeof createTestDb>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));
```

The mock MUST come before importing the service under test. Use `createTestDb()` and `seedBaseData()` from `~/test/setup` in `beforeEach`.

## Where conventions live

Detailed rules auto-load when you work in these directories:
- `app/routes/` — routing, validation, auth
- `app/components/` — UI, tailwind, shadcn
- `app/db/` — schema, columns, Drizzle/SQLite
