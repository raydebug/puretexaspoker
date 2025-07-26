import { prisma } from '../db';

interface ChatMessageInput {
  content: string;
  playerId: string;
  tableId: number;
  timestamp?: string;
}

interface ChatMessageOutput {
  id: number;
  content: string;
  sender: string;
  timestamp: string;
  relativeTime: string;
  tableId: number;
}

class ChatService {
  /**
   * Create a new chat message with timestamp validation
   */
  async createMessage(messageData: ChatMessageInput): Promise<ChatMessageOutput> {
    try {
      // Validate timestamp if provided
      if (messageData.timestamp && isNaN(Date.parse(messageData.timestamp))) {
        throw new Error('Invalid timestamp format');
      }

      // Sanitize content to prevent XSS
      const sanitizedContent = this.sanitizeContent(messageData.content);

      // Create message with current timestamp
      const createdAt = new Date();
      const message = await prisma.message.create({
        data: {
          content: sanitizedContent,
          playerId: messageData.playerId,
          tableId: messageData.tableId,
          createdAt
        }
      });

      // Validate that message has timestamp
      if (!message.createdAt) {
        throw new Error('Message must include timestamp');
      }

      // Get player nickname
      const player = await prisma.player.findUnique({
        where: { id: messageData.playerId }
      });

      if (!player) {
        throw new Error('Player not found');
      }

      return {
        id: message.id,
        content: message.content,
        sender: player.nickname,
        timestamp: message.createdAt.toISOString(),
        relativeTime: this.formatRelativeTime(message.createdAt),
        tableId: message.tableId
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create message: ${error.message}`);
      }
      throw new Error('Failed to create message: Unknown error');
    }
  }

  /**
   * Get table messages with formatted timestamps
   */
  async getTableMessages(tableId: number): Promise<ChatMessageOutput[]> {
    try {
      const messages = await prisma.message.findMany({
        where: { tableId },
        include: {
          player: {
            select: { nickname: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to 100 recent messages
      });

      return messages.map(message => ({
        id: message.id,
        content: message.content,
        sender: message.player.nickname,
        timestamp: message.createdAt.toISOString(),
        relativeTime: this.formatRelativeTime(message.createdAt),
        tableId: message.tableId
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve messages: ${error.message}`);
      }
      throw new Error('Failed to retrieve messages: Unknown error');
    }
  }

  /**
   * Format relative time from a date
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Handle future dates or very recent (within 1 minute)
    if (diffInSeconds < 60) {
      return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 365) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
  }

  /**
   * Sanitize message content to prevent XSS attacks
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}

// Export singleton instance
export const chatService = new ChatService();