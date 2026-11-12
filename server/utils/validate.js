import { ApiError } from './ApiError.js';

export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  universityEmail: /^[^\s@]+@([a-z0-9-]+\.)*diu\.edu\.bd$/i,
  studentId: /^\d{3}-\d{2}-\d{3,5}$/,
  phone: /^(\+?880|0)1[3-9]\d{8}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{6,64}$/,
};

// Control characters except tab/newline/carriage return.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

/** Remove HTML tags / control chars and trim. Keeps text readable but harmless. */
export const clean = (value, max = 2000) => {
  if (value === undefined || value === null) return '';
  return String(value).replace(/<[^>]*>/g, '').replace(CONTROL_CHARS, '').trim().slice(0, max);
};

export const normalizePhone = (p) => clean(p, 20).replace(/[\s-]/g, '');

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Collects field errors; call assert() at the end. */
export class Validator {
  constructor() { this.errors = {}; }
  required(field, value, label = field) {
    if (value === undefined || value === null || String(value).trim() === '') this.errors[field] = `${label} is required`;
    return this;
  }
  match(field, value, regex, message) {
    if (value && !regex.test(String(value))) this.errors[field] = message;
    return this;
  }
  length(field, value, min, max, label = field) {
    const len = String(value || '').trim().length;
    if (value && (len < min || len > max)) this.errors[field] = `${label} must be ${min}-${max} characters`;
    return this;
  }
  oneOf(field, value, list, label = field) {
    if (value && !list.includes(value)) this.errors[field] = `${label} must be one of: ${list.join(', ')}`;
    return this;
  }
  custom(field, condition, message) {
    if (!condition && !this.errors[field]) this.errors[field] = message;
    return this;
  }
  assert() {
    if (Object.keys(this.errors).length) {
      const first = Object.values(this.errors)[0];
      throw ApiError.badRequest(first, this.errors);
    }
  }
}
