/**
 * AstraAPI Exception System
 * HTTP exceptions with proper error responses
 */

import type { HttpExceptionOptions, ValidationError } from "../core/types";

/**
 * Base HTTP Exception class
 * All custom exceptions should extend this
 */
export class HttpException extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly details?: unknown;
    public readonly timestamp: string;

    constructor(options: HttpExceptionOptions) {
        super(options.message);
        this.name = "HttpException";
        this.status = options.status;
        this.code = options.code || this.getDefaultCode(options.status);
        this.details = options.details;
        this.timestamp = new Date().toISOString();

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace?.(this, this.constructor);
    }

    private getDefaultCode(status: number): string {
        const codes: Record<number, string> = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "TOO_MANY_REQUESTS",
            500: "INTERNAL_SERVER_ERROR",
            502: "BAD_GATEWAY",
            503: "SERVICE_UNAVAILABLE",
        };
        return codes[status] || "UNKNOWN_ERROR";
    }

    toJSON() {
        return {
            success: false,
            error: {
                status: this.status,
                code: this.code,
                message: this.message,
                details: this.details,
                timestamp: this.timestamp,
            },
        };
    }

    toResponse(): Response {
        return new Response(JSON.stringify(this.toJSON()), {
            status: this.status,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}

// ============================================
// Common HTTP Exceptions
// ============================================

export class BadRequestException extends HttpException {
    constructor(message = "Bad Request", details?: unknown) {
        super({ status: 400, message, details });
        this.name = "BadRequestException";
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message = "Unauthorized", details?: unknown) {
        super({ status: 401, message, details });
        this.name = "UnauthorizedException";
    }
}

export class ForbiddenException extends HttpException {
    constructor(message = "Forbidden", details?: unknown) {
        super({ status: 403, message, details });
        this.name = "ForbiddenException";
    }
}

export class NotFoundException extends HttpException {
    constructor(message = "Not Found", details?: unknown) {
        super({ status: 404, message, details });
        this.name = "NotFoundException";
    }
}

export class MethodNotAllowedException extends HttpException {
    constructor(message = "Method Not Allowed", details?: unknown) {
        super({ status: 405, message, details });
        this.name = "MethodNotAllowedException";
    }
}

export class ConflictException extends HttpException {
    constructor(message = "Conflict", details?: unknown) {
        super({ status: 409, message, details });
        this.name = "ConflictException";
    }
}

export class ValidationException extends HttpException {
    public readonly errors: ValidationError[];

    constructor(errors: ValidationError[], message = "Validation Failed") {
        super({ status: 422, message, details: errors });
        this.name = "ValidationException";
        this.errors = errors;
    }

    toJSON() {
        return {
            success: false,
            error: {
                status: this.status,
                code: "VALIDATION_ERROR",
                message: this.message,
                errors: this.errors,
                timestamp: this.timestamp,
            },
        };
    }
}

export class TooManyRequestsException extends HttpException {
    public readonly retryAfter?: number;

    constructor(message = "Too Many Requests", retryAfter?: number) {
        super({ status: 429, message });
        this.name = "TooManyRequestsException";
        this.retryAfter = retryAfter;
    }

    toResponse(): Response {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (this.retryAfter) {
            headers["Retry-After"] = String(this.retryAfter);
        }
        return new Response(JSON.stringify(this.toJSON()), {
            status: this.status,
            headers,
        });
    }
}

export class InternalServerException extends HttpException {
    constructor(message = "Internal Server Error", details?: unknown) {
        super({ status: 500, message, details });
        this.name = "InternalServerException";
    }
}

export class ServiceUnavailableException extends HttpException {
    constructor(message = "Service Unavailable", details?: unknown) {
        super({ status: 503, message, details });
        this.name = "ServiceUnavailableException";
    }
}

// ============================================
// Exception Handler
// ============================================

export function handleException(error: unknown): Response {
    // If it's already an HttpException, use its response
    if (error instanceof HttpException) {
        return error.toResponse();
    }

    // Handle Zod validation errors
    if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const validationErrors: ValidationError[] = zodError.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
        return new ValidationException(validationErrors).toResponse();
    }

    // Handle standard errors
    if (error instanceof Error) {
        console.error("[AstraAPI Error]", error.stack || error.message);
        return new InternalServerException(
            process.env.NODE_ENV === "production" ? "Internal Server Error" : error.message
        ).toResponse();
    }

    // Unknown error type
    console.error("[AstraAPI Error]", error);
    return new InternalServerException("An unexpected error occurred").toResponse();
}
