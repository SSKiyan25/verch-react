import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // SAFETY CHECK: This will throw a clear error in Vercel if the variable is missing
  if (!process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    console.error(
      "CRITICAL ERROR: FIREBASE_PRIVATE_KEY_BASE64 is missing in this environment!",
    );
  }

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
