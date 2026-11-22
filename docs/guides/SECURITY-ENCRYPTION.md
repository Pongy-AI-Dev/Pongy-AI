# Cloud history encryption

Pongy AI encrypts every Firestore document payload before it leaves the server.

- Cipher: AES-256-GCM.
- Each write uses a fresh 96-bit random IV and an authentication tag.
- The Firebase user ID is authenticated as additional data, so ciphertext cannot be moved between accounts and still decrypt.
- Chat titles, message bodies, saved preferences, file metadata and chunk payloads are inside the encrypted JSON field. The Firestore updated_at index remains outside the ciphertext for sorting.
- Older plaintext records remain readable and are lazily rewritten in encrypted form when a user reads or lists them.
- A corrupted tag, wrong account ID or wrong key fails closed; it is never treated as an empty chat.

The encryption key is a separate HISTORY_ENCRYPTION_KEY secret. If it is not supplied in the environment, Pongy generates one and stores it in the protected auth-secrets file beside the database (same directory and restricted file permissions). Keep that file in persistent storage and back it up securely. If using an environment-supplied key, keep it stable across deployments and backups. Losing or replacing the key makes existing encrypted cloud records unreadable.

This is application-layer encryption at rest, not end-to-end encryption: the server decrypts data to serve the signed-in user and the selected AI provider receives the prompt needed to generate a reply. Numeric tokenizer IDs are not encryption and are not used as a substitute for cryptographic protection.
