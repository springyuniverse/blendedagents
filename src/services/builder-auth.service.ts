import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import sql from '../lib/db.js';
import { AuthService } from './auth.service.js';
import type { Builder } from '../models/builder.js';

const JWT_SECRET = process.env.BUILDER_JWT_SECRET || 'dev-jwt-secret';
const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export interface JwtPayload {
  builderId: string;
  email: string;
}

export const BuilderAuthService = {
  /**
   * Hash a password using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * Compare a plaintext password against a hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Generate a JWT for the given builder.
   */
  generateToken(builder: { id: string; email: string }): string {
    const payload: JwtPayload = { builderId: builder.id, email: builder.email };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  },

  /**
   * Verify and decode a JWT. Returns null if invalid.
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  },

  /**
   * Register a new builder with email/password.
   * Returns the builder, API key (shown once), and JWT token.
   */
  async signup(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ builder: Builder; apiKey: string; token: string }> {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    // Check if email is already registered
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM builders WHERE email = ${email}
    `;
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await this.hashPassword(password);
    const emailVerificationToken = randomBytes(32).toString('hex');

    // Create the builder with password hash
    const [builder] = await sql<Builder[]>`
      INSERT INTO builders (display_name, email, password_hash, email_verification_token)
      VALUES (${displayName}, ${email}, ${passwordHash}, ${emailVerificationToken})
      RETURNING *
    `;

    // Create API key
    const { key: apiKey } = await AuthService.createApiKey(builder.id, 'default');

    // Create initial credit balance
    await sql`
      INSERT INTO credit_balances (builder_id, available, reserved)
      VALUES (${builder.id}, 0, 0)
      ON CONFLICT (builder_id) DO NOTHING
    `;

    const token = this.generateToken(builder);

    return { builder, apiKey, token };
  },

  /**
   * Log in a builder with email/password.
   * Returns the builder and a JWT token.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ builder: Builder; token: string }> {
    const [builder] = await sql<(Builder & { password_hash: string | null })[]>`
      SELECT * FROM builders WHERE email = ${email}
    `;

    if (!builder || !builder.password_hash) {
      throw new Error('Invalid email or password');
    }

    const valid = await this.comparePassword(password, builder.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(builder);
    return { builder, token };
  },

  /**
   * Generate a password reset token for the given email.
   * Returns the token (in production, this would be emailed).
   */
  async forgotPassword(email: string): Promise<string | null> {
    const [builder] = await sql<{ id: string }[]>`
      SELECT id FROM builders WHERE email = ${email}
    `;

    if (!builder) {
      // Don't reveal whether email exists
      return null;
    }

    const resetToken = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await sql`
      UPDATE builders
      SET password_reset_token = ${resetToken},
          password_reset_expires = ${expires}
      WHERE id = ${builder.id}
    `;

    return resetToken;
  },

  /**
   * Reset a password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const [builder] = await sql<{ id: string; password_reset_expires: Date | null }[]>`
      SELECT id, password_reset_expires FROM builders
      WHERE password_reset_token = ${token}
    `;

    if (!builder) {
      throw new Error('Invalid or expired reset token');
    }

    if (!builder.password_reset_expires || new Date() > builder.password_reset_expires) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await sql`
      UPDATE builders
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ${builder.id}
    `;
  },

  /**
   * Verify a builder's email using the verification token.
   */
  async verifyEmail(token: string): Promise<void> {
    const result = await sql`
      UPDATE builders
      SET email_verified = true,
          email_verification_token = NULL
      WHERE email_verification_token = ${token}
    `;

    if (result.count === 0) {
      throw new Error('Invalid verification token');
    }
  },

  /**
   * Find a builder by ID (for JWT auth flow).
   */
  async findById(id: string): Promise<Builder | null> {
    const [row] = await sql<Builder[]>`SELECT * FROM builders WHERE id = ${id}`;
    return row ?? null;
  },
};
