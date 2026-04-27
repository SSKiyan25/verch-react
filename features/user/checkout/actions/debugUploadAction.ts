"use server";

export async function debugUploadAction(formData: FormData) {
  const orderId = formData.get("orderId");
  const file = formData.get("file");

  console.log("[debugUpload] orderId:", orderId);
  console.log("[debugUpload] file type:", typeof file);
  console.log("[debugUpload] file instanceof File:", file instanceof File);
  console.log("[debugUpload] file instanceof Blob:", file instanceof Blob);
  console.log(
    "[debugUpload] file name:",
    file instanceof File ? file.name : "N/A",
  );
  console.log(
    "[debugUpload] file size:",
    file instanceof File ? file.size : "N/A",
  );

  return { received: true };
}
