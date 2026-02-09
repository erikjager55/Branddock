type ApiResponse<T> = {
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || "An error occurred",
      response.status,
      data.code
    );
  }

  return data as T;
}

function buildUrl(path: string, params?: Record<string, string | number | undefined | null>) {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

const api = {
  get: <T>(path: string, params?: Record<string, string | number | undefined | null>) =>
    fetchApi<T>(buildUrl(path, params)),

  post: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, { method: "POST", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T = { success: boolean }>(path: string) =>
    fetchApi<T>(path, { method: "DELETE" }),
};

export { fetchApi, api, ApiError };
export type { ApiResponse, PaginatedResponse };
