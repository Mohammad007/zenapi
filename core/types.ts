/**
 * AstraAPI Core Types
 * All TypeScript types and interfaces for the framework
 */

import type { Server } from "bun";
import type { ZodSchema } from "zod";

// ============================================
// HTTP Types
// ============================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export interface RouteDefinition {
    method: HttpMethod;
    path: string;
    handler: string;
    middlewares: MiddlewareFunction[];
    bodySchema?: ZodSchema;
    querySchema?: ZodSchema;
    paramsSchema?: ZodSchema;
    responseSchema?: ZodSchema;
    description?: string;
    tags?: string[];
    summary?: string;
}

export interface ControllerDefinition {
    prefix: string;
    target: ControllerClass;
    routes: RouteDefinition[];
    middlewares: MiddlewareFunction[];
    tags?: string[];
}

// ============================================
// Context Types
// ============================================

export interface AstraContext {
    req: Request;
    params: Record<string, string>;
    query: Record<string, string>;
    body: unknown;
    headers: Headers;
    state: Map<string, unknown>;
    user?: unknown;

    // Response helpers
    json: <T>(data: T, status?: number) => Response;
    text: (data: string, status?: number) => Response;
    html: (data: string, status?: number) => Response;
    redirect: (url: string, status?: number) => Response;
    status: (code: number) => AstraContext;

    // Request helpers
    getHeader: (name: string) => string | null;
    getCookie: (name: string) => string | undefined;
    setCookie: (name: string, value: string, options?: CookieOptions) => void;
}

export interface CookieOptions {
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
}

// ============================================
// Middleware Types
// ============================================

export type NextFunction = () => Promise<Response> | Response;

export type MiddlewareFunction = (
    ctx: AstraContext,
    next: NextFunction
) => Promise<Response> | Response;

export interface MiddlewareDefinition {
    name: string;
    handler: MiddlewareFunction;
    global?: boolean;
}

// ============================================
// Dependency Injection Types
// ============================================

export type ServiceIdentifier<T = unknown> = string | symbol | Constructor<T>;

export interface Constructor<T = unknown> {
    new(...args: unknown[]): T;
}

export interface ProviderDefinition<T = unknown> {
    provide: ServiceIdentifier<T>;
    useClass?: Constructor<T>;
    useValue?: T;
    useFactory?: () => T | Promise<T>;
    singleton?: boolean;
}

// ============================================
// Controller Types
// ============================================

export interface ControllerClass {
    new(...args: unknown[]): unknown;
}

export interface ControllerMetadata {
    prefix: string;
    middlewares: MiddlewareFunction[];
    tags?: string[];
}

// ============================================
// Parameter Decorator Types
// ============================================

export type ParamType = "body" | "query" | "params" | "headers" | "ctx" | "user" | "custom";

export interface ParamMetadata {
    type: ParamType;
    index: number;
    key?: string;
    schema?: ZodSchema;
    transform?: (value: unknown) => unknown;
}

// ============================================
// Server Types
// ============================================

export interface AstraServerOptions {
    port?: number;
    hostname?: string;
    development?: boolean;
    cors?: CorsOptions | boolean;
    logging?: boolean | LoggingOptions;
    prefix?: string;
    openapi?: OpenAPIOptions;
    rateLimit?: RateLimitOptions;
    compression?: boolean;
}

export interface CorsOptions {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: HttpMethod[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}

export interface LoggingOptions {
    level?: "debug" | "info" | "warn" | "error";
    format?: "json" | "pretty";
    timestamp?: boolean;
}

export interface OpenAPIOptions {
    enabled?: boolean;
    path?: string;
    info?: {
        title?: string;
        version?: string;
        description?: string;
    };
    servers?: { url: string; description?: string }[];
}

export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string;
}

// ============================================
// Exception Types
// ============================================

export interface HttpExceptionOptions {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
}

// ============================================
// Validation Types
// ============================================

export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

export interface ValidationResult {
    success: boolean;
    data?: unknown;
    errors?: ValidationError[];
}

// ============================================
// Metadata Keys
// ============================================

export const METADATA_KEYS = {
    CONTROLLER: Symbol("controller"),
    ROUTES: Symbol("routes"),
    PARAMS: Symbol("params"),
    MIDDLEWARES: Symbol("middlewares"),
    INJECTABLE: Symbol("injectable"),
    INJECT: Symbol("inject"),
    GUARDS: Symbol("guards"),
} as const;

// ============================================
// Response Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: ValidationError[];
    meta?: {
        timestamp: string;
        requestId?: string;
        [key: string]: unknown;
    };
}
