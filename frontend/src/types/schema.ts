import { z } from "zod";

// Frontend-safe types (no drizzle imports)

// Auth-specific schemas
export const emailSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

// Types (frontend-safe versions)
export type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  password: string | null;
  emailVerified: boolean | null;
  isOnline: boolean | null;
  lastSeen: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'file' | 'image';
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  edited: boolean | null;
  createdAt: Date | null;
  editedAt: Date | null;
};

export type TypingStatus = {
  id: string;
  conversationId: string;
  userId: string;
  isTyping: boolean;
  updatedAt: Date | null;
};

// Auth-specific types
export type EmailSignup = z.infer<typeof emailSignupSchema>;
export type EmailLogin = z.infer<typeof emailLoginSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;