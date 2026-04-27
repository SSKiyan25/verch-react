import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // This one block now works perfectly for BOTH Local and Production
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // We keep the replace() just in case Vercel escapes the standalone key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const storage = admin.storage();
export { storage };
