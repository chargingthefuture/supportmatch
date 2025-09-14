import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Partnership } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: User;
}

interface MessagingProps {
  partnership: Partnership;
  currentUser: User;
}

export default function Messaging({ partnership, currentUser }: MessagingProps) {
  const [newMessage, setNewMessage] = useState("");

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages', partnership.id],
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/messages', {
        partnershipId: partnership.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setNewMessage("");
    },
  });

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'TU';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage.trim());
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className="mt-6" data-testid="card-messaging">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4" data-testid="heading-recent-messages">Recent Messages</h3>
        
        <ScrollArea className="h-80 w-full pr-4" data-testid="messages-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>No messages yet.</p>
                <p className="text-sm">Send a message to start your conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex space-x-3 ${message.senderId === currentUser.id ? 'justify-end' : ''}`}
                  data-testid={`message-${message.id}`}
                >
                  {message.senderId !== currentUser.id && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getInitials(message.sender.name)}
                    </div>
                  )}
                  
                  <div className={`flex-1 ${message.senderId === currentUser.id ? 'flex justify-end' : ''}`}>
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                      message.senderId === currentUser.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    } rounded-lg p-3`}>
                      <p className="text-sm" data-testid={`message-content-${message.id}`}>{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`message-time-${message.id}`}>
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                  
                  {message.senderId === currentUser.id && (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getInitials(currentUser.name)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t border-border">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={sendMessage.isPending}
              data-testid="input-new-message"
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || sendMessage.isPending}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
