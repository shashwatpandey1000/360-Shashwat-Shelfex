import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: unknown = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res: Response, data: unknown = null, message = 'Created') {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(res: Response, message = 'Something went wrong', statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  static badRequest(res: Response, message = 'Bad request') {
    return ApiResponse.error(res, message, 400);
  }

  static unauthorized(res: Response, message = 'Authentication required') {
    return ApiResponse.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Access denied') {
    return ApiResponse.error(res, message, 403);
  }

  static notFound(res: Response, message = 'Resource not found') {
    return ApiResponse.error(res, message, 404);
  }
}
