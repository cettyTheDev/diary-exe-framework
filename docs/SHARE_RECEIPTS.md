# Share receipt contract

M3 `MAKE RECEIPT` is a local, user-initiated export. It creates no social post, analytics event, upload, transaction, or external request.

Every share receipt embeds the entry ID, date and date precision, evidence label, excerpt, context, source document/version, source page, checksum state, citation state, entities/topics, and story arc. The model is derived from the read-only archive repository; users cannot replace its evidence fields with arbitrary text.

Fixture exports are allowed only for interface verification and permanently display `FIXTURE — NOT SOURCE EVIDENCE`. Mixed fixture/production records are rejected. A production export requires a 64-character source SHA-256, a verified source, verified citations covering an entry page, and an evidence kind other than unresolved or third-party claim.

The PNG renderer uses only browser Canvas APIs and system fonts. It does not load remote images or fonts. The preview URL uses `?receipt=<entry-id>` so browser history and direct links restore the same evidence-bound model.
