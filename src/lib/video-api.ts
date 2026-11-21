export const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');

export type Video = {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  publishedAt: string | null;
};

export type PublicVideo = Video & { thumbnailUrl: string; playbackUrl: string };
export type VideoList<T> = { videos: T[]; page: number; hasMore: boolean };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const response = await fetch(backend + '/api/v1' + path, { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message || 'The request failed. Please try again.');
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function message(error: unknown) {
  return error instanceof ApiError ? error.message : 'Unable to reach the video service. Please try again.';
}

export function videoQuery(search: string, page: number) {
  return '?' + new URLSearchParams({ search, page: String(page) });
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}
