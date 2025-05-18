import { Server } from 'socket.io';
import { errorTrackingService } from './errorTrackingService';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isPrivate?: boolean;
  recipient?: string;
}

class ChatService {
  private io: Server;
  private messageHistory: Map<string, ChatMessage[]> = new Map();
  private maxHistoryLength = 50; // Limit history per game

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Send a chat message in a game
   */
  public sendMessage(gameId: string, message: ChatMessage): void {
    try {
      // Store in history
      this.addToHistory(gameId, message);

      // Regular messages broadcast to everyone in the game
      if (!message.isPrivate) {
        this.io.to(gameId).emit('chat:message', message);
        return;
      }

      // For private messages, we need to find the recipient's socket
      this.io.in(gameId).fetchSockets().then(sockets => {
        for (const socket of sockets) {
          const socketData = socket.data;
          
          // Send to sender
          if (socketData.player && socketData.player.name === message.sender) {
            socket.emit('chat:message', message);
          }
          
          // Send to recipient
          if (socketData.player && socketData.player.name === message.recipient) {
            socket.emit('chat:message', message);
          }
        }
      }).catch(error => {
        errorTrackingService.trackError(error, 'chatService:sendPrivateMessage', { 
          sender: message.sender, 
          recipient: message.recipient 
        });
      });
    } catch (error) {
      errorTrackingService.trackError(error, 'chatService:sendMessage', { 
        gameId, 
        sender: message.sender 
      });
    }
  }

  /**
   * Send a system message to all players in a game
   */
  public sendSystemMessage(gameId: string, text: string): void {
    try {
      const message: ChatMessage = {
        id: `system-${Date.now()}`,
        sender: 'System',
        text,
        timestamp: Date.now(),
        isSystem: true
      };

      // Store in history
      this.addToHistory(gameId, message);

      // Broadcast to everyone in the game
      this.io.to(gameId).emit('chat:message', message);
    } catch (error) {
      errorTrackingService.trackError(error, 'chatService:sendSystemMessage', { gameId });
    }
  }

  /**
   * Get chat history for a game
   */
  public getHistory(gameId: string): ChatMessage[] {
    return this.messageHistory.get(gameId) || [];
  }

  /**
   * Add a message to the history for a game
   */
  private addToHistory(gameId: string, message: ChatMessage): void {
    const history = this.messageHistory.get(gameId) || [];
    
    // Add new message
    history.push(message);
    
    // Limit history size
    if (history.length > this.maxHistoryLength) {
      history.shift(); // Remove oldest message
    }
    
    this.messageHistory.set(gameId, history);
  }

  /**
   * Clear history for a game
   */
  public clearHistory(gameId: string): void {
    this.messageHistory.delete(gameId);
  }

  /**
   * Handle game events by sending system messages
   */
  public notifyGameEvent(gameId: string, event: string, playerName?: string): void {
    let message = '';
    
    switch (event) {
      case 'playerJoined':
        message = `${playerName} joined the table.`;
        break;
      case 'playerLeft':
        message = `${playerName} left the table.`;
        break;
      case 'playerWentAway':
        message = `${playerName} is away from the table.`;
        break;
      case 'playerCameBack':
        message = `${playerName} is back at the table.`;
        break;
      case 'gameStarted':
        message = 'The game has started!';
        break;
      case 'handCompleted':
        message = 'The hand is complete.';
        break;
      case 'playerFolded':
        message = `${playerName} folded.`;
        break;
      case 'playerChecked':
        message = `${playerName} checked.`;
        break;
      case 'playerCalled':
        message = `${playerName} called.`;
        break;
      case 'playerRaised':
        message = `${playerName} raised.`;
        break;
      case 'newDealer':
        message = `${playerName} is the new dealer.`;
        break;
      default:
        return; // Don't send message for unknown events
    }
    
    this.sendSystemMessage(gameId, message);
  }
}

export const createChatService = (io: Server): ChatService => {
  return new ChatService(io);
}; 