import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from '../lib/firebase';

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

export interface EvidenceUploadResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  contentType: string;
}

export function validateEvidenceFile(file: File): string | null {
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return 'El archivo supera el límite de 8 MB permitido.';
  }
  if (file.type && !ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type)) {
    return 'Formato no soportado. Usa una imagen (JPG, PNG, WEBP) o un PDF.';
  }
  return null;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Uploads a mission evidence file to Firebase Storage under
 * `evidences/{studentId}/{missionId}/{timestamp}_{fileName}` and resolves
 * with its public download URL once the upload completes.
 */
export function uploadMissionEvidence(
  studentId: string,
  missionId: string,
  file: File,
  onProgress?: (percent: number) => void
): { cancel: () => void; result: Promise<EvidenceUploadResult> } {
  const validationError = validateEvidenceFile(file);
  if (validationError) {
    return {
      cancel: () => undefined,
      result: Promise.reject(new Error(validationError)),
    };
  }

  const storagePath = `evidences/${studentId}/${missionId}/${Date.now()}_${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  const result = new Promise<EvidenceUploadResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        if (onProgress) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percent);
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });

  return { cancel: () => uploadTask.cancel(), result };
}

export async function deleteMissionEvidence(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    console.warn('No fue posible eliminar la evidencia en Storage:', error);
  }
}
