/**
 * Comprehensive Validation Middleware for Nakama Backend
 * Migrated and enhanced from backend validation logic
 */

import { NakamaError, ErrorFactory } from './error_handling';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface PokerActionValidation {
  action: 'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allIn';
  amount?: number;
  playerId: string;
  tableId: string;
}

export interface SeatValidation {
  tableId: string;
  seatNumber: number;
  buyIn: number;
  playerId: string;
}

export interface TableCreationValidation {
  name: string;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
}

/**
 * Validation utility class
 */
export class Validator {
  private readonly logger: nkruntime.Logger;

  constructor(logger: nkruntime.Logger) {
    this.logger = logger;
  }

  /**
   * Validate data against rules
   */
  public validate(data: any, rules: ValidationRule[]): void {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const fieldError = this.validateField(rule.field, value, rule);
      
      if (fieldError) {
        errors.push(fieldError);
      }
    }

    if (errors.length > 0) {
      throw ErrorFactory.validationError(
        `Validation failed: ${errors.join(', ')}`,
        { errors }
      );
    }
  }

  /**
   * Validate individual field
   */
  private validateField(fieldName: string, value: any, rule: ValidationRule): string | null {
    // Required field check
    if (rule.required && (value === undefined || value === null || value === '')) {
      return `${fieldName} is required`;
    }

    // Skip further validation if field is not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type validation
    if (rule.type && !this.validateType(value, rule.type)) {
      return `${fieldName} must be of type ${rule.type}`;
    }

    // String validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${fieldName} must be at least ${rule.minLength} characters long`;
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${fieldName} must be no more than ${rule.maxLength} characters long`;
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return `${fieldName} format is invalid`;
      }
    }

    // Number validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `${fieldName} must be at least ${rule.min}`;
      }
      
      if (rule.max !== undefined && value > rule.max) {
        return `${fieldName} must be no more than ${rule.max}`;
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return `${fieldName} must be one of: ${rule.enum.join(', ')}`;
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        return typeof customResult === 'string' ? customResult : `${fieldName} is invalid`;
      }
    }

    return null;
  }

  /**
   * Validate data type
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate poker action
   */
  public validatePokerAction(action: PokerActionValidation): void {
    const rules: ValidationRule[] = [
      {
        field: 'action',
        required: true,
        type: 'string',
        enum: ['bet', 'call', 'raise', 'fold', 'check', 'allIn']
      },
      {
        field: 'playerId',
        required: true,
        type: 'string',
        minLength: 1
      },
      {
        field: 'tableId', 
        required: true,
        type: 'string',
        minLength: 1
      }
    ];

    // Amount validation for betting actions
    if (['bet', 'raise'].includes(action.action)) {
      rules.push({
        field: 'amount',
        required: true,
        type: 'number',
        min: 1,
        custom: (value) => {
          if (!Number.isInteger(value)) {
            return 'Amount must be a whole number';
          }
          return true;
        }
      });
    }

    this.validate(action, rules);
  }

  /**
   * Validate seat selection
   */
  public validateSeatSelection(seat: SeatValidation): void {
    const rules: ValidationRule[] = [
      {
        field: 'tableId',
        required: true,
        type: 'string',
        minLength: 1
      },
      {
        field: 'seatNumber',
        required: true,
        type: 'number',
        min: 1,
        max: 10 // Maximum 10 seats at a table
      },
      {
        field: 'buyIn',
        required: true,
        type: 'number',
        min: 1,
        custom: (value) => {
          if (!Number.isInteger(value)) {
            return 'Buy-in must be a whole number';
          }
          return true;
        }
      },
      {
        field: 'playerId',
        required: true,
        type: 'string',
        minLength: 1
      }
    ];

    this.validate(seat, rules);
  }

  /**
   * Validate table creation
   */
  public validateTableCreation(table: TableCreationValidation): void {
    const rules: ValidationRule[] = [
      {
        field: 'name',
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\s\-_]+$/
      },
      {
        field: 'maxPlayers',
        required: true,
        type: 'number',
        min: 2,
        max: 10
      },
      {
        field: 'smallBlind',
        required: true,
        type: 'number',
        min: 1
      },
      {
        field: 'bigBlind',
        required: true,
        type: 'number',
        min: 2,
        custom: (value) => {
          // Big blind should be at least double the small blind
          // Note: This requires access to smallBlind value, handled in specific validation
          return true;
        }
      },
      {
        field: 'minBuyIn',
        required: true,
        type: 'number',
        min: 1
      },
      {
        field: 'maxBuyIn',
        required: true,
        type: 'number',
        min: 1
      }
    ];

    this.validate(table, rules);

    // Custom cross-field validations
    if (table.bigBlind < table.smallBlind * 2) {
      throw ErrorFactory.validationError('Big blind must be at least double the small blind');
    }

    if (table.maxBuyIn < table.minBuyIn) {
      throw ErrorFactory.validationError('Maximum buy-in must be greater than minimum buy-in');
    }

    if (table.minBuyIn < table.bigBlind * 10) {
      throw ErrorFactory.validationError('Minimum buy-in should be at least 10 times the big blind');
    }
  }

  /**
   * Validate user registration
   */
  public validateUserRegistration(user: any): void {
    const rules: ValidationRule[] = [
      {
        field: 'username',
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/,
        custom: (value) => {
          if (value.toLowerCase().includes('admin') || value.toLowerCase().includes('mod')) {
            return 'Username cannot contain admin or mod';
          }
          return true;
        }
      },
      {
        field: 'email',
        required: true,
        type: 'string',
        maxLength: 255,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      {
        field: 'password',
        required: true,
        type: 'string',
        minLength: 6,
        maxLength: 100,
        custom: (value) => {
          // Password strength validation
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          
          if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
          }
          return true;
        }
      },
      {
        field: 'displayName',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 50
      }
    ];

    this.validate(user, rules);
  }

  /**
   * Validate game action against current game state
   */
  public validateGameAction(
    action: PokerActionValidation,
    gameState: any,
    playerState: any
  ): void {
    // Basic action validation
    this.validatePokerAction(action);

    // Game state validations
    if (gameState.status !== 'playing') {
      throw ErrorFactory.gameStateError('Game is not in playing state');
    }

    if (gameState.currentPlayerId !== action.playerId) {
      throw ErrorFactory.outOfTurnError();
    }

    // Player state validations
    if (!playerState) {
      throw ErrorFactory.notFoundError('Player');
    }

    if (playerState.folded) {
      throw ErrorFactory.gameStateError('Player has already folded');
    }

    if (playerState.chips <= 0 && action.action !== 'allIn') {
      throw ErrorFactory.gameStateError('Player has no chips remaining');
    }

    // Action-specific validations
    switch (action.action) {
      case 'bet':
        if (gameState.currentBet > 0) {
          throw ErrorFactory.invalidBetError('Cannot bet when there is already a bet');
        }
        if (!action.amount || action.amount <= 0) {
          throw ErrorFactory.invalidBetError('Bet amount must be positive');
        }
        if (action.amount > playerState.chips) {
          throw ErrorFactory.insufficientFundsError(action.amount, playerState.chips);
        }
        break;

      case 'raise':
        if (gameState.currentBet === 0) {
          throw ErrorFactory.invalidBetError('Cannot raise without an existing bet');
        }
        if (!action.amount || action.amount <= gameState.currentBet) {
          throw ErrorFactory.invalidBetError('Raise amount must be greater than current bet');
        }
        if (action.amount > playerState.chips) {
          throw ErrorFactory.insufficientFundsError(action.amount, playerState.chips);
        }
        break;

      case 'call':
        if (gameState.currentBet === 0) {
          throw ErrorFactory.invalidBetError('Cannot call without an existing bet');
        }
        const callAmount = gameState.currentBet - (playerState.currentBet || 0);
        if (callAmount > playerState.chips) {
          throw ErrorFactory.insufficientFundsError(callAmount, playerState.chips);
        }
        break;

      case 'check':
        if (gameState.currentBet > (playerState.currentBet || 0)) {
          throw ErrorFactory.invalidBetError('Cannot check when there is a bet to call');
        }
        break;

      case 'allIn':
        if (playerState.chips <= 0) {
          throw ErrorFactory.insufficientFundsError(1, 0);
        }
        break;

      case 'fold':
        // Fold is always valid
        break;
    }
  }

  /**
   * Validate buy-in amount against table limits
   */
  public validateBuyIn(buyIn: number, table: any): void {
    if (buyIn < table.minBuyIn) {
      throw ErrorFactory.validationError(
        `Buy-in must be at least ${table.minBuyIn}`,
        { minBuyIn: table.minBuyIn, provided: buyIn }
      );
    }

    if (buyIn > table.maxBuyIn) {
      throw ErrorFactory.validationError(
        `Buy-in cannot exceed ${table.maxBuyIn}`,
        { maxBuyIn: table.maxBuyIn, provided: buyIn }
      );
    }
  }

  /**
   * Sanitize user input
   */
  public sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate chat message
   */
  public validateChatMessage(message: string, playerId: string): void {
    const rules: ValidationRule[] = [
      {
        field: 'message',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 500
      },
      {
        field: 'playerId',
        required: true,
        type: 'string',
        minLength: 1
      }
    ];

    this.validate({ message, playerId }, rules);

    // Content moderation
    const sanitized = this.sanitizeInput(message);
    if (sanitized !== message) {
      throw ErrorFactory.validationError('Message contains invalid characters');
    }

    // Basic profanity check (can be expanded)
    const profanityWords = ['spam', 'cheat', 'hack']; // Basic list
    const lowerMessage = message.toLowerCase();
    
    for (const word of profanityWords) {
      if (lowerMessage.includes(word)) {
        this.logger.warn(`Potential inappropriate content from ${playerId}: ${message}`);
        break;
      }
    }
  }

  /**
   * Validate pagination parameters
   */
  public validatePagination(limit?: number, offset?: number): { limit: number; offset: number } {
    const validatedLimit = Math.min(Math.max(limit || 20, 1), 100);
    const validatedOffset = Math.max(offset || 0, 0);

    return { limit: validatedLimit, offset: validatedOffset };
  }
}

/**
 * Pre-built validation schemas
 */
export const ValidationSchemas = {
  userRegistration: [
    { field: 'username', required: true, type: 'string' as const, minLength: 3, maxLength: 20 },
    { field: 'email', required: true, type: 'string' as const, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { field: 'password', required: true, type: 'string' as const, minLength: 6 },
    { field: 'displayName', required: true, type: 'string' as const, minLength: 2, maxLength: 50 }
  ],

  tableCreation: [
    { field: 'name', required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    { field: 'maxPlayers', required: true, type: 'number' as const, min: 2, max: 10 },
    { field: 'smallBlind', required: true, type: 'number' as const, min: 1 },
    { field: 'bigBlind', required: true, type: 'number' as const, min: 2 }
  ],

  pokerAction: [
    { field: 'action', required: true, type: 'string' as const, enum: ['bet', 'call', 'raise', 'fold', 'check', 'allIn'] },
    { field: 'playerId', required: true, type: 'string' as const, minLength: 1 },
    { field: 'tableId', required: true, type: 'string' as const, minLength: 1 }
  ]
};
