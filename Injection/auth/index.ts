/**
 * AstraAPI Auth System
 * JWT + OAuth2 authentication
 */

import { UnauthorizedException, ForbiddenException } from "../exception";
import type { AstraContext, MiddlewareFunction } from "../../core/types";
import type { Guard } from "../decorators/auth";

/**
 * JWT Configuration
 */
export interface JWTConfig {
    /** Secret key for signing tokens */
    secret: string;
    /** Token expiration time (e.g., "1h", "7d", 3600) */
    expiresIn?: string | number;
    /** Issuer claim */
    issuer?: string;
    /** Audience claim */
    audience?: string;
    /** Algorithm (default: HS256) */
    algorithm?: "HS256" | "HS384" | "HS512";
}

/**
 * JWT Payload interface
 */
export interface JWTPayload {
    sub: string | number;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
    [key: string]: unknown;
}

/**
 * AstraAuth - JWT Authentication Service
 */
export class AstraAuth {
    private config: Required<JWTConfig>;

    constructor(config: JWTConfig) {
        this.config = {
            secret: config.secret,
            expiresIn: config.expiresIn || "1h",
            issuer: config.issuer || "astraapi",
            audience: config.audience || "astraapi",
            algorithm: config.algorithm || "HS256",
        };
    }

    /**
     * Sign a JWT token
     */
    async sign(payload: JWTPayload): Promise<string> {
        const header = {
            alg: this.config.algorithm,
            typ: "JWT",
        };

        const now = Math.floor(Date.now() / 1000);
        const exp = this.calculateExpiry(now);

        const fullPayload = {
            ...payload,
            iat: now,
            exp,
            iss: this.config.issuer,
            aud: this.config.audience,
        };

        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));

        const signature = await this.createSignature(
            `${encodedHeader}.${encodedPayload}`,
            this.config.secret
        );

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    /**
     * Verify and decode a JWT token
     */
    async verify(token: string): Promise<JWTPayload> {
        const parts = token.split(".");
        if (parts.length !== 3) {
            throw new UnauthorizedException("Invalid token format");
        }

        const [encodedHeader, encodedPayload, signature] = parts;

        // Verify signature
        const expectedSignature = await this.createSignature(
            `${encodedHeader}.${encodedPayload}`,
            this.config.secret
        );

        if (signature !== expectedSignature) {
            throw new UnauthorizedException("Invalid token signature");
        }

        // Decode payload
        const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as JWTPayload;

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            throw new UnauthorizedException("Token expired");
        }

        return payload;
    }

    /**
     * Decode without verification (for debugging)
     */
    decode(token: string): JWTPayload | null {
        try {
            const parts = token.split(".");
            if (parts.length !== 3) return null;
            return JSON.parse(this.base64UrlDecode(parts[1])) as JWTPayload;
        } catch {
            return null;
        }
    }

    /**
     * Refresh a token
     */
    async refresh(token: string): Promise<string> {
        const payload = await this.verify(token);
        delete payload.iat;
        delete payload.exp;
        return this.sign(payload);
    }

    private calculateExpiry(now: number): number {
        const expiresIn = this.config.expiresIn;

        if (typeof expiresIn === "number") {
            return now + expiresIn;
        }

        // Parse string like "1h", "7d", "30m"
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) {
            return now + 3600; // Default 1 hour
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        const multipliers: Record<string, number> = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
        };

        return now + value * multipliers[unit];
    }

    private async createSignature(data: string, secret: string): Promise<string> {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
        return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
    }

    private base64UrlEncode(str: string): string {
        const base64 = btoa(str);
        return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    }

    private base64UrlDecode(str: string): string {
        let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        const padding = base64.length % 4;
        if (padding) {
            base64 += "=".repeat(4 - padding);
        }
        return atob(base64);
    }
}

/**
 * Create a JWT auth instance
 */
export function createAuth(config: JWTConfig): AstraAuth {
    return new AstraAuth(config);
}

/**
 * Auth Guard - Protects routes with JWT authentication
 */
export class AuthGuard implements Guard {
    constructor(private auth: AstraAuth) { }

    async canActivate(ctx: AstraContext): Promise<boolean> {
        const authHeader = ctx.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("No token provided");
        }

        const token = authHeader.slice(7);

        try {
            const payload = await this.auth.verify(token);
            ctx.user = payload;
            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException("Invalid token");
        }
    }
}

/**
 * Create an auth guard middleware
 */
export function createAuthMiddleware(auth: AstraAuth): MiddlewareFunction {
    return async (ctx, next) => {
        const guard = new AuthGuard(auth);
        await guard.canActivate(ctx);
        return next();
    };
}

/**
 * Optional auth middleware - doesn't throw if no token
 */
export function createOptionalAuthMiddleware(auth: AstraAuth): MiddlewareFunction {
    return async (ctx, next) => {
        const authHeader = ctx.headers.get("Authorization");

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            try {
                const payload = await auth.verify(token);
                ctx.user = payload;
            } catch {
                // Ignore errors for optional auth
            }
        }

        return next();
    };
}

/**
 * Password hashing utilities
 */
export const Password = {
    /**
     * Hash a password
     */
    async hash(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    },

    /**
     * Verify a password against a hash
     */
    async verify(password: string, hash: string): Promise<boolean> {
        const passwordHash = await this.hash(password);
        return passwordHash === hash;
    },

    /**
     * Generate a random token
     */
    generateToken(length: number = 32): string {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
    },
};

/**
 * OAuth2 Provider interface
 */
export interface OAuth2Provider {
    name: string;
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri: string;
}

/**
 * OAuth2 helper class
 */
export class OAuth2 {
    constructor(private provider: OAuth2Provider) { }

    /**
     * Get authorization URL
     */
    getAuthUrl(state?: string): string {
        const params = new URLSearchParams({
            client_id: this.provider.clientId,
            redirect_uri: this.provider.redirectUri,
            response_type: "code",
            scope: this.provider.scopes.join(" "),
        });

        if (state) {
            params.set("state", state);
        }

        return `${this.provider.authUrl}?${params.toString()}`;
    }

    /**
     * Exchange code for tokens
     */
    async getToken(code: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
    }> {
        const response = await fetch(this.provider.tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: this.provider.clientId,
                client_secret: this.provider.clientSecret,
                code,
                redirect_uri: this.provider.redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to exchange code for token");
        }

        return response.json();
    }
}

/**
 * Pre-configured OAuth2 providers
 */
export const OAuth2Providers = {
    google: (config: { clientId: string; clientSecret: string; redirectUri: string }): OAuth2Provider => ({
        name: "google",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        scopes: ["openid", "email", "profile"],
    }),

    github: (config: { clientId: string; clientSecret: string; redirectUri: string }): OAuth2Provider => ({
        name: "github",
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        scopes: ["user:email"],
    }),
};
