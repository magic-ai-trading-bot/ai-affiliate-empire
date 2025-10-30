import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'prom-client';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;

  // Business metrics
  private readonly productsSyncedCounter: client.Counter;
  private readonly videosGeneratedCounter: client.Counter;
  private readonly apiCostGauge: client.Gauge;
  private readonly workflowDurationHistogram: client.Histogram;
  private readonly revenueGauge: client.Gauge;
  private readonly activeProductsGauge: client.Gauge;

  // Technical metrics
  private readonly httpRequestDuration: client.Histogram;
  private readonly httpRequestTotal: client.Counter;
  private readonly httpRequestErrors: client.Counter;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MetricsService');
    this.register = new client.Registry();

    // Set default labels
    this.register.setDefaultLabels({
      app: 'ai-affiliate-empire',
      environment: this.configService.get<string>('NODE_ENV') || 'production',
    });

    // Initialize business metrics
    this.productsSyncedCounter = new client.Counter({
      name: 'affiliate_products_synced_total',
      help: 'Total number of products synced from affiliate networks',
      labelNames: ['platform', 'network'],
      registers: [this.register],
    });

    this.videosGeneratedCounter = new client.Counter({
      name: 'affiliate_videos_generated_total',
      help: 'Total number of videos generated',
      labelNames: ['platform', 'content_type'],
      registers: [this.register],
    });

    this.apiCostGauge = new client.Gauge({
      name: 'affiliate_api_cost_dollars',
      help: 'Current API costs in dollars',
      labelNames: ['service', 'operation'],
      registers: [this.register],
    });

    this.workflowDurationHistogram = new client.Histogram({
      name: 'affiliate_workflow_duration_seconds',
      help: 'Workflow execution duration in seconds',
      labelNames: ['workflow_name', 'status'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
      registers: [this.register],
    });

    this.revenueGauge = new client.Gauge({
      name: 'affiliate_revenue_dollars',
      help: 'Current revenue in dollars',
      labelNames: ['platform', 'product_category'],
      registers: [this.register],
    });

    this.activeProductsGauge = new client.Gauge({
      name: 'affiliate_active_products',
      help: 'Number of active products being promoted',
      labelNames: ['platform', 'status'],
      registers: [this.register],
    });

    // Initialize technical metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    this.httpRequestErrors = new client.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    // Collect default metrics (CPU, memory, event loop, etc.)
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'nodejs_',
    });

    this.logger.log('Prometheus metrics initialized');
  }

  // Business metric methods
  incrementProductsSynced(
    count: number = 1,
    labels: { platform: string; network: string },
  ): void {
    this.productsSyncedCounter.inc(labels, count);
  }

  incrementVideosGenerated(
    count: number = 1,
    labels: { platform: string; contentType: string },
  ): void {
    this.videosGeneratedCounter.inc(
      { platform: labels.platform, content_type: labels.contentType },
      count,
    );
  }

  setApiCost(
    cost: number,
    labels: { service: string; operation: string },
  ): void {
    this.apiCostGauge.set(labels, cost);
  }

  incrementApiCost(
    amount: number,
    labels: { service: string; operation: string },
  ): void {
    this.apiCostGauge.inc(labels, amount);
  }

  recordWorkflowDuration(
    durationSeconds: number,
    labels: { workflowName: string; status: string },
  ): void {
    this.workflowDurationHistogram.observe(
      { workflow_name: labels.workflowName, status: labels.status },
      durationSeconds,
    );
  }

  setRevenue(
    revenue: number,
    labels: { platform: string; productCategory: string },
  ): void {
    this.revenueGauge.set(
      { platform: labels.platform, product_category: labels.productCategory },
      revenue,
    );
  }

  incrementRevenue(
    amount: number,
    labels: { platform: string; productCategory: string },
  ): void {
    this.revenueGauge.inc(
      { platform: labels.platform, product_category: labels.productCategory },
      amount,
    );
  }

  setActiveProducts(
    count: number,
    labels: { platform: string; status: string },
  ): void {
    this.activeProductsGauge.set(labels, count);
  }

  // Technical metric methods
  recordHttpRequest(
    durationSeconds: number,
    labels: { method: string; route: string; status: number },
  ): void {
    const labelValues = {
      method: labels.method,
      route: labels.route,
      status: labels.status.toString(),
    };

    this.httpRequestDuration.observe(labelValues, durationSeconds);
    this.httpRequestTotal.inc(labelValues);

    // Track errors (4xx and 5xx)
    if (labels.status >= 400) {
      this.httpRequestErrors.inc({
        method: labels.method,
        route: labels.route,
        error_type: labels.status >= 500 ? 'server_error' : 'client_error',
      });
    }
  }

  incrementHttpErrors(labels: {
    method: string;
    route: string;
    errorType: string;
  }): void {
    this.httpRequestErrors.inc({
      method: labels.method,
      route: labels.route,
      error_type: labels.errorType,
    });
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  // Get metrics as JSON (for debugging)
  async getMetricsAsJSON(): Promise<any> {
    return this.register.getMetricsAsJSON();
  }

  // Reset all metrics (useful for testing)
  resetMetrics(): void {
    this.register.resetMetrics();
  }

  // Get the registry (useful for custom integrations)
  getRegistry(): client.Registry {
    return this.register;
  }
}
