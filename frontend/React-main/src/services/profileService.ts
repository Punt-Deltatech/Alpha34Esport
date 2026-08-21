import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Profile, Role } from '../types/api';

// Module 1 (Auth) + Module 2 (RBAC). Sign-up/sign-in/OAuth themselves go
// through supabaseClient directly (see hooks/useAuth.tsx) — everything here
// is the `public.profiles` / `roles` side on the Go backend.

export async function getMe(): Promise<Profile> {
  const res = await apiClient.get<ApiSuccess<Profile>>('/me');
  return res.data.data;
}

export async function updateMe(payload: Partial<Pick<Profile, 'name' | 'gender' | 'phone_number' | 'profile_image_url'>>): Promise<Profile> {
  const res = await apiClient.put<ApiSuccess<Profile>>('/me', payload);
  return res.data.data;
}

// Admin only (RequireRole("Admin") on the backend)
export async function listProfiles(): Promise<Profile[]> {
  const res = await apiClient.get<ApiSuccess<Profile[]>>('/profiles');
  return res.data.data;
}

export async function getProfile(id: string): Promise<Profile> {
  const res = await apiClient.get<ApiSuccess<Profile>>(`/profiles/${id}`);
  return res.data.data;
}

export async function assignRole(profileId: string, roleId: string): Promise<Profile> {
  const res = await apiClient.put<ApiSuccess<Profile>>(`/profiles/${profileId}/role`, { role_id: roleId });
  return res.data.data;
}

export async function setProfileStatus(profileId: string, status: 'active' | 'suspended'): Promise<Profile> {
  const res = await apiClient.put<ApiSuccess<Profile>>(`/profiles/${profileId}/status`, { status });
  return res.data.data;
}

export async function listRoles(): Promise<Role[]> {
  const res = await apiClient.get<ApiSuccess<Role[]>>('/roles');
  return res.data.data;
}
