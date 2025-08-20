import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertMessageSchema, 
  insertConversationSchema, 
  insertConversationParticipantSchema,
  emailSignupSchema,
  emailLoginSchema,
  phoneSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@shared/schema";
import { authService } from "./auth";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/Password Authentication
  app.post('/api/auth/signup/email', async (req, res) => {
    try {
      const validatedData = emailSignupSchema.parse(req.body);
      const user = await authService.signupWithEmail(validatedData);
      res.status(201).json({ 
        message: 'Account created successfully. Please check your email to verify your account.',
        user: { id: user.id, email: user.email, emailVerified: user.emailVerified }
      });
    } catch (error) {
      console.error('Email signup error:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.post('/api/auth/login/email', async (req, res) => {
    try {
      const validatedData = emailLoginSchema.parse(req.body);
      const user = await authService.loginWithEmail(validatedData);
      
      // Create session manually for email auth users
      (req.session as any).userId = user.id;
      req.login({ claims: { sub: user.id } }, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: 'Session creation failed' });
        }
        console.log('Session created for user:', user.id);
        res.json({ 
          message: 'Logged in successfully',
          user: { id: user.id, email: user.email, emailVerified: user.emailVerified }
        });
      });
    } catch (error) {
      console.error('Email login error:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Phone authentication removed

  // Password Reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      await authService.initiatePasswordReset(validatedData);
      res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(400).json({ message: 'Failed to process request' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(validatedData);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Email Verification
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      await authService.verifyEmail(token);
      res.redirect('/email-verified');
    } catch (error) {
      console.error('Email verification error:', error);
      res.redirect('/email-verification-failed');
    }
  });

  // Google Authentication (Firebase Auth)
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { googleProfile } = req.body;
      console.log('Received Google profile:', googleProfile);
      
      const user = await authService.handleGoogleAuth(googleProfile);
      console.log('Google auth successful for user:', user.id);
      
      // Create session manually for Google auth users
      (req.session as any).userId = user.id;
      req.login({ claims: { sub: user.id } }, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ message: 'Session creation failed' });
        }
        console.log('Session created for user:', user.id);
        res.json({ 
          message: 'Logged in with Google successfully',
          user: { id: user.id, email: user.email, emailVerified: user.emailVerified }
        });
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destruction error:', sessionErr);
          return res.status(500).json({ message: 'Session cleanup failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
      });
    });
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { participantId, participantEmail, type = 'direct' } = req.body;

      let actualParticipantId = participantId;

      // If email is provided, find or create user
      if (participantEmail && !participantId) {
        let participant = await storage.getUserByEmail(participantEmail);
        if (!participant) {
          // Create a placeholder user for the email
          participant = await storage.upsertUser({
            id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: participantEmail,
            firstName: null,
            lastName: null,
            profileImageUrl: null,
          });
        }
        actualParticipantId = participant.id;
      }

      if (!actualParticipantId) {
        return res.status(400).json({ message: "Participant ID or email is required" });
      }

      if (type === 'direct') {
        // Check if direct conversation already exists
        const existingConversation = await storage.findDirectConversation(userId, actualParticipantId);
        if (existingConversation) {
          return res.json(existingConversation);
        }
      }

      const conversationData = insertConversationSchema.parse({
        type,
        name: type === 'group' ? req.body.name : null,
      });

      const conversation = await storage.createConversation(conversationData);

      // Add participants
      await storage.addParticipantToConversation({
        conversationId: conversation.id,
        userId,
      });

      if (actualParticipantId) {
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: actualParticipantId,
        });
      }

      // Return the conversation with full details for the frontend
      const conversationWithDetails = await storage.getUserConversations(userId);
      const newConversation = conversationWithDetails.find(c => c.id === conversation.id);
      res.json(newConversation || conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get specific conversation by ID
  app.get('/api/conversations/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;
      
      const conversations = await storage.getUserConversations(userId);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Message routes
  app.get('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const messages = await storage.getConversationMessages(
        conversationId, 
        parseInt(limit), 
        parseInt(offset)
      );
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;
      
      const messageData = insertMessageSchema.parse({
        conversationId,
        senderId: userId,
        content: req.body.content,
        messageType: req.body.messageType || 'text',
        fileUrl: req.body.fileUrl || null,
        fileName: req.body.fileName || null,
        fileSize: req.body.fileSize ? parseInt(req.body.fileSize) : null,
      });

      const message = await storage.createMessage(messageData);

      // Broadcast message to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const wsClient = client as any;
          if (wsClient.conversationId === conversationId && wsClient.userId !== userId) {
            client.send(JSON.stringify({
              type: 'message',
              data: message,
            }));
          }
        }
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // File upload route
  app.post('/api/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Mark messages as read
  app.post('/api/conversations/:conversationId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;
      const { messageId } = req.body;

      await storage.markMessagesAsRead(conversationId, userId, messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket & any, req) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_conversation':
            ws.conversationId = message.conversationId;
            ws.userId = message.userId;
            
            // Update user online status
            await storage.updateUserOnlineStatus(message.userId, true);
            
            // Broadcast user online status to other clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                const wsClient = client as any;
                if (wsClient.conversationId === message.conversationId) {
                  client.send(JSON.stringify({
                    type: 'user_online',
                    data: { userId: message.userId, isOnline: true },
                  }));
                }
              }
            });
            break;

          case 'typing_start':
            await storage.updateTypingStatus({
              conversationId: message.conversationId,
              userId: message.userId,
              isTyping: true,
            });

            // Broadcast typing status to other clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                const wsClient = client as any;
                if (wsClient.conversationId === message.conversationId) {
                  client.send(JSON.stringify({
                    type: 'typing_start',
                    data: { userId: message.userId },
                  }));
                }
              }
            });
            break;

          case 'typing_stop':
            await storage.updateTypingStatus({
              conversationId: message.conversationId,
              userId: message.userId,
              isTyping: false,
            });

            // Broadcast typing status to other clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                const wsClient = client as any;
                if (wsClient.conversationId === message.conversationId) {
                  client.send(JSON.stringify({
                    type: 'typing_stop',
                    data: { userId: message.userId },
                  }));
                }
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      console.log('WebSocket client disconnected');
      
      if (ws.userId) {
        // Update user offline status
        await storage.updateUserOnlineStatus(ws.userId, false);
        
        // Stop typing status
        if (ws.conversationId) {
          await storage.updateTypingStatus({
            conversationId: ws.conversationId,
            userId: ws.userId,
            isTyping: false,
          });
        }

        // Broadcast user offline status to other clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const wsClient = client as any;
            if (wsClient.conversationId === ws.conversationId) {
              client.send(JSON.stringify({
                type: 'user_offline',
                data: { userId: ws.userId, isOnline: false },
              }));
            }
          }
        });
      }
    });
  });

  return httpServer;
}
