import type { ApiKeyResponse, AuthValidateRequest, AuthValidateResponse, ConfigResponse } from '@/types';

const API_BASE = '/api';

export async function fetchStoredApiKey(): Promise<ApiKeyResponse> {
  const response = await fetch(`${API_BASE}/api-key`);
  if (!response.ok) {
    throw new Error('Failed to fetch API key status');
  }
  return response.json();
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
}

export async function validateAuth(request: AuthValidateRequest): Promise<AuthValidateResponse> {
  const response = await fetch(`${API_BASE}/auth/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error('Failed to validate auth');
  }
  return response.json();
}

export async function resetEnvironment(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to reset environment');
  }
  return response.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('API is not healthy');
  }
  return response.json();
}
