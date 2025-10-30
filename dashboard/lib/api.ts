const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchAPI(endpoint: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export async function postAPI(endpoint: string, data: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Dashboard API endpoints
export const dashboardAPI = {
  getOverview: () => fetchAPI('/analytics/overview'),
  getRevenue: (days: number) => fetchAPI(`/analytics/revenue?days=${days}`),
  getTopProducts: () => fetchAPI('/analytics/top-products'),
  getPlatforms: () => fetchAPI('/analytics/platforms'),
  getROI: () => fetchAPI('/analytics/roi'),
  getRecommendations: () => fetchAPI('/optimizer/recommendations'),
  getABTests: () => fetchAPI('/optimizer/ab-tests'),
  startWorkflow: () => postAPI('/orchestrator/start', {}),
};
