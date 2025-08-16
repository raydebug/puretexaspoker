import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import type { User } from '@prisma/client';
import { roleManager } from './roleManager';

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
  tablesPlayed: number;
  tablesWon: number;
  createdAt: Date;
  lastLoginAt?: Date;
  // USER ROLE MANAGEMENT: Enhanced user profile with role information
  role?: {
    name: string;
    displayName: string;
    level: number;
    permissions: string[];
  };
  isActive: boolean;
  isBanned: boolean;
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

    // USER ROLE MANAGEMENT: Get default player role
    const defaultRole = await prisma.role.findUnique({ where: { name: 'player' } });
    if (!defaultRole) {
      throw new Error('Default role not found. Please initialize roles first.');
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
        chips: 10000, // Starting chips
        avatar: this.generateDefaultAvatar(username),
        roleId: defaultRole.id
      }
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Note: We don't set lastLoginAt during registration - only during actual login

    return {
      user: await this.formatUserProfile(user),
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

    // USER ROLE MANAGEMENT: Check if user is banned or inactive
    if (user.isBanned) {
      throw new Error('Account is banned. Please contact support.');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive. Please contact support.');
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
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() }
    });

    return {
      user: await this.formatUserProfile(user),
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

    // USER ROLE MANAGEMENT: Check if user is still active
    if (!user.isActive || user.isBanned) {
      throw new Error('Account is no longer active');
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

    return await this.formatUserProfile(user);
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

    return await this.formatUserProfile(user);
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

    return await this.formatUserProfile(user);
  }

  /**
   * Record game statistics
   */
  public async recordGameResult(userId: string, won: boolean, chipsWon: number = 0): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tablesPlayed: { increment: 1 },
        tablesWon: won ? { increment: 1 } : undefined,
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
  private async formatUserProfile(user: User): Promise<UserProfile> {
    // USER ROLE MANAGEMENT: Get role information
    const roleInfo = await roleManager.getUserRoleInfo(user.id);
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar || undefined,
      chips: user.chips,
      tablesPlayed: user.tablesPlayed,
      tablesWon: user.tablesWon,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || undefined,
      role: roleInfo ? {
        name: roleInfo.role.name,
        displayName: roleInfo.role.displayName,
        level: roleInfo.role.level,
        permissions: roleInfo.role.permissions
      } : undefined,
      isActive: user.isActive,
      isBanned: user.isBanned
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

  // USER ROLE MANAGEMENT: Check if user has permission for an action
  public async hasPermission(userId: string, permission: string): Promise<boolean> {
    return await roleManager.hasPermission(userId, permission);
  }

  // USER ROLE MANAGEMENT: Get user's role information
  public async getUserRole(userId: string) {
    return await roleManager.getUserRoleInfo(userId);
  }
}

export const authService = AuthService.getInstance(); 