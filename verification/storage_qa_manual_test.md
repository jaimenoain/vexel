# Manual QA Test Plan for Secure Blob Storage

**Objective:** Verify that Row Level Security (RLS) policies on the `storage.objects` table correctly enforce asset segregation and access control.

**Prerequisites:**
1.  Access to Supabase Studio or a client capable of executing Supabase Storage operations.
2.  Two authenticated users: `User A` and `User B`.
3.  Two Assets: `Asset 1` (Owned by `User A`), `Asset 2` (Owned by `User B`).

---

## Test Case 1: Isolation Test (Data Segregation)
**Goal:** Verify that `User A` cannot list or access files belonging to `Asset 2` (controlled by `User B`) without explicit permission.

1.  **Login as `User A`**.
2.  **Action:** Attempt to list files in the folder `{Asset 2 UUID}/`.
    *   *Command (JS SDK):* `supabase.storage.from('raw-documents').list('{Asset 2 UUID}/')`
3.  **Expected Result:** The list should be empty or return an error (depending on error handling preference, but typically RLS filters rows so it returns empty).
4.  **Action:** Attempt to download a known file `{Asset 2 UUID}/secret.pdf`.
    *   *Command (JS SDK):* `supabase.storage.from('raw-documents').download('{Asset 2 UUID}/secret.pdf')`
5.  **Expected Result:** The request should fail (e.g., 400 Bad Request or 404 Not Found), confirming that the row is not visible.

---

## Test Case 2: Upload Permission & Path Validation
**Goal:** Verify that `User A` can only upload to assets they control (`EDITOR` or `OWNER`) and that strict path validation is enforced.

1.  **Login as `User A`**.
2.  **Action (Valid Upload):** Upload a file `test.pdf` to `{Asset 1 UUID}/test.pdf`.
    *   *Expected Result:* Success.
3.  **Action (Unauthorized Path):** Attempt to upload `test.pdf` to `{Asset 2 UUID}/hack.pdf`.
    *   *Expected Result:* Failure (RLS violation).
4.  **Action (Invalid Path Structure):** Attempt to upload `test.pdf` to `root-file.pdf` (no Asset ID folder).
    *   *Expected Result:* Failure (Path regex mismatch).
5.  **Action (Invalid Path Structure):** Attempt to upload `test.pdf` to `invalid-uuid/test.pdf`.
    *   *Expected Result:* Failure (Regex mismatch or Access Grant check failure).

---

## Test Case 3: MIME Type Constraint
**Goal:** Verify that only allowed file types (`application/pdf`, `text/csv`) can be uploaded.

1.  **Login as `User A`**.
2.  **Action:** Attempt to upload an image `photo.jpg` (MIME: `image/jpeg`) to `{Asset 1 UUID}/photo.jpg`.
    *   *Expected Result:* Failure (Row Level Security violation due to metadata check).
3.  **Action:** Attempt to upload a ZIP file `archive.zip` (MIME: `application/zip`) to `{Asset 1 UUID}/archive.zip`.
    *   *Expected Result:* Failure.
4.  **Action:** Upload a CSV file `data.csv` (MIME: `text/csv`) to `{Asset 1 UUID}/data.csv`.
    *   *Expected Result:* Success.

---

## Test Case 4: Read Permission (Read Only)
**Goal:** Verify that a user with `READ_ONLY` access can view/download but not upload.

1.  **Setup:** Grant `User A` `READ_ONLY` permission on `Asset 2`.
2.  **Login as `User A`**.
3.  **Action (View):** List files in `{Asset 2 UUID}/`.
    *   *Expected Result:* Success (Files visible).
4.  **Action (Download):** Download a file from `{Asset 2 UUID}/`.
    *   *Expected Result:* Success.
5.  **Action (Upload):** Attempt to upload a new file to `{Asset 2 UUID}/`.
    *   *Expected Result:* Failure (Permission level check fails).
