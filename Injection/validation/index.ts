/**
 * ZenAPI Validation with Zod
 * Schema validation utilities for request/response
 */

import { z, type ZodSchema, type ZodError, type ZodIssue } from "zod";
import { ValidationException } from "../exception";
import type { ValidationError, ValidationResult } from "../../core/types";

/**
 * Validate data against a Zod schema
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult {
    const result = schema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data,
        };
    }

    return {
        success: false,
        errors: formatZodErrors(result.error),
    };
}

/**
 * Validate or throw exception
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);

    if (!result.success) {
        throw new ValidationException(formatZodErrors(result.error));
    }

    return result.data;
}

/**
 * Format Zod errors to ValidationError array
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
    return error.issues.map((issue: ZodIssue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
    }));
}

/**
 * Create a validation middleware
 */
export function validateBody<T>(schema: ZodSchema<T>) {
    return async (ctx: any, next: () => Promise<Response>) => {
        ctx.body = validateOrThrow(schema, ctx.body);
        return next();
    };
}

/**
 * Create query validation middleware
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return async (ctx: any, next: () => Promise<Response>) => {
        ctx.query = validateOrThrow(schema, ctx.query);
        return next();
    };
}

/**
 * Create params validation middleware
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return async (ctx: any, next: () => Promise<Response>) => {
        ctx.params = validateOrThrow(schema, ctx.params);
        return next();
    };
}

// ============================================
// Common Zod Schemas (Prebuilt)
// ============================================

/**
 * Common ID schema (positive integer)
 */
export const IdSchema = z.coerce.number().int().positive();

/**
 * Common UUID schema
 */
export const UuidSchema = z.string().uuid();

/**
 * Common email schema
 */
export const EmailSchema = z.string().email();

/**
 * Common pagination schema
 */
export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Create a paginated response schema
 */
export function createPaginatedSchema<T extends ZodSchema>(itemSchema: T) {
    return z.object({
        items: z.array(itemSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
    });
}

// Re-export Zod for convenience
export { z };
export type { ZodSchema, ZodError };
