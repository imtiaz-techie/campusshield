export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
  static badRequest(msg, details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to perform this action') { return new ApiError(403, msg); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Uniform API response shape: { success, message, data, meta } */
export const ok = (res, data = null, message = 'OK', meta) =>
  res.status(200).json({ success: true, message, data, ...(meta ? { meta } : {}) });

export const created = (res, data = null, message = 'Created') =>
  res.status(201).json({ success: true, message, data });
