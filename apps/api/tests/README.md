# Table sorting regression tests

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database, then run:

```sh
npm run test:sorting --workspace apps/api
```

The tests apply the real migrations to a uniquely named schema, insert fixtures,
exercise the list services, and remove that schema afterwards. Without
`TEST_DATABASE_URL`, the database suite is skipped.

Coverage includes ascending and descending ordering across page boundaries,
equal values, nulls, search and request status filters, unknown sort keys,
translation fallback, complete multilingual records, counts and full trees.
