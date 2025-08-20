import {
  users,
  conversations,
  conversationParticipants,
  messages,
  typingStatus,
  authProviders,
  passwordResetTokens,
  emailVerificationTokens,
  phoneVerificationTokens,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertConversationParticipant,
  type Message,
  type InsertMessage,
  type TypingStatus,
  type InsertTypingStatus,
  type AuthProvider,
  type InsertAuthProvider,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type PhoneVerificationToken,
  type InsertPhoneVerificationToken,
  type EmailSignup,
  type EmailLogin,
  type PhoneSignup,
  type ForgotPassword,
  type ResetPassword,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  getUsersOnlineStatus(userIds: string[]): Promise<{ [userId: string]: boolean }>;
  updateUserEmailVerification(userId: string, verified: boolean): Promise<void>;
  updateUserPhoneVerification(userId: string, verified: boolean): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;

  // Auth provider operations
  createAuthProvider(provider: InsertAuthProvider): Promise<AuthProvider>;
  getAuthProvider(provider: string, providerId: string): Promise<AuthProvider | undefined>;
  getUserAuthProviders(userId: string): Promise<AuthProvider[]>;

  // Password reset operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: string): Promise<void>;
  cleanupExpiredPasswordResetTokens(): Promise<void>;

  // Email verification operations
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(tokenId: string): Promise<void>;
  cleanupExpiredEmailVerificationTokens(): Promise<void>;

  // Phone verification removed

  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<Array<Conversation & { 
    participants: Array<ConversationParticipant & { user: User }>;
    lastMessage?: Message & { sender: User };
    unreadCount: number;
  }>>;
  addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message & { sender: User }>;
  getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<Array<Message & { sender: User }>>;
  markMessagesAsRead(conversationId: string, userId: string, lastMessageId: string): Promise<void>;

  // Typing status operations
  updateTypingStatus(typingStatusData: InsertTypingStatus): Promise<void>;
  getTypingUsers(conversationId: string, excludeUserId: string): Promise<Array<TypingStatus & { user: User }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isOnline, 
        lastSeen: isOnline ? null : new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async getUsersOnlineStatus(userIds: string[]): Promise<{ [userId: string]: boolean }> {
    const usersStatus = await db
      .select({ id: users.id, isOnline: users.isOnline })
      .from(users)
      .where(inArray(users.id, userIds));
    
    return usersStatus.reduce((acc, user) => {
      acc[user.id] = user.isOnline || false;
      return acc;
    }, {} as { [userId: string]: boolean });
  }

  async updateUserEmailVerification(userId: string, verified: boolean): Promise<void> {
    await db
      .update(users)
      .set({ emailVerified: verified, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPhoneVerification(userId: string, verified: boolean): Promise<void> {
    await db
      .update(users)
      .set({ phoneVerified: verified, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Auth provider operations
  async createAuthProvider(provider: InsertAuthProvider): Promise<AuthProvider> {
    const [newProvider] = await db
      .insert(authProviders)
      .values(provider)
      .returning();
    return newProvider;
  }

  async getAuthProvider(provider: string, providerId: string): Promise<AuthProvider | undefined> {
    const [authProvider] = await db
      .select()
      .from(authProviders)
      .where(and(eq(authProviders.provider, provider), eq(authProviders.providerId, providerId)));
    return authProvider;
  }

  async getUserAuthProviders(userId: string): Promise<AuthProvider[]> {
    return await db
      .select()
      .from(authProviders)
      .where(eq(authProviders.userId, userId));
  }

  // Password reset operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)));
    return resetToken;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  // Email verification operations
  async createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [newToken] = await db
      .insert(emailVerificationTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(and(eq(emailVerificationTokens.token, token), eq(emailVerificationTokens.used, false)));
    return verificationToken;
  }

  async markEmailVerificationTokenUsed(tokenId: string): Promise<void> {
    await db
      .update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.id, tokenId));
  }

  async cleanupExpiredEmailVerificationTokens(): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(sql`${emailVerificationTokens.expiresAt} < NOW()`);
  }

  // Phone verification removed

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async getUserConversations(userId: string): Promise<Array<Conversation & { 
    participants: Array<ConversationParticipant & { user: User }>;
    lastMessage?: Message & { sender: User };
    unreadCount: number;
  }>> {
    const userConversations = await db
      .select({
        conversation: conversations,
        participant: conversationParticipants,
        participantUser: users,
      })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(
        inArray(
          conversations.id,
          db
            .select({ id: conversationParticipants.conversationId })
            .from(conversationParticipants)
            .where(eq(conversationParticipants.userId, userId))
        )
      )
      .orderBy(desc(conversations.updatedAt));

    // Group by conversation
    const conversationMap = new Map();
    for (const row of userConversations) {
      if (!conversationMap.has(row.conversation.id)) {
        conversationMap.set(row.conversation.id, {
          ...row.conversation,
          participants: [],
          unreadCount: 0,
        });
      }
      conversationMap.get(row.conversation.id).participants.push({
        ...row.participant,
        user: row.participantUser,
      });
    }

    // Get last messages and unread counts for each conversation
    const conversationsArray = Array.from(conversationMap.values());
    
    for (const conversation of conversationsArray) {
      // Get last message
      const [lastMessage] = await db
        .select({
          message: messages,
          sender: users,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (lastMessage) {
        conversation.lastMessage = {
          ...lastMessage.message,
          sender: lastMessage.sender,
        };
      }

      // Get unread count
      const userParticipant = conversation.participants.find((p: any) => p.userId === userId);
      if (userParticipant?.lastReadMessageId) {
        const [unreadCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversation.id),
              sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${userParticipant.lastReadMessageId})`
            )
          );
        conversation.unreadCount = unreadCount?.count || 0;
      } else {
        const [unreadCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(eq(messages.conversationId, conversation.id));
        conversation.unreadCount = unreadCount?.count || 0;
      }
    }

    return conversationsArray;
  }

  async addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [newParticipant] = await db
      .insert(conversationParticipants)
      .values(participant)
      .returning();
    return newParticipant;
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
      .where(
        and(
          eq(conversations.type, 'direct'),
          inArray(
            conversations.id,
            db
              .select({ id: conversationParticipants.conversationId })
              .from(conversationParticipants)
              .where(eq(conversationParticipants.userId, userId1))
          ),
          inArray(
            conversations.id,
            db
              .select({ id: conversationParticipants.conversationId })
              .from(conversationParticipants)
              .where(eq(conversationParticipants.userId, userId2))
          )
        )
      )
      .groupBy(conversations.id)
      .having(sql`count(*) = 2`);

    return conversation?.conversation;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message & { sender: User }> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    const [messageWithSender] = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, newMessage.id));

    return {
      ...messageWithSender.message,
      sender: messageWithSender.sender,
    };
  }

  async getConversationMessages(
    conversationId: string, 
    limit = 50, 
    offset = 0
  ): Promise<Array<Message & { sender: User }>> {
    const messagesList = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return messagesList.map(row => ({
      ...row.message,
      sender: row.sender,
    }));
  }

  async markMessagesAsRead(conversationId: string, userId: string, lastMessageId: string): Promise<void> {
    await db
      .update(conversationParticipants)
      .set({ 
        lastReadMessageId: lastMessageId,
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  // Typing status operations
  async updateTypingStatus(typingStatusData: InsertTypingStatus): Promise<void> {
    await db
      .insert(typingStatus)
      .values({
        ...typingStatusData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [typingStatus.conversationId, typingStatus.userId],
        set: {
          isTyping: typingStatusData.isTyping,
          updatedAt: new Date(),
        },
      });
  }

  async getTypingUsers(conversationId: string, excludeUserId: string): Promise<Array<TypingStatus & { user: User }>> {
    const typingUsers = await db
      .select({
        typingStatus: typingStatus,
        user: users,
      })
      .from(typingStatus)
      .innerJoin(users, eq(typingStatus.userId, users.id))
      .where(
        and(
          eq(typingStatus.conversationId, conversationId),
          eq(typingStatus.isTyping, true),
          sql`${typingStatus.userId} != ${excludeUserId}`,
          sql`${typingStatus.updatedAt} > NOW() - INTERVAL '10 seconds'` // Only recent typing status
        )
      );

    return typingUsers.map(row => ({
      ...row.typingStatus,
      user: row.user,
    }));
  }
}

export const storage = new DatabaseStorage();
