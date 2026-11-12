import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { connectDB } from '../config/db.js';

/** Recursively drop keys starting with "$" or containing "." (NoSQL injection guard). */
function scrub(obj) {
  if (Array.isArray(obj)) return obj.map(scrub);
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) delete obj[key];
      else obj[key] = scrub(obj[key]);
    }
  }
  return obj;
}

export const sanitizeRequest = (req, _res, next) => {
  if (req.body) scrub(req.body);
  if (req.params) scrub(req.params);
  if (req.query) {
    // Express 4 query object is mutable; flatten arrays/objects to plain strings
    for (const k of Object.keys(req.query)) {
      if (k.startsWith('$') || k.includes('.')) delete req.query[k];
      else if (typeof req.query[k] !== 'string') req.query[k] = String(Array.isArray(req.query[k]) ? req.query[k][0] : '');
    }
  }
  next();
};

export const ensureDb = async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    next(new ApiError(503, 'Database unavailable. Check MONGODB_URI configuration.'));
  }
};

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = Object.values(details)[0] || 'Validation failed';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field === 'studentId' ? 'student ID' : field} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(details ? { errors: details } : {}),
  });
};
