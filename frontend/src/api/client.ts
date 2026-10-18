const API_BASE = window.location.port === '5173' ? '/api' : (window.location.origin.includes('localhost') ? 'http://localhost:8000/api' : '/api');

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Remove leading slash if any
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  try {
    const res = await fetch(`${API_BASE}${cleanEndpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('bovet:auth-expired'));
    }

    if (!res.ok) {
      // Try fallback to root /api/v1 or direct endpoint
      if (res.status === 404 && !endpoint.includes('api/v1')) {
        const altRes = await fetch(`http://localhost:8000/api/v1${cleanEndpoint}`, {
          ...options,
          headers
        });
        if (altRes.ok) return await altRes.json();
      }
      
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || errData.message || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    console.warn(`API call ${cleanEndpoint} failed:`, error.message);
    throw error;
  }
}

export { API_BASE };
