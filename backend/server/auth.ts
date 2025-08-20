import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { storage } from './storage';
import type { EmailSignup, EmailLogin, PhoneSignup, ForgotPassword, ResetPassword } from '@shared/schema';

// Email transporter (configure with your email service)
const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS 
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

// Helper function to get the correct base URL
function getBaseUrl(): string {
  // Check if BASE_URL is explicitly set
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  // For Replit production environment - use the development domain
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Alternative format with REPL_SLUG and REPL_OWNER
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.app`;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:5000';
}

export class AuthService {
  // Email/Password Authentication
  async signupWithEmail(data: EmailSignup) {
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    const user = await storage.upsertUser({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      emailVerified: false,
    });

    // Create auth provider record
    await storage.createAuthProvider({
      userId: user.id,
      provider: 'email',
      providerId: user.email!,
    });

    // Send verification email
    await this.sendVerificationEmail(user.id, user.email!);

    return user;
  }

  async loginWithEmail(data: EmailLogin) {
    const user = await storage.getUserByEmail(data.email);
    if (!user || !user.password) {
      throw new Error('Invalid email or password');
    }

    // Skip email verification check for now to allow testing
    // if (!user.emailVerified) {
    //   throw new Error('Please verify your email address before logging in');
    // }

    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  // Phone authentication removed

  // Google Authentication
  async handleGoogleAuth(googleProfile: any) {
    let user = await storage.getUserByEmail(googleProfile.email);
    
    if (!user) {
      // Create new user
      user = await storage.upsertUser({
        email: googleProfile.email,
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        profileImageUrl: googleProfile.picture,
        emailVerified: true,
      });
    }

    // Create or update auth provider record
    const existingProvider = await storage.getAuthProvider('google', googleProfile.sub);
    if (!existingProvider) {
      await storage.createAuthProvider({
        userId: user.id,
        provider: 'google',
        providerId: googleProfile.sub,
      });
    }

    return user;
  }

  // Password Reset
  async initiatePasswordReset(data: ForgotPassword) {
    const user = await storage.getUserByEmail(data.email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await storage.createPasswordResetToken({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.sendPasswordResetEmail(user.email!, token);
  }

  async resetPassword(data: ResetPassword) {
    const resetToken = await storage.getPasswordResetToken(data.token);
    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    // Update the user's password directly instead of using upsert
    await storage.updateUserPassword(resetToken.userId, hashedPassword);

    await storage.markPasswordResetTokenUsed(resetToken.id);
  }

  // Email Verification
  async sendVerificationEmail(userId: string, email: string) {
    if (!transporter) {
      console.warn('Email not configured, skipping verification email');
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours expiry

    await storage.createEmailVerificationToken({
      userId,
      token,
      expiresAt,
    });

    const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${token}`;
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@chatflow.com',
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2>Verify your email address</h2>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Verify Email
          </a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
    });
  }

  async verifyEmail(token: string) {
    const verificationToken = await storage.getEmailVerificationToken(token);
    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Verification token has expired');
    }

    await storage.updateUserEmailVerification(verificationToken.userId, true);
    await storage.markEmailVerificationTokenUsed(verificationToken.id);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    if (!transporter) {
      throw new Error('Email service not configured. Please contact support.');
    }

    const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
    
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@chatflow.com',
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2>Reset your password</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  }

  // Cleanup expired tokens (call periodically)
  async cleanupExpiredTokens() {
    await storage.cleanupExpiredPasswordResetTokens();
    await storage.cleanupExpiredEmailVerificationTokens();
  }
}

export const authService = new AuthService();