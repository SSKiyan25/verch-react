import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // Decode the Base64 string safely back into a multiline PEM format
  const privateKey = Buffer.from(
    process.env.FIREBASE_PRIVATE_KEY_BASE64 || "",
    "base64",
  ).toString("ascii");

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
