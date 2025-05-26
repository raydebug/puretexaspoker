import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { socketService } from '../services/socketService';
import { soundService } from '../services/soundService';
import { media } from '../styles/GlobalStyles';

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

interface StyledProps {
  'data-collapsed': boolean;
}

const ChatContainer = styled.div<StyledProps>`
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  width: 300px;
  height: ${props => props['data-collapsed'] ? '50px' : '400px'};
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 1rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  border: 2px solid #1b4d3e;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
  transition: height 0.3s ease-in-out;
  overflow: hidden;
  
  ${media.md`
    width: 250px;
    bottom: 1rem;
    left: 1rem;
  `}
  
  ${media.sm`
    width: calc(100% - 2rem);
    left: 1rem;
    border-radius: 0.5rem;
  `}
`;

const ChatHeader = styled.div<StyledProps>`
  color: #ffd700;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${props => props['data-collapsed'] ? '0' : '0.5rem'};
  padding-bottom: ${props => props['data-collapsed'] ? '0' : '0.5rem'};
  border-bottom: ${props => props['data-collapsed'] ? 'none' : '1px solid #4caf50'};
  font-size: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
`;

const CollapseIcon = styled.span<StyledProps>`
  transform: rotate(${props => props['data-collapsed'] ? '180deg' : '0deg'});
  transition: transform 0.3s ease;
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
  
  ${media.sm`
    font-size: 0.8rem;
    padding: 0.4rem;
  `}
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
  
  ${media.sm`
    padding: 0.4rem;
    font-size: 0.9rem;
  `}
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
  
  ${media.sm`
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  `}
`;

const UnreadBadge = styled.span`
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.7rem;
  margin-left: 8px;
`;

export const ChatBox: React.FC<ChatBoxProps> = ({ currentPlayer, gameId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
      // Play different sounds based on message type
      if (message.isPrivate) {
        soundService.play('notification');
      } else if (message.sender !== currentPlayer.name) {
        soundService.play('message');
      }
      
      setMessages(prevMessages => [...prevMessages, message]);
      
      // Increment unread count if chat is collapsed
      if (isCollapsed) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socketService.onSystemMessage((message: string) => {
      // Play sound for system messages
      soundService.play('notification');
      
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        sender: 'System',
        text: message,
        timestamp: Date.now(),
        isSystem: true
      };
      
      setMessages(prevMessages => [...prevMessages, systemMessage]);
      
      // Increment unread count if chat is collapsed
      if (isCollapsed) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      // Clean up listeners
      socketService.offChatMessage();
      socketService.offSystemMessage();
    };
  }, [currentPlayer.name, isCollapsed]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current && !isCollapsed) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isCollapsed]);
  
  // Reset unread count when expanding chat
  useEffect(() => {
    if (!isCollapsed) {
      setUnreadCount(0);
    }
  }, [isCollapsed]);

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
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: currentPlayer.name,
        text: msgText,
        timestamp: Date.now(),
        isPrivate: msgIsPrivate,
        recipient: msgIsPrivate ? msgRecipient : undefined
      };
      
      socketService.sendChatMessage(gameId, message);
      
      // Play sound for sent message
      soundService.play('message');
      
      // Reset form state
      setMessageText('');
      if (isPrivate && !msgText.startsWith('@')) {
        setIsPrivate(false);
        setRecipient('');
      }
    }
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
      setUnreadCount(0);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ChatContainer data-collapsed={isCollapsed}>
      <ChatHeader data-collapsed={isCollapsed} onClick={toggleCollapse}>
        <div>
          Game Chat
          {isCollapsed && unreadCount > 0 && (
            <UnreadBadge>{unreadCount}</UnreadBadge>
          )}
        </div>
        <CollapseIcon data-collapsed={isCollapsed}>
          ▼
        </CollapseIcon>
      </ChatHeader>
      
      {!isCollapsed && (
        <>
          <MessageList ref={messageListRef}>
            {messages.map((message) => (
              <Message 
                key={message.id} 
                $isSystem={message.isSystem}
                $isPrivate={message.isPrivate}
              >
                <Sender 
                  $isSystem={message.isSystem}
                  $isPrivate={message.isPrivate}
                >
                  {message.sender}
                  {message.isPrivate && message.recipient && ` → ${message.recipient}`}:
                </Sender>
                {message.text}
                <Time>{formatTime(message.timestamp)}</Time>
              </Message>
            ))}
          </MessageList>
          
          <ChatForm onSubmit={handleSubmit}>
            <ChatInput 
              type="text" 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={isPrivate ? `To ${recipient}...` : "Type a message..."}
            />
            <SendButton type="submit" disabled={!messageText.trim()}>
              Send
            </SendButton>
          </ChatForm>
        </>
      )}
    </ChatContainer>
  );
}; 