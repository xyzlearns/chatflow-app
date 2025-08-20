import { format } from 'date-fns';
import { Check, CheckCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Message, User } from '@shared/schema';

interface MessageBubbleProps {
  message: Message & { sender: User };
  isCurrentUser: boolean;
  isRead?: boolean;
}

export function MessageBubble({ message, isCurrentUser, isRead = false }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return format(new Date(date), 'h:mm a');
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <div className="max-w-xs lg:max-w-md" data-testid={`message-image-${message.id}`}>
            <img
              src={message.fileUrl || ''}
              alt="Shared image"
              className="rounded-lg w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.fileUrl || '', '_blank')}
            />
            {message.content && (
              <p className="mt-2 px-2 pb-1" data-testid={`message-content-${message.id}`}>
                {message.content}
              </p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className={`p-2 rounded-lg ${isCurrentUser ? 'bg-white bg-opacity-20' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-3" data-testid={`message-file-${message.id}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isCurrentUser ? 'bg-white bg-opacity-30' : 'bg-gray-200'
              }`}>
                <i className="fas fa-file text-gray-600"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" data-testid={`file-name-${message.id}`}>
                  {message.fileName}
                </p>
                {message.fileSize && (
                  <p className="text-sm opacity-75" data-testid={`file-size-${message.id}`}>
                    {formatFileSize(message.fileSize)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(message.fileUrl!, message.fileName!)}
                className={isCurrentUser ? 'hover:bg-white hover:bg-opacity-20 text-white' : ''}
                data-testid={`button-download-${message.id}`}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <p data-testid={`message-content-${message.id}`}>
            {message.content}
          </p>
        );
    }
  };

  if (isCurrentUser) {
    return (
      <div className="flex items-end justify-end animate-slide-in" data-testid={`message-sent-${message.id}`}>
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-blue-500 rounded-2xl rounded-br-md px-4 py-3 text-white">
            {renderMessageContent()}
          </div>
          <div className="flex items-center justify-end space-x-2 mt-1 mr-1">
            <span className="text-xs text-gray-500" data-testid={`message-time-${message.id}`}>
              {formatTime(message.createdAt || new Date())}
            </span>
            <div data-testid={`message-status-${message.id}`}>
              {isRead ? (
                <CheckCheck className="text-blue-500 w-3 h-3" />
              ) : (
                <Check className="text-gray-400 w-3 h-3" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 animate-slide-in" data-testid={`message-received-${message.id}`}>
      <img
        src={message.sender.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.firstName || message.sender.email || 'U')}&background=e5e7eb&color=374151`}
        alt={message.sender.firstName || message.sender.email || 'User'}
        className="w-8 h-8 rounded-full object-cover"
        data-testid={`img-sender-avatar-${message.id}`}
      />
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
          {renderMessageContent()}
        </div>
        <div className="flex items-center space-x-2 mt-1 ml-1">
          <span className="text-xs text-gray-500" data-testid={`message-time-${message.id}`}>
            {formatTime(message.createdAt || new Date())}
          </span>
        </div>
      </div>
    </div>
  );
}
