import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // 1. Decode safely using utf8
  // 2. FORCEFULLY .trim() any invisible trailing newlines/spaces that crash OpenSSL 3.0
  const privateKey = Buffer.from(
    process.env.FIREBASE_PRIVATE_KEY_BASE64 || "",
    "base64",
  )
    .toString("utf8")
    .trim();

  // 2. THE SANITY CHECK LOGS
  console.log("--- DEBUGGING PRIVATE KEY FORMAT ---");
  console.log(
    "Starts with expected header?",
    privateKey.startsWith("-----BEGIN PRIVATE KEY-----\n"),
  );
  console.log(
    "Ends with expected footer?",
    privateKey.trim().endsWith("-----END PRIVATE KEY-----"),
  );
  console.log("Contains actual newlines?", privateKey.includes("\n"));
  console.log("Contains literal backslash-n?", privateKey.includes("\\n"));
  console.log("Contains carriage returns?", privateKey.includes("\r"));
  console.log("Total length:", privateKey.length);
  console.log("------------------------------------");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const storage = admin.storage();
export { storage };
