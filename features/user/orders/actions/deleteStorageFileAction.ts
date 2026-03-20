"use server";

import { deleteStorageFile } from "@/lib/firebase/storage-helpers";

/**
 * Server action wrapper for deleteStorageFile.
 * Called from client hooks as cleanup when a Firebase upload succeeds
 * but the subsequent DB operation fails.
 */
export async function deleteStorageFileAction(path: string): Promise<void> {
  await deleteStorageFile(path);
}
