export interface AlertContext {
  currentSpend: number;
  budgetLimit: number;
  percentUsed: number;
  threshold: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface ActionResult {
  action: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export interface AlertConfig {
  emailAlerts: boolean;
  slackAlerts: boolean;
  emailRecipients: string[];
  slackWebhookUrl?: string;
  autoScaleDown: boolean;
  emergencyStop: boolean;
}

export interface NotificationResult {
  email?: {
    success: boolean;
    recipients: string[];
    error?: string;
  };
  slack?: {
    success: boolean;
    error?: string;
  };
}
