import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, MoreVertical, Plus, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TypingIndicator } from './TypingIndicator';
import type { Conversation, Message, User, ConversationParticipant } from '@/types/schema';

interface ConversationWithDetails extends Conversation {
  participants: Array<ConversationParticipant & { user: User }>;
  lastMessage?: Message & { sender: User };
  unreadCount: number;
}

interface ContactsSidebarProps {
  selectedConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  typingUsers: { [conversationId: string]: string[] };
}

export function ContactsSidebar({ 
  selectedConversationId, 
  onConversationSelect,
  typingUsers = {}
}: ContactsSidebarProps) {
  const { user } = useAuth() as { user: User | null };
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations = [], isLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/conversations', { participantEmail: email });
      return await response.json();
    },
    onSuccess: (newConversation: any) => {
      console.log('Conversation created:', newConversation);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsNewChatOpen(false);
      setNewChatEmail('');
      if (newConversation?.id) {
        console.log('Selecting conversation:', newConversation.id);
        onConversationSelect(newConversation.id);
      } else {
        console.error('No conversation ID in response:', newConversation);
      }
      toast({
        title: "Success",
        description: "New conversation started!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
      });
      // Reload the page to redirect to login
      window.location.reload();
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleStartConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatEmail.trim()) return;
    createConversationMutation.mutate(newChatEmail.trim());
  };

  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery.trim()) return true;
    
    const otherParticipant = conversation.participants.find(p => p.userId !== user?.id)?.user;
    const searchName = otherParticipant?.firstName || otherParticipant?.email || '';
    
    return searchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatLastMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getOtherParticipant = (conversation: ConversationWithDetails) => {
    return conversation.participants.find(p => p.userId !== user?.id)?.user;
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" data-testid="loading-contacts"></div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col" data-testid="contacts-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || user?.email || 'U')}&background=3b82f6&color=ffffff`}
              alt="User Profile"
              className="w-10 h-10 rounded-full object-cover"
              data-testid="img-current-user-avatar"
            />
            <div>
              <h3 className="font-semibold text-gray-800" data-testid="text-current-user-name">
                {user?.firstName || user?.email?.split('@')[0] || 'User'}
              </h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500" data-testid="status-current-user">Online</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  data-testid="button-new-chat"
                >
                  <UserPlus className="w-4 h-4 text-gray-600" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleStartConversation} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Enter email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="person@example.com"
                      value={newChatEmail}
                      onChange={(e) => setNewChatEmail(e.target.value)}
                      required
                      data-testid="input-new-chat-email"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewChatOpen(false)}
                      data-testid="button-cancel-new-chat"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createConversationMutation.isPending}
                      data-testid="button-start-conversation"
                    >
                      {createConversationMutation.isPending ? 'Starting...' : 'Start Chat'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-blue-100"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500" data-testid="empty-conversations">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium mb-2">No conversations yet</h3>
            <p className="text-sm">Start a new conversation to begin chatting</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const isSelected = selectedConversationId === conversation.id;
            const isTyping = typingUsers[conversation.id]?.length > 0;

            return (
              <div
                key={conversation.id}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-l-4 border-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onConversationSelect(conversation.id)}
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={otherParticipant?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant?.firstName || otherParticipant?.email || 'U')}&background=e5e7eb&color=374151`}
                      alt={otherParticipant?.firstName || otherParticipant?.email || 'User'}
                      className="w-12 h-12 rounded-full object-cover"
                      data-testid={`img-participant-avatar-${conversation.id}`}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      otherParticipant?.isOnline ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`truncate ${
                        isSelected ? 'font-semibold text-gray-800' : 'font-medium text-gray-800'
                      }`} data-testid={`text-participant-name-${conversation.id}`}>
                        {otherParticipant?.firstName || otherParticipant?.email?.split('@')[0] || 'Unknown User'}
                      </h4>
                      <span className="text-xs text-gray-500" data-testid={`text-last-message-time-${conversation.id}`}>
                        {conversation.lastMessage && formatLastMessageTime(conversation.lastMessage.createdAt || new Date())}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate" data-testid={`text-last-message-${conversation.id}`}>
                        {conversation.lastMessage?.messageType === 'image' && '📸 Photo'}
                        {conversation.lastMessage?.messageType === 'file' && `📎 ${conversation.lastMessage.fileName}`}
                        {conversation.lastMessage?.messageType === 'text' && conversation.lastMessage.content}
                        {!conversation.lastMessage && 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold" data-testid={`text-unread-count-${conversation.id}`}>
                              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {isTyping && (
                      <div className="flex items-center mt-1">
                        <div className="flex space-x-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                        <span className="ml-2 text-xs text-gray-500" data-testid={`text-typing-${conversation.id}`}>typing...</span>
                      </div>
                    )}
                    {!isTyping && otherParticipant && !otherParticipant.isOnline && otherParticipant.lastSeen && (
                      <span className="text-xs text-gray-400" data-testid={`text-last-seen-${conversation.id}`}>
                        Last seen {formatLastMessageTime(otherParticipant.lastSeen || new Date())}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
