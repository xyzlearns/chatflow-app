import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Plus, Paperclip, Smile, Phone, Video, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { FileUpload } from '@/components/ui/file-upload';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Message, User, Conversation } from '@shared/schema';

interface ChatWindowProps {
  conversationId: string;
  onTypingUsersChange: (conversationId: string, users: string[]) => void;
}

export function ChatWindow({ conversationId, onTypingUsersChange }: ChatWindowProps) {
  const { user } = useAuth() as { user: User | null };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const socket = useSocket(conversationId);

  // Fetch conversation details
  const { data: conversation } = useQuery<Conversation & { 
    participants: Array<{ user: User }>;
  }>({
    queryKey: ['/api/conversations', conversationId],
    enabled: !!conversationId,
  });

  // Fetch messages
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Array<Message & { sender: User }>>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; messageType?: string; fileUrl?: string; fileName?: string; fileSize?: number }) => {
      return await apiRequest('POST', `/api/conversations/${conversationId}/messages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations', conversationId, 'messages']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations']
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get other participant
  const otherParticipant = conversation?.participants.find(p => p.user.id !== user?.id)?.user;

  // Socket event handlers
  useEffect(() => {
    if (!socket.isConnected) return;

    const handleMessage = (messageData: Message & { sender: User }) => {
      queryClient.setQueryData(
        ['/api/conversations', conversationId, 'messages'], 
        (oldMessages: Array<Message & { sender: User }> = []) => [messageData, ...oldMessages]
      );
      
      // Update conversations list
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations']
      });
    };

    const handleTypingStart = (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          const newUsers = [...prev, data.userId].filter((id, index, arr) => arr.indexOf(id) === index);
          onTypingUsersChange(conversationId, newUsers);
          return newUsers;
        });
      }
    };

    const handleTypingStop = (data: { userId: string }) => {
      setTypingUsers(prev => {
        const newUsers = prev.filter(id => id !== data.userId);
        onTypingUsersChange(conversationId, newUsers);
        return newUsers;
      });
    };

    socket.on('message', handleMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);

    return () => {
      socket.off('message');
      socket.off('typing_start');
      socket.off('typing_stop');
    };
  }, [socket, conversationId, user?.id, queryClient, onTypingUsersChange]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing
  const handleTyping = useCallback(() => {
    socket.startTyping();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socket.stopTyping();
    }, 3000);
  }, [socket]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.stopTyping();
  }, [socket]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;

    const content = messageText.trim();
    setMessageText('');
    handleStopTyping();

    sendMessageMutation.mutate({ 
      content,
      messageType: 'text'
    });
  };

  // Handle file upload
  const handleFileUploaded = (fileData: { url: string; filename: string; size: number; mimetype: string }) => {
    const messageType = fileData.mimetype.startsWith('image/') ? 'image' : 'file';
    
    sendMessageMutation.mutate({
      content: messageType === 'image' ? '' : '',
      messageType,
      fileUrl: fileData.url,
      fileName: fileData.filename,
      fileSize: fileData.size,
    });
  };

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" data-testid="loading-messages"></div>
      </div>
    );
  }



  if (!conversation || !otherParticipant) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50" data-testid="no-conversation-selected">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.681L3 21l2.681-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Loading conversation...</h3>
          <p className="text-gray-500">Debug: conversation={!!conversation}, otherParticipant={!!otherParticipant}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white" data-testid={`chat-window-${conversationId}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={otherParticipant.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.firstName || otherParticipant.email || 'U')}&background=e5e7eb&color=374151`}
              alt={otherParticipant.firstName || otherParticipant.email || 'User'}
              className="w-10 h-10 rounded-full object-cover"
              data-testid={`img-chat-participant-${conversationId}`}
            />
            <div>
              <h3 className="font-semibold text-gray-800" data-testid={`text-participant-name-${conversationId}`}>
                {otherParticipant.firstName || otherParticipant.email?.split('@')[0] || 'Unknown User'}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className={`w-2 h-2 rounded-full ${otherParticipant.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span data-testid={`status-participant-${conversationId}`}>
                  {otherParticipant.isOnline ? 'Online' : 'Offline'}
                </span>
                {!otherParticipant.isOnline && otherParticipant.lastSeen && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span data-testid={`text-last-seen-${conversationId}`}>
                      Last seen {new Date(otherParticipant.lastSeen || new Date()).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" data-testid="button-voice-call">
              <Phone className="w-4 h-4 text-gray-600" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-video-call">
              <Video className="w-4 h-4 text-gray-600" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-chat-info">
              <Info className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" data-testid={`messages-area-${conversationId}`}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500" data-testid="empty-messages">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-comment text-gray-400 text-2xl"></i>
              </div>
              <h3 className="font-medium mb-2">No messages yet</h3>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {messages.slice().reverse().map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isCurrentUser={message.senderId === user?.id}
              />
            ))}
            
            {typingUsers.length > 0 && otherParticipant && (
              <TypingIndicator
                isTyping={true}
                userName={otherParticipant.firstName || otherParticipant.email || 'User'}
                avatar={otherParticipant.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.firstName || otherParticipant.email || 'U')}&background=e5e7eb&color=374151`}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsFileUploadOpen(true)}
            data-testid="button-add-attachment"
          >
            <Plus className="w-5 h-5 text-gray-500" />
          </Button>
          <div className="flex-1">
            <div className="relative">
              <Textarea
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyPress}
                onBlur={handleStopTyping}
                placeholder="Type a message..."
                className="pr-12 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none"
                rows={1}
                data-testid={`input-message-${conversationId}`}
              />
              <Button 
                variant="ghost" 
                size="sm"
                className="absolute right-3 bottom-2"
                data-testid="button-emoji"
              >
                <Smile className="w-5 h-5 text-gray-400" />
              </Button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsFileUploadOpen(true)}
            data-testid="button-paperclip"
          >
            <Paperclip className="w-5 h-5 text-gray-500" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            data-testid={`button-send-message-${conversationId}`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <FileUpload
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        onFileUploaded={handleFileUploaded}
      />
    </div>
  );
}
