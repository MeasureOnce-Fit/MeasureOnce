# Profile collection research

Research checked: 21 September 2026. Scope: the Fit Passport profile field that determines which catalog departments and known-size choices are offered.

## Recommendation

Use a required **catalog collection** field on each fit profile, with values `women`, `men`, and `both`; do not label or model it as a person's gender. It is a shopping/catalog filter, not identity data. `both` supports a shared account and a person who shops across both catalog collections without forcing a relationship or gender disclosure.

The selected profile—not the signed-in account—must determine the available clothing types, brands, and category-size references. A profile owner can therefore keep separate fit evidence for themselves and another person under one account. Never infer a profile collection from a product, a name, or prior evidence; prompt only when the profile is `both` and the journey needs an unambiguous catalog collection.

This is a smaller and more accurate data contract than a required `gender` field. The EU GDPR's data-minimisation principle requires personal data to be adequate, relevant, and limited to what is necessary for its purpose. A catalog-routing preference is sufficient for this feature; gender identity is not. [GDPR, Article 5(1)(c)](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

## Migration and validation guidance

1. Add a nullable `catalog_collection` column first, backfill existing profiles to `both`, then enforce `NOT NULL` and a database `CHECK` allowing only `women`, `men`, and `both`. The application validates the same enum at its input boundary, but the database remains the authority.
2. Keep the migration as a versioned SQL file in `supabase/migrations/`; Supabase documents migrations as the source-controlled mechanism for schema changes and warns that remote SQL-editor changes bypass migration history. [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
3. PostgreSQL supports `ALTER TABLE ... ADD COLUMN` and `ADD CONSTRAINT ... CHECK (...)`; its documentation notes that adding a check/not-null constraint validates existing data, which is why the backfill must precede enforcement. [PostgreSQL `ALTER TABLE`](https://www.postgresql.org/docs/17/sql-altertable.html), [PostgreSQL modifying tables](https://www.postgresql.org/docs/17/ddl-alter.html).
4. Existing access controls should not broaden: the field belongs on the current profile row and must remain covered by the existing owner-scoped Row Level Security policies. Supabase identifies RLS as the mechanism that makes direct client database access safe. [Supabase database overview](https://supabase.com/docs/guides/database/overview).

## Product behavior to implement

| Profile collection | Known-size catalog behavior |
|---|---|
| `women` | Offer only women's categories, eligible brands, and their verified synthetic charts. |
| `men` | Offer only men's categories, eligible brands, and their verified synthetic charts. |
| `both` | First ask which collection applies to this garment, then use the corresponding filtered flow. |

For any category/brand outside the MeasureOnce catalog, retain the current honest fallback: collect body or garment measurements rather than fabricating a size-chart recommendation.

## Acceptance criteria

- New-profile creation requires a catalog collection selection and persists it.
- Existing profiles migrate safely to `both` and remain usable.
- Switching profiles immediately changes the available known-size clothing types and brands.
- A `both` profile explicitly chooses women/men per known-garment entry; evidence records retain the chosen catalog context.
- Server/API requests reject an invalid collection, mismatched category, or forged profile ownership.
- Migration, unit/API tests, and a browser journey cover a shared account with at least two differently configured profiles.
