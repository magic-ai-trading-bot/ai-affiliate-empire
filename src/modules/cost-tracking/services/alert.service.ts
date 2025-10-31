import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { BudgetAlert } from '@prisma/client';
import { ALERT_MESSAGES } from '../constants/pricing.constants';
import { NotificationResult } from '../interfaces/alert-config.interface';
import axios from 'axios';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send budget alert via configured channels
   */
  async sendAlert(alert: BudgetAlert, config: any): Promise<NotificationResult> {
    const result: NotificationResult = {};

    // Send email if enabled
    if (config.emailAlerts && config.emailRecipients?.length > 0) {
      result.email = await this.sendEmailAlert(alert, config.emailRecipients);
    }

    // Send Slack if enabled
    if (config.slackAlerts && config.slackWebhookUrl) {
      result.slack = await this.sendSlackAlert(alert, config.slackWebhookUrl);
    }

    // Update alert record with notification status
    await this.prisma.budgetAlert.update({
      where: { id: alert.id },
      data: {
        emailSent: result.email?.success || false,
        slackSent: result.slack?.success || false,
        notificationError: result.email?.error || result.slack?.error || null,
      },
    });

    return result;
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    alert: BudgetAlert,
    recipients: string[],
  ): Promise<{ success: boolean; recipients: string[]; error?: string }> {
    try {
      this.logger.log(`Sending email alert to ${recipients.length} recipients`);

      const subject = this.getEmailSubject(alert.level);
      const body = this.formatEmailBody(alert);

      // TODO: Integrate with actual email service (AWS SES or SendGrid)
      // For now, just log the email content
      this.logger.warn(`
        EMAIL ALERT:
        To: ${recipients.join(', ')}
        Subject: ${subject}
        Body: ${body}
      `);

      // In production, use email service:
      // await this.emailService.send({
      //   to: recipients,
      //   subject,
      //   html: body,
      // });

      return {
        success: true,
        recipients,
      };
    } catch (error) {
      this.logger.error(`Failed to send email alert: ${error.message}`);
      return {
        success: false,
        recipients,
        error: error.message,
      };
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    alert: BudgetAlert,
    webhookUrl: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log('Sending Slack alert');

      const payload = {
        text: this.getSlackTitle(alert.level),
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: this.getSlackTitle(alert.level),
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Current Spend:*\n$${Number(alert.currentSpend).toFixed(2)}`,
              },
              {
                type: 'mrkdwn',
                text: `*Budget Limit:*\n$${Number(alert.budgetLimit).toFixed(2)}`,
              },
              {
                type: 'mrkdwn',
                text: `*Percentage Used:*\n${alert.percentUsed}%`,
              },
              {
                type: 'mrkdwn',
                text: `*Alert Level:*\n${alert.level}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: alert.message,
            },
          },
        ],
      };

      // Add actions taken if any
      if (alert.actionsTaken && Array.isArray(alert.actionsTaken) && alert.actionsTaken.length > 0) {
        payload.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Actions Taken:*\n${alert.actionsTaken.map((a: any) => `• ${a.action}: ${a.message}`).join('\n')}`,
          },
        });
      }

      await axios.post(webhookUrl, payload);

      this.logger.log('Slack alert sent successfully');
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send Slack alert: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get email subject based on alert level
   */
  private getEmailSubject(level: string): string {
    switch (level) {
      case 'WARNING':
        return ALERT_MESSAGES.WARNING.subject;
      case 'CRITICAL':
        return ALERT_MESSAGES.CRITICAL.subject;
      case 'EMERGENCY':
        return ALERT_MESSAGES.EMERGENCY.subject;
      default:
        return '📊 Budget Alert';
    }
  }

  /**
   * Format email body with HTML
   */
  private formatEmailBody(alert: BudgetAlert): string {
    const currentSpend = Number(alert.currentSpend).toFixed(2);
    const budgetLimit = Number(alert.budgetLimit).toFixed(2);

    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${this.getAlertColor(alert.level)}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">${this.getEmailSubject(alert.level)}</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>${alert.message}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Current Spend:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${currentSpend}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Budget Limit:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${budgetLimit}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Percentage Used:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.percentUsed}%</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Alert Level:</strong></td>
                <td style="padding: 10px;">${alert.level}</td>
              </tr>
            </table>

            ${alert.actionsTaken && Array.isArray(alert.actionsTaken) && alert.actionsTaken.length > 0 ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <h3 style="margin-top: 0;">Actions Taken:</h3>
                <ul>
                  ${alert.actionsTaken.map((a: any) => `<li><strong>${a.action}</strong>: ${a.message}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              Alert generated at ${alert.createdAt.toISOString()}<br>
              Period: ${new Date(alert.periodStart).toLocaleDateString()} - ${new Date(alert.periodEnd).toLocaleDateString()}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get Slack title with emoji
   */
  private getSlackTitle(level: string): string {
    switch (level) {
      case 'WARNING':
        return '⚠️ Budget Warning Alert';
      case 'CRITICAL':
        return '🚨 Budget Critical Alert';
      case 'EMERGENCY':
        return '🔴 BUDGET EMERGENCY!';
      default:
        return '📊 Budget Alert';
    }
  }

  /**
   * Get alert color for styling
   */
  private getAlertColor(level: string): string {
    switch (level) {
      case 'WARNING':
        return '#f59e0b'; // Yellow
      case 'CRITICAL':
        return '#ef4444'; // Red
      case 'EMERGENCY':
        return '#dc2626'; // Dark Red
      default:
        return '#3b82f6'; // Blue
    }
  }

  /**
   * Test alert channels
   */
  async testAlertChannels(config: any): Promise<{ email?: boolean; slack?: boolean }> {
    const result: { email?: boolean; slack?: boolean } = {};

    // Test email
    if (config.emailAlerts && config.emailRecipients?.length > 0) {
      const testAlert: Partial<BudgetAlert> = {
        level: 'WARNING' as any,
        currentSpend: 100 as any,
        budgetLimit: 412 as any,
        percentUsed: 24,
        message: 'This is a test alert',
        createdAt: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
      };

      const emailResult = await this.sendEmailAlert(
        testAlert as BudgetAlert,
        config.emailRecipients,
      );
      result.email = emailResult.success;
    }

    // Test Slack
    if (config.slackAlerts && config.slackWebhookUrl) {
      const testAlert: Partial<BudgetAlert> = {
        level: 'WARNING' as any,
        currentSpend: 100 as any,
        budgetLimit: 412 as any,
        percentUsed: 24,
        message: 'This is a test alert',
        createdAt: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
      };

      const slackResult = await this.sendSlackAlert(
        testAlert as BudgetAlert,
        config.slackWebhookUrl,
      );
      result.slack = slackResult.success;
    }

    return result;
  }
}
