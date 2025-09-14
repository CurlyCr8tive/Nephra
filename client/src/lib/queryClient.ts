import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF token cache - cleared on logout for security
let csrfToken: string | null = null;

// Clear CSRF token cache (called during logout)
export function clearCSRFTokenCache() {
  csrfToken = null;
  console.log("🧹 CSRF token cache cleared");
}

// Fetch CSRF token from server
async function fetchCSRFToken(): Promise<string> {
  try {
    const res = await fetch('/api/csrf', {
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch CSRF token: ${res.status}`);
    }
    
    const { csrfToken } = await res.json();
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
}

// Get CSRF token (with caching)
async function getCSRFToken(): Promise<string> {
  if (!csrfToken) {
    csrfToken = await fetchCSRFToken();
  }
  return csrfToken;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`API Request: ${method} ${url}`, data);
    
    // Prepare headers
    const headers: Record<string, string> = {};
    
    // Add JSON content type for requests with data
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    // Add CSRF token for mutating requests
    const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    if (isMutatingRequest) {
      try {
        const token = await getCSRFToken();
        headers["X-CSRF-Token"] = token;
        console.log(`🛡️ Added CSRF token to ${method} ${url}`);
      } catch (csrfError) {
        console.warn(`⚠️ Could not get CSRF token for ${method} ${url}:`, csrfError);
        // Continue without CSRF token - let server-side Origin/Referer checks handle it
      }
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    // If CSRF token is invalid (403), clear cache and retry once
    if (res.status === 403 && isMutatingRequest && csrfToken) {
      console.log(`🔄 CSRF token possibly expired, retrying ${method} ${url}`);
      csrfToken = null; // Clear cached token
      
      try {
        const newToken = await getCSRFToken();
        headers["X-CSRF-Token"] = newToken;
        
        const retryRes = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        if (retryRes.ok) {
          console.log(`✅ CSRF retry successful: ${method} ${url}`);
          return retryRes;
        }
      } catch (retryError) {
        console.error(`Failed CSRF retry for ${method} ${url}:`, retryError);
      }
    }
    
    // Log response status
    console.log(`API Response: ${method} ${url} - Status: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error (${res.status}): ${errorText}`);
      throw new Error(`${res.status}: ${errorText}`);
    }
    
    return res;
  } catch (error) {
    console.error(`API Request Failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // SECURITY FIX: Remove staleTime: Infinity to prevent cross-user data persistence
      // Use 5 minutes instead of infinity to ensure data expires and doesn't leak between users
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Allow data to be considered fresh for a reasonable time, but not forever
      gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Utility function to clear all user-specific queries
export function clearUserSpecificQueries(userId?: number | null) {
  if (!userId) {
    // If no specific user ID, clear everything for safety
    queryClient.clear();
    console.log("🧹 Cleared all queries (no specific user ID provided)");
    return;
  }

  // Clear queries that contain the specific user ID
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKeyString = JSON.stringify(query.queryKey);
      return queryKeyString.includes(`${userId}`);
    }
  });

  // Also remove the queries from cache entirely
  queryClient.removeQueries({
    predicate: (query) => {
      const queryKeyString = JSON.stringify(query.queryKey);
      return queryKeyString.includes(`${userId}`);
    }
  });
  
  console.log(`🧹 Cleared all queries for user ID: ${userId}`);
}
