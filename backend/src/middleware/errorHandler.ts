import { Request, Response, NextFunction } from 'express';

export interface StandardErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path: string;
    details?: any;
  };
}

export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.details = details;
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 500: return 'INTERNAL_SERVER_ERROR';
      default: return 'UNKNOWN_ERROR';
    }
  }
}

// Predefined error creators for common scenarios
export const createValidationError = (message: string, details?: any) => 
  new APIError(message, 422, 'VALIDATION_ERROR', details);

export const createNotFoundError = (resource: string) => 
  new APIError(`${resource} not found`, 404, 'NOT_FOUND');

export const createConflictError = (message: string, details?: any) => 
  new APIError(message, 409, 'CONFLICT', details);

export const createAuthError = (message: string = 'Authentication required') => 
  new APIError(message, 401, 'UNAUTHORIZED');

// Middleware to handle errors and send standardized responses
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[${new Date().toISOString()}] API Error:`, {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma errors
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        code = 'UNIQUE_CONSTRAINT_VIOLATION';
        message = 'A record with this information already exists';
        details = { fields: prismaError.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        code = 'RECORD_NOT_FOUND';
        message = 'The requested record was not found';
        break;
      default:
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
        details = { prismaCode: prismaError.code };
    }
  }

  const errorResponse: StandardErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      ...(details && { details })
    }
  };

  res.status(statusCode).json(errorResponse);
};

// Helper function to send standardized success responses
export const sendSuccess = <T>(res: Response, data: T, statusCode: number = 200): void => {
  const response: StandardSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  res.status(statusCode).json(response);
};

// Async handler wrapper to catch async errors
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}; 