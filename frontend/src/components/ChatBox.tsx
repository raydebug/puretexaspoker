import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { socketService } from '../services/socketService';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isPrivate?: boolean;
  recipient?: string;
}

interface ChatBoxProps {
  currentPlayer: {
    id: string;
    name: string;
  };
  gameId: string;
}

const ChatContainer = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  width: 300px;
  height: 400px;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 1rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  border: 2px solid #1b4d3e;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const ChatHeader = styled.div`
  color: #ffd700;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #4caf50;
  font-size: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #4caf50;
    border-radius: 3px;
  }
`;

const Message = styled.div<{ $isSystem?: boolean; $isPrivate?: boolean }>`
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: ${props => props.$isSystem 
    ? 'rgba(255, 215, 0, 0.1)' 
    : props.$isPrivate 
      ? 'rgba(128, 0, 128, 0.2)' 
      : 'rgba(27, 77, 62, 0.3)'};
  color: ${props => props.$isSystem ? '#ffd700' : 'white'};
  font-size: 0.9rem;
  word-break: break-word;
`;

const Sender = styled.span<{ $isSystem?: boolean; $isPrivate?: boolean }>`
  font-weight: bold;
  color: ${props => props.$isSystem ? '#ffd700' : props.$isPrivate ? '#e066ff' : '#4caf50'};
  margin-right: 0.5rem;
`;

const Time = styled.span`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 0.5rem;
`;

const ChatForm = styled.form`
  display: flex;
  gap: 0.5rem;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #1b4d3e;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  
  &:focus {
    outline: none;
    border-color: #4caf50;
  }
`;

const SendButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #45a049;
  }
  
  &:disabled {
    background-color: #333;
    cursor: not-allowed;
  }
`;

export const ChatBox: React.FC<ChatBoxProps> = ({ currentPlayer, gameId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [recipient, setRecipient] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add a system message when component mounts
    const welcomeMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      sender: 'System',
      text: 'Welcome to the chat! Be respectful to other players.',
      timestamp: Date.now(),
      isSystem: true
    };
    setMessages([welcomeMessage]);

    // Set up socket listeners for messages
    socketService.onChatMessage((message: ChatMessage) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

    socketService.onSystemMessage((message: string) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        sender: 'System',
        text: message,
        timestamp: Date.now(),
        isSystem: true
      };
      setMessages(prevMessages => [...prevMessages, systemMessage]);
    });

    return () => {
      // Clean up listeners
      socketService.offChatMessage();
      socketService.offSystemMessage();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    // Format: @username text for private message
    let msgText = messageText.trim();
    let msgRecipient = recipient;
    let msgIsPrivate = isPrivate;
    
    // Check if message starts with @ for private messaging
    if (msgText.startsWith('@') && !isPrivate) {
      const spaceIndex = msgText.indexOf(' ');
      if (spaceIndex > 0) {
        msgRecipient = msgText.substring(1, spaceIndex);
        msgText = msgText.substring(spaceIndex + 1);
        msgIsPrivate = true;
      }
    }
    
    if (msgText) {
      const newMessage: ChatMessage = {
        id: `${currentPlayer.id}-${Date.now()}`,
        sender: currentPlayer.name,
        text: msgText,
        timestamp: Date.now(),
        isPrivate: msgIsPrivate,
        recipient: msgIsPrivate ? msgRecipient : undefined
      };
      
      // Update local state immediately for better UX
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Send to server
      socketService.sendChatMessage(gameId, newMessage);
      
      // Reset form
      setMessageText('');
      if (msgIsPrivate && !isPrivate) {
        setIsPrivate(true);
        setRecipient(msgRecipient);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <span>Game Chat</span>
        {isPrivate && (
          <span style={{ fontSize: '0.8rem', color: '#e066ff' }}>
            Private: @{recipient}
            <button 
              onClick={() => {
                setIsPrivate(false);
                setRecipient('');
              }}
              style={{ 
                marginLeft: '5px', 
                background: 'none', 
                border: 'none', 
                color: '#e066ff',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ✕
            </button>
          </span>
        )}
      </ChatHeader>
      <MessageList ref={messageListRef}>
        {messages.map((msg) => (
          <Message 
            key={msg.id} 
            $isSystem={msg.isSystem}
            $isPrivate={msg.isPrivate}
          >
            <Sender 
              $isSystem={msg.isSystem}
              $isPrivate={msg.isPrivate}
            >
              {msg.sender}
              {msg.isPrivate && !msg.isSystem && ` → ${msg.recipient}`}:
            </Sender>
            {msg.text}
            <Time>{formatTime(msg.timestamp)}</Time>
          </Message>
        ))}
      </MessageList>
      <ChatForm onSubmit={handleSubmit}>
        <ChatInput 
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={isPrivate ? `Private to @${recipient}` : "Type a message..."}
        />
        <SendButton type="submit" disabled={!messageText.trim()}>
          Send
        </SendButton>
      </ChatForm>
    </ChatContainer>
  );
}; 