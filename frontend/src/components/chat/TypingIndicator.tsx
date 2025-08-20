interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
  avatar?: string;
}

export function TypingIndicator({ isTyping, userName, avatar }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex items-start space-x-3 animate-fade-in" data-testid="typing-indicator">
      {avatar && (
        <img
          src={avatar}
          alt={userName}
          className="w-8 h-8 rounded-full object-cover"
          data-testid="img-typing-avatar"
        />
      )}
      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex space-x-1" data-testid="typing-dots">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </div>
  );
}
