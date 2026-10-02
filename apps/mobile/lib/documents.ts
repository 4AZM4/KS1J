import type { DocumentPickerAsset } from 'expo-document-picker';

import { uploadProblem } from '@ks1j/shared';

import { supabase } from '@/lib/supabase';

/**
 * Uploads a picked file into the member's own private folder in the `documents` bucket
 * (only they and Jamaat staff can read it) and returns its storage path.
 */
export async function uploadToMyFolder(userId: string, file: DocumentPickerAsset, prefix: string): Promise<string> {
  // Plain words instead of a storage error for files the private bucket would refuse.
  const problem = uploadProblem(file.size, file.mimeType, file.name);
  if (problem) throw new Error(problem);
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const body = await (await fetch(file.uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('documents')
    .upload(path, body, { contentType: file.mimeType ?? 'application/pdf' });
  if (error) throw error;
  return path;
}
