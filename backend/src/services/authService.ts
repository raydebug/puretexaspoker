import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import type { User } from '@prisma/client';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  chips: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(userId: string): AuthTokens {
    const payload = { userId, type: 'access' };
    const refreshPayload = { userId, type: 'refresh' };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): { userId: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { userId: decoded.userId, type: decoded.type };
    } catch (error) {
      return null;
    }
  }

  /**
   * Register new user
   */
  public async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { username, email, password, displayName } = data;

    // Validate input
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('Username already taken');
      }
      if (existingUser.email === email) {
        throw new Error('Email already registered');
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
        chips: 10000, // Starting chips
        avatar: this.generateDefaultAvatar(username)
      }
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      user: this.formatUserProfile(user),
      tokens
    };
  }

  /**
   * Login user
   */
  public async login(data: LoginData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { username, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      user: this.formatUserProfile(user),
      tokens
    };
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const decoded = this.verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    return this.generateTokens(user.id);
  }

  /**
   * Get user profile by ID
   */
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    return this.formatUserProfile(user);
  }

  /**
   * Update user profile
   */
  public async updateProfile(userId: string, updates: Partial<{
    displayName: string;
    avatar: string;
    email: string;
  }>): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    return this.formatUserProfile(user);
  }

  /**
   * Change password
   */
  public async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await this.verifyPassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });
  }

  /**
   * Update user chips (for game transactions)
   */
  public async updateChips(userId: string, newChipAmount: number): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { chips: Math.max(0, newChipAmount) } // Ensure chips never go negative
    });

    return this.formatUserProfile(user);
  }

  /**
   * Record game statistics
   */
  public async recordGameResult(userId: string, won: boolean, chipsWon: number = 0): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gamesPlayed: { increment: 1 },
        gamesWon: won ? { increment: 1 } : undefined,
        chips: { increment: chipsWon }
      }
    });
  }

  /**
   * Generate default avatar based on username
   */
  private generateDefaultAvatar(username: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    const colorIndex = username.length % colors.length;
    return JSON.stringify({
      type: 'initials',
      initials: username.substring(0, 2).toUpperCase(),
      color: colors[colorIndex]
    });
  }

  /**
   * Format user data for public profile
   */
  private formatUserProfile(user: User): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar || undefined,
      chips: user.chips,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || undefined
    };
  }

  /**
   * Logout user (invalidate tokens - in a real app, you'd maintain a blacklist)
   */
  public async logout(userId: string): Promise<void> {
    // In a production app, you would:
    // 1. Add tokens to a blacklist/redis cache
    // 2. Or use shorter token expiry with refresh mechanism
    // For now, we'll just update the last activity
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }
}

export const authService = AuthService.getInstance(); 