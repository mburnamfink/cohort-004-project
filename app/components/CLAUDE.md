Shadcn components live in `app/components/ui/`. Custom components go directly in `app/components/`. Don't nest component folders deeper than that.

---

`cn()` from `~/lib/utils` for combining tailwind classes. It's clsx + tailwind-merge.

---

Use `formatPrice()` from `~/lib/utils` to display prices. It handles the "Free" case for 0/null. Prices are stored in cents (integers) — see the db conventions.
