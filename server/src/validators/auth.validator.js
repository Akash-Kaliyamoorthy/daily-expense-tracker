'use strict';

const { z } = require('zod');
const { requiredText } = require('./common');

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(255, 'Email is too long')
  .email('Enter a valid email address');

const register = z.object({
  name: requiredText(100, 'Name'),
  email,
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    // bcrypt only uses the first 72 BYTES, so longer passwords would be silently truncated.
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password is too long (max 72 bytes)',
    ),
});

const login = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

module.exports = { register, login };
