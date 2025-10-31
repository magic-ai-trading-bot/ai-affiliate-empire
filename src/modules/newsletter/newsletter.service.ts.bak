import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export interface SubscribeDto {
  email: string;
  source?: string;
  referrer?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConfirmSubscriptionDto {
  token: string;
}

export interface UnsubscribeDto {
  token: string;
}

@Injectable()
export class NewsletterService {
  /**
   * Subscribe a new email to the newsletter
   * Implements double opt-in: sends confirmation email
   */
  async subscribe(dto: SubscribeDto): Promise<{ message: string; requiresConfirmation: boolean }> {
    const { email, source, referrer, ipAddress, userAgent } = dto;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email address');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // If already confirmed, return friendly message
      if (existing.status === SubscriptionStatus.CONFIRMED) {
        return {
          message: 'You are already subscribed to our newsletter!',
          requiresConfirmation: false,
        };
      }

      // If pending, resend confirmation
      if (existing.status === SubscriptionStatus.PENDING) {
        await this.resendConfirmation(normalizedEmail);
        return {
          message: 'Confirmation email resent! Please check your inbox.',
          requiresConfirmation: true,
        };
      }

      // If unsubscribed, allow resubscription
      if (existing.status === SubscriptionStatus.UNSUBSCRIBED) {
        const confirmToken = this.generateToken();
        const confirmTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.newsletterSubscriber.update({
          where: { email: normalizedEmail },
          data: {
            status: SubscriptionStatus.PENDING,
            confirmToken,
            confirmTokenExpiry,
            unsubscribedAt: null,
            source: source || existing.source,
            referrer: referrer || existing.referrer,
            ipAddress: ipAddress || existing.ipAddress,
            userAgent: userAgent || existing.userAgent,
          },
        });

        // Send confirmation email
        await this.sendConfirmationEmail(normalizedEmail, confirmToken);

        return {
          message: 'Welcome back! Please confirm your subscription by checking your email.',
          requiresConfirmation: true,
        };
      }
    }

    // Create new subscriber
    const confirmToken = this.generateToken();
    const confirmTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const unsubscribeToken = this.generateToken();

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        status: SubscriptionStatus.PENDING,
        confirmToken,
        confirmTokenExpiry,
        unsubscribeToken,
        source,
        referrer,
        ipAddress,
        userAgent,
      },
    });

    // Send confirmation email
    await this.sendConfirmationEmail(normalizedEmail, confirmToken);

    return {
      message: 'Success! Please check your email to confirm your subscription.',
      requiresConfirmation: true,
    };
  }

  /**
   * Confirm subscription via token
   */
  async confirmSubscription(dto: ConfirmSubscriptionDto): Promise<{ message: string; success: boolean }> {
    const { token } = dto;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('Invalid or expired confirmation token');
    }

    // Check if token expired
    if (subscriber.confirmTokenExpiry && subscriber.confirmTokenExpiry < new Date()) {
      throw new BadRequestException('Confirmation token has expired. Please request a new confirmation email.');
    }

    // Already confirmed
    if (subscriber.status === SubscriptionStatus.CONFIRMED) {
      return {
        message: 'Your subscription is already confirmed!',
        success: true,
      };
    }

    // Confirm subscription
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: SubscriptionStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmToken: null,
        confirmTokenExpiry: null,
      },
    });

    return {
      message: 'Thank you! Your subscription has been confirmed.',
      success: true,
    };
  }

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribe(dto: UnsubscribeDto): Promise<{ message: string; success: boolean }> {
    const { token } = dto;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('Invalid unsubscribe token');
    }

    // Already unsubscribed
    if (subscriber.status === SubscriptionStatus.UNSUBSCRIBED) {
      return {
        message: 'You have already unsubscribed from our newsletter.',
        success: true,
      };
    }

    // Unsubscribe
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: SubscriptionStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
      },
    });

    return {
      message: 'You have been successfully unsubscribed. We are sorry to see you go!',
      success: true,
    };
  }

  /**
   * Get subscriber statistics
   */
  async getStats(): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    unsubscribed: number;
    bounced: number;
  }> {
    const [total, confirmed, pending, unsubscribed, bounced] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { status: SubscriptionStatus.CONFIRMED } }),
      prisma.newsletterSubscriber.count({ where: { status: SubscriptionStatus.PENDING } }),
      prisma.newsletterSubscriber.count({ where: { status: SubscriptionStatus.UNSUBSCRIBED } }),
      prisma.newsletterSubscriber.count({ where: { status: SubscriptionStatus.BOUNCED } }),
    ]);

    return {
      total,
      confirmed,
      pending,
      unsubscribed,
      bounced,
    };
  }

  /**
   * Private helper methods
   */

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async resendConfirmation(email: string): Promise<void> {
    const confirmToken = this.generateToken();
    const confirmTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        confirmToken,
        confirmTokenExpiry,
      },
    });

    await this.sendConfirmationEmail(email, confirmToken);
  }

  private async sendConfirmationEmail(email: string, token: string): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log the confirmation link
    const confirmUrl = `${process.env.BLOG_URL || 'http://localhost:3002'}/newsletter/confirm?token=${token}`;

    console.log(`[Newsletter] Confirmation email for ${email}:`);
    console.log(`[Newsletter] Confirm at: ${confirmUrl}`);

    // In production, send actual email:
    // await this.emailService.send({
    //   to: email,
    //   subject: 'Confirm your newsletter subscription',
    //   html: this.getConfirmationEmailTemplate(confirmUrl),
    // });
  }

  private getConfirmationEmailTemplate(confirmUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Your Subscription</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to AI Affiliate Empire!</h1>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Confirm Your Subscription</h2>

            <p>Thank you for subscribing to our newsletter! You'll receive exclusive AI strategies, insider tips, and curated product recommendations.</p>

            <p>Please confirm your email address by clicking the button below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Confirm Subscription
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #667eea; word-break: break-all;">${confirmUrl}</a>
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This confirmation link will expire in 24 hours.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't subscribe to this newsletter, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}
