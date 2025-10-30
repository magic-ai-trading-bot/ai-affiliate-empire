import { Injectable } from '@nestjs/common';
import { WeeklyReportService } from './services/weekly-report.service';

@Injectable()
export class ReportsService {
  constructor(private readonly weeklyReport: WeeklyReportService) {}

  async getWeeklyReport() {
    return this.weeklyReport.generateWeeklyReport();
  }

  async getWeeklyReportHTML() {
    const report = await this.getWeeklyReport();
    return this.generateHTML(report);
  }

  private generateHTML(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Affiliate Empire - Weekly Report Week ${report.period.week}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; }
    .metric { background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #1e40af; }
    .metric-label { color: #6b7280; font-size: 14px; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: bold; }
    .recommendation { padding: 10px; margin: 5px 0; border-left: 4px solid #3b82f6; background: #eff6ff; }
  </style>
</head>
<body>
  <h1>🚀 AI Affiliate Empire - Weekly Report</h1>
  <p><strong>Period:</strong> ${report.period.start} to ${report.period.end} (Week ${report.period.week})</p>

  <h2>💰 Revenue</h2>
  <div class="metric">
    <div class="metric-value">$${report.revenue.total.toFixed(2)}</div>
    <div class="metric-label">Total Revenue</div>
    <p class="${report.revenue.growth > 0 ? 'positive' : 'negative'}">
      ${report.revenue.growth > 0 ? '↑' : '↓'} ${Math.abs(report.revenue.growth).toFixed(1)}% vs last week
    </p>
  </div>

  <h3>Revenue by Platform</h3>
  <table>
    <tr><th>Platform</th><th>Revenue</th></tr>
    ${report.revenue.byPlatform.map((p: any) => `<tr><td>${p.platform}</td><td>$${p.revenue.toFixed(2)}</td></tr>`).join('')}
  </table>

  <h3>Top Products</h3>
  <table>
    <tr><th>Product</th><th>Revenue</th></tr>
    ${report.revenue.byProduct.map((p: any) => `<tr><td>${p.productTitle}</td><td>$${p.revenue.toFixed(2)}</td></tr>`).join('')}
  </table>

  <h2>📹 Content Production</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
    <div class="metric">
      <div class="metric-value">${report.content.videosCreated}</div>
      <div class="metric-label">Videos Created</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.content.videosPublished}</div>
      <div class="metric-label">Videos Published</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.content.blogsPublished}</div>
      <div class="metric-label">Blogs Published</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.content.avgCTR.toFixed(2)}%</div>
      <div class="metric-label">Average CTR</div>
    </div>
  </div>

  <h2>📊 Performance</h2>
  <h3>Top Performers (ROI)</h3>
  <table>
    <tr><th>Product</th><th>ROI</th><th>Revenue</th></tr>
    ${report.performance.topProducts.map((p: any) => `<tr><td>${p.title}</td><td class="positive">${p.roi.toFixed(1)}%</td><td>$${p.revenue.toFixed(2)}</td></tr>`).join('')}
  </table>

  ${report.performance.worstPerformers.length > 0 ? `
  <h3>Worst Performers (to kill)</h3>
  <table>
    <tr><th>Product</th><th>ROI</th></tr>
    ${report.performance.worstPerformers.map((p: any) => `<tr><td>${p.title}</td><td class="negative">${p.roi.toFixed(1)}%</td></tr>`).join('')}
  </table>
  ` : ''}

  <h2>💸 Costs & ROI</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
    <div class="metric">
      <div class="metric-value">$${report.costs.total.toFixed(2)}</div>
      <div class="metric-label">Total Costs</div>
    </div>
    <div class="metric">
      <div class="metric-value">$${report.roi.profit.toFixed(2)}</div>
      <div class="metric-label">Profit</div>
    </div>
    <div class="metric">
      <div class="metric-value ${report.roi.overall > 100 ? 'positive' : 'negative'}">${report.roi.overall.toFixed(1)}%</div>
      <div class="metric-label">ROI</div>
    </div>
  </div>

  <h2>🎯 Optimization Actions</h2>
  <ul>
    <li>Products Killed: ${report.optimization.productsKilled}</li>
    <li>Products Scaled: ${report.optimization.productsScaled}</li>
    <li>A/B Tests Run: ${report.optimization.abTestsRun}</li>
    <li>Prompt Versions: ${report.optimization.promptVersions}</li>
  </ul>

  <h2>💡 Recommendations</h2>
  ${report.recommendations.map((r: string) => `<div class="recommendation">${r}</div>`).join('')}

  <hr style="margin: 40px 0;">
  <p style="color: #6b7280; font-size: 12px;">
    Generated automatically by AI Affiliate Empire | ${new Date().toISOString()}
  </p>
</body>
</html>
    `.trim();
  }
}
