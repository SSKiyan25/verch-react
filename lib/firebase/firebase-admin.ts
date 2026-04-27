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
