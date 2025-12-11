/// <reference path="../types/nakama.d.ts" />

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  tableId: string;
  timestamp: string;
  messageType: 'player' | 'system' | 'dealer';
}

interface ChatFilter {
  tableId?: string;
  playerId?: string;
  limit?: number;
  before?: string; // timestamp
  after?: string;  // timestamp
}

export class ChatService {
  private readonly nk: nkruntime.Nakama;
  private readonly logger: nkruntime.Logger;

  constructor(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    this.nk = nk;
    this.logger = logger;
  }

  /**
   * Store a chat message in Nakama storage
   */
  public async storeMessage(
    ctx: nkruntime.Context,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const chatMessage: ChatMessage = {
      id: messageId,
      timestamp,
      ...message
    };

    // Sanitize message content
    chatMessage.content = this.sanitizeContent(chatMessage.content);

    try {
      // Store in table-specific collection for easy retrieval
      this.nk.storageWrite([{
        collection: "chat_messages",
        key: messageId,
        userId: ctx.userId,
        value: chatMessage,
        permissionRead: 2, // Public read for table participants
        permissionWrite: 1  // Owner write only
      }]);

      // Also store in table index for fast table-based queries
      this.nk.storageWrite([{
        collection: "table_chat_index",
        key: `${message.tableId}_${timestamp}_${messageId}`,
        userId: ctx.userId,
        value: {
          messageId,
          tableId: message.tableId,
          timestamp,
          senderId: message.senderId
        },
        permissionRead: 2,
        permissionWrite: 1
      }]);

      this.logger.info(`Chat message stored: ${messageId} for table ${message.tableId}`);
      return chatMessage;

    } catch (error) {
      this.logger.error(`Failed to store chat message: ${error}`);
      throw new Error('Failed to store message');
    }
  }

  /**
   * Get chat messages for a table
   */
  public async getTableMessages(
    ctx: nkruntime.Context,
    filter: ChatFilter
  ): Promise<ChatMessage[]> {
    
    try {
      if (!filter.tableId) {
        throw new Error('Table ID is required');
      }

      // Read from table chat index
      const indexResults = this.nk.storageRead([{
        collection: "table_chat_index",
        key: `${filter.tableId}_*` // Get all messages for table
      }]);

      if (!indexResults || indexResults.length === 0) {
        return [];
      }

      // Sort by timestamp and apply limit
      const sortedIndex = indexResults
        .sort((a, b) => new Date(a.value.timestamp).getTime() - new Date(b.value.timestamp).getTime())
        .slice(0, filter.limit || 50);

      // Get full message details
      const messageIds = sortedIndex.map(index => index.value.messageId);
      const messageReads = messageIds.map(id => ({
        collection: "chat_messages",
        key: id
      }));

      const messages = this.nk.storageRead(messageReads);
      
      return messages
        .map(msg => msg.value as ChatMessage)
        .filter(msg => {
          // Apply additional filters
          if (filter.playerId && msg.senderId !== filter.playerId) return false;
          if (filter.after && new Date(msg.timestamp) <= new Date(filter.after)) return false;
          if (filter.before && new Date(msg.timestamp) >= new Date(filter.before)) return false;
          return true;
        });

    } catch (error) {
      this.logger.error(`Failed to get table messages: ${error}`);
      return [];
    }
  }

  /**
   * Broadcast a chat message to match participants
   */
  public broadcastMessage(
    dispatcher: nkruntime.MatchDispatcher,
    message: ChatMessage,
    excludeUserId?: string
  ): void {
    
    const chatData = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: message.timestamp,
      messageType: message.messageType
    };

    // Use OpCode 12 for chat broadcasts (as defined in poker_table.ts)
    dispatcher.broadcastMessage(12, JSON.stringify(chatData));
    
    this.logger.info(`Chat message broadcasted: ${message.id}`);
  }

  /**
   * Create system message (dealer announcements, game events)
   */
  public async createSystemMessage(
    ctx: nkruntime.Context,
    tableId: string,
    content: string,
    messageType: 'system' | 'dealer' = 'system'
  ): Promise<ChatMessage> {
    
    return this.storeMessage(ctx, {
      content,
      senderId: 'system',
      senderName: messageType === 'dealer' ? 'Dealer' : 'System',
      tableId,
      messageType
    });
  }

  /**
   * Handle chat moderation
   */
  public moderateMessage(content: string): { allowed: boolean; reason?: string } {
    // Basic moderation rules
    const forbiddenWords = ['spam', 'cheat', 'hack', 'bot']; // Simplified list
    const lowerContent = content.toLowerCase();
    
    // Check for forbidden words
    for (const word of forbiddenWords) {
      if (lowerContent.includes(word)) {
        return { allowed: false, reason: `Contains forbidden word: ${word}` };
      }
    }

    // Check message length
    if (content.length > 500) {
      return { allowed: false, reason: 'Message too long' };
    }

    // Check for excessive caps
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    if (capsCount > content.length * 0.8 && content.length > 10) {
      return { allowed: false, reason: 'Excessive use of capital letters' };
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(content)) {
      return { allowed: false, reason: 'Excessive repeated characters' };
    }

    return { allowed: true };
  }

  /**
   * Sanitize message content
   */
  private sanitizeContent(content: string): string {
    // Remove potential XSS content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Get player chat statistics
   */
  public async getPlayerChatStats(
    ctx: nkruntime.Context,
    playerId: string
  ): Promise<{
    totalMessages: number;
    messagesLast24h: number;
    averageMessageLength: number;
    mostActiveTable: string;
  }> {
    
    try {
      // This would require more complex querying in a real implementation
      // For now, return basic stats structure
      return {
        totalMessages: 0,
        messagesLast24h: 0,
        averageMessageLength: 0,
        mostActiveTable: ''
      };
    } catch (error) {
      this.logger.error(`Failed to get player chat stats: ${error}`);
      throw error;
    }
  }

  /**
   * Clean up old chat messages
   */
  public async cleanupOldMessages(
    ctx: nkruntime.Context,
    olderThanDays: number = 30
  ): Promise<number> {
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // In a real implementation, this would scan and delete old messages
      // For now, just log the operation
      this.logger.info(`Chat cleanup initiated for messages older than ${olderThanDays} days`);
      return 0;
      
    } catch (error) {
      this.logger.error(`Failed to cleanup old messages: ${error}`);
      throw error;
    }
  }

  /**
   * Handle chat command (e.g., /help, /stats)
   */
  public async handleChatCommand(
    ctx: nkruntime.Context,
    command: string,
    args: string[],
    tableId: string
  ): Promise<ChatMessage | null> {
    
    switch (command.toLowerCase()) {
      case '/help':
        return this.createSystemMessage(ctx, tableId, 
          'Available commands: /help, /stats, /time', 'system');
        
      case '/stats':
        const stats = await this.getPlayerChatStats(ctx, ctx.userId || '');
        return this.createSystemMessage(ctx, tableId,
          `Your stats: ${stats.totalMessages} total messages, ${stats.messagesLast24h} in last 24h`, 'system');
        
      case '/time':
        return this.createSystemMessage(ctx, tableId,
          `Current server time: ${new Date().toISOString()}`, 'system');
        
      default:
        return this.createSystemMessage(ctx, tableId,
          `Unknown command: ${command}. Type /help for available commands.`, 'system');
    }
  }
}

// Export for use in match handlers and RPCs
module.exports = { ChatService }; 