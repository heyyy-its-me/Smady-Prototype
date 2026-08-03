# PostgreSQL configuration

Set `DATABASE_URL` or all of `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD`. Set `DATABASE_SSL=false` only for a local non-TLS PostgreSQL
server. The application creates its workflow tables and indexes automatically
on the first callback, poll, or webhook trigger.
