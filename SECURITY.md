# Security policy

## Data boundary

The public GitHub repository contains source code and documentation only.
Household names, nicknames, chores and completion history belong in Supabase
and must never be committed to Git.

## Access codes

- A household access code is a bearer secret, not a personal identity.
- Access codes are stored as SHA-256 hashes in the database.
- The raw code is shown only after creation or rotation.
- Rotate the code immediately if it was shared with the wrong person.
- Do not put access codes in URLs, screenshots, issue reports or public demos.

## Secrets

Never commit `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, database connection
strings or a production export. The service-role key is server-only and is
used by the access-code route handlers.

## Reporting

Please open a private security report with the repository owner. Do not publish
an exploitable vulnerability or a real household code in a public issue.
