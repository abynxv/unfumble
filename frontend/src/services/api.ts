/**
 * API service — communicates with the FastAPI backend.
 *
 * HOW THE FRONTEND COMMUNICATES WITH FASTAPI:
 * 1. Axios makes HTTP requests to our FastAPI backend.
 * 2. Every request includes the Supabase JWT in the Authorization header.
 * 3. FastAPI validates this JWT and identifies the user.
 * 4. The response is typed using TypeScript interfaces.
 *
 * WHY AXIOS (NOT FETCH):
 * Axios provides request/response interceptors, automatic JSON parsing,
 * better error handling, and request cancellation out of the box.
 * The interceptor pattern is particularly useful for automatically
 * attaching the auth token to every request.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create an Axios instance with default configuration.
// Using an instance (instead of the global axios) lets us configure
// base URL and interceptors without affecting other HTTP calls.
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 120000, // 2 minutes — AI generation can be slow
});

/**
 * Request interceptor — automatically attaches the Supabase JWT to every request.
 *
 * HOW IT WORKS:
 * Before each request leaves the browser, this interceptor:
 * 1. Gets the current Supabase session (which contains the JWT)
 * 2. Adds "Authorization: Bearer <jwt>" to the request headers
 * 3. If there's no session, the request goes without auth (will get 401)
 */
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ─── TypeScript Interfaces ──────────────────────────────────────

export interface Generation {
  id: number;
  user_id: string;
  original_image_url: string | null;
  generated_image_url: string | null;
  style: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerationListResponse {
  generations: Generation[];
  total: number;
}

export interface AdminStats {
  total_users: number;
  total_generations: number;
  completed_generations: number;
  failed_generations: number;
  pending_generations: number;
  processing_generations: number;
}

// ─── API Functions ──────────────────────────────────────────────

/**
 * Create a new generation by uploading an image and selecting a style.
 *
 * WHY FormData:
 * File uploads require multipart/form-data encoding (not JSON).
 * FormData handles the encoding automatically, and Axios sets
 * the correct Content-Type header with the boundary string.
 */
export async function createGeneration(image: File, style: string): Promise<Generation> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('style', style);

  const response = await api.post<Generation>('/generations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/** Get a specific generation by ID. */
export async function getGeneration(id: number): Promise<Generation> {
  const response = await api.get<Generation>(`/generations/${id}`);
  return response.data;
}

/** List all generations for the current user. */
export async function listGenerations(skip = 0, limit = 20): Promise<GenerationListResponse> {
  const response = await api.get<GenerationListResponse>('/generations', {
    params: { skip, limit },
  });
  return response.data;
}

/** Delete a generation. */
export async function deleteGeneration(id: number): Promise<void> {
  await api.delete(`/generations/${id}`);
}

// ─── Admin API Functions ────────────────────────────────────────

/** Get admin dashboard statistics. */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
}

/** List all generations (admin). */
export async function adminListGenerations(
  skip = 0, limit = 50, statusFilter?: string
): Promise<GenerationListResponse> {
  const response = await api.get<GenerationListResponse>('/admin/generations', {
    params: { skip, limit, status_filter: statusFilter },
  });
  return response.data;
}

/** Delete any generation (admin). */
export async function adminDeleteGeneration(id: number): Promise<void> {
  await api.delete(`/admin/generations/${id}`);
}

/** Check Hugging Face API health. */
export async function checkHFHealth(): Promise<{ huggingface_api: string; model_id: string }> {
  const response = await api.get('/admin/health/huggingface');
  return response.data;
}

export default api;
