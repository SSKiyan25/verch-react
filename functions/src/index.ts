/**
 * Firebase Cloud Functions Entry Point
 *
 * Export all Cloud Functions from this file.
 * Each function is deployed independently but defined here for Firebase CLI discovery.
 */

import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK
initializeApp();

// Payment verification functions
export { handlePaymentScreenshotUpload } from "./payments";
