export enum ComponentStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}

export interface ComponentHealth {
  status: ComponentStatus;
  message?: string;
  details?: Record<string, any>;
  lastCheck?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  components: {
    database: ComponentHealth;
    temporal: ComponentHealth;
    externalApis: ComponentHealth;
  };
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}
