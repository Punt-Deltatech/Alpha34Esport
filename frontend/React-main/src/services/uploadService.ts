import { apiClient } from '../lib/apiClient';
import type { ApiSuccess } from '../types/api';

// Shared local-disk upload endpoint used by Portfolio, Application.document_url,
// MatchResult.proof_image_url and PaymentEvidence — POST the file once here,
// then pass the returned file_path into whichever service call needs it.

export interface UploadedFile {
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string; // e.g. "/uploads/1699999999_resume.pdf" — resolve against the API's origin to render/download it
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post<ApiSuccess<UploadedFile>>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
