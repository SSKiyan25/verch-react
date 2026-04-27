import * as admin from "firebase-admin";

function formatPrivateKey(key: string): string {
  // Remove surrounding quotes if present
  const stripped = key.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  // Replace literal \n with real newlines
  return stripped.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY ?? "");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const storage = admin.storage();

export { storage };
