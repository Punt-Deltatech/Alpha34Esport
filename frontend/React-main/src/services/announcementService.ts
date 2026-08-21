import { apiClient } from '../lib/apiClient';
import type { ApiSuccess, Banner, News } from '../types/api';

// Module 10: PR & Announcement

export async function listBanners(): Promise<Banner[]> {
  const res = await apiClient.get<ApiSuccess<Banner[]>>('/banners');
  return res.data.data;
}

export async function listNews(): Promise<News[]> {
  const res = await apiClient.get<ApiSuccess<News[]>>('/news');
  return res.data.data;
}

export async function createNews(payload: {
  title: string;
  content?: string;
  category?: string;
  is_pinned?: boolean;
}): Promise<News> {
  const res = await apiClient.post<ApiSuccess<News>>('/news', payload);
  return res.data.data;
}
