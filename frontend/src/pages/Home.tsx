import { useState } from 'react';
import { ContactsSidebar } from '@/components/chat/ContactsSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: string[] }>({});

  const handleConversationSelect = (conversationId: string) => {
    console.log('Setting selected conversation ID:', conversationId);
    console.log('Current selectedConversationId:', selectedConversationId);
    setSelectedConversationId(conversationId);
    console.log('After setting selectedConversationId:', conversationId);
  };

  const handleTypingUsersChange = (conversationId: string, users: string[]) => {
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: users,
    }));
  };

  return (
    <div className="h-screen flex bg-white" data-testid="home-page">
      <ContactsSidebar
        selectedConversationId={selectedConversationId}
        onConversationSelect={handleConversationSelect}
        typingUsers={typingUsers}
      />
      {selectedConversationId ? (
        <ChatWindow
          conversationId={selectedConversationId}
          onTypingUsersChange={handleTypingUsersChange}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50" data-testid="no-conversation-selected">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.681L3 21l2.681-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose a conversation to start messaging</p>
            <p className="text-xs text-gray-400 mt-2">Debug: selectedConversationId = {selectedConversationId || 'null'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
