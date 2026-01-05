/**
 * AstraAPI Route Decorators
 * HTTP method decorators for defining API endpoints
 */

import type { HttpMethod, RouteDefinition, MiddlewareFunction } from "../../core/types";
import { METADATA_KEYS } from "../../core/types";
import type { ZodSchema } from "zod";

export interface RouteOptions {
    /** Route path */
    path?: string;
    /** Summary for OpenAPI */
    summary?: string;
    /** Description for OpenAPI */
    description?: string;
    /** Tags for OpenAPI */
    tags?: string[];
    /** Middleware for this route */
    middlewares?: MiddlewareFunction[];
    /** Response schema for validation */
    responseSchema?: ZodSchema;
}

/**
 * Create a route decorator factory
 */
function createRouteDecorator(method: HttpMethod) {
    return function (pathOrOptions?: string | RouteOptions): MethodDecorator {
        return (target, propertyKey, descriptor) => {
            let path = "/";
            let options: RouteOptions = {};

            if (typeof pathOrOptions === "string") {
                path = pathOrOptions;
            } else if (pathOrOptions) {
                path = pathOrOptions.path || "/";
                options = pathOrOptions;
            }

            // Get existing routes or create new array
            const existingRoutes: RouteDefinition[] =
                Reflect.getMetadata?.(METADATA_KEYS.ROUTES, target) || [];

            // Create route definition
            const routeDef: RouteDefinition = {
                method,
                path,
                handler: propertyKey as string,
                middlewares: options.middlewares || [],
                summary: options.summary,
                description: options.description,
                tags: options.tags,
                responseSchema: options.responseSchema,
            };

            // Add to routes
            existingRoutes.push(routeDef);

            // Store metadata
            Reflect.defineMetadata?.(METADATA_KEYS.ROUTES, existingRoutes, target);

            return descriptor;
        };
    };
}

/**
 * @Get decorator - Handle GET requests
 * 
 * @example
 * ```ts
 * @Get("/users")
 * getUsers() {
 *   return []
 * }
 * ```
 */
export const Get = createRouteDecorator("GET");

/**
 * @Post decorator - Handle POST requests
 * 
 * @example
 * ```ts
 * @Post("/users")
 * createUser(@Body() data: CreateUserDTO) {
 *   return data
 * }
 * ```
 */
export const Post = createRouteDecorator("POST");

/**
 * @Put decorator - Handle PUT requests
 */
export const Put = createRouteDecorator("PUT");

/**
 * @Patch decorator - Handle PATCH requests
 */
export const Patch = createRouteDecorator("PATCH");

/**
 * @Delete decorator - Handle DELETE requests
 */
export const Delete = createRouteDecorator("DELETE");

/**
 * @Options decorator - Handle OPTIONS requests
 */
export const Options = createRouteDecorator("OPTIONS");

/**
 * @Head decorator - Handle HEAD requests
 */
export const Head = createRouteDecorator("HEAD");

/**
 * Use decorator - Apply middleware to a route
 * 
 * @example
 * ```ts
 * @Use(AuthGuard)
 * @Get("/protected")
 * protectedRoute() {}
 * ```
 */
export function Use(...middlewares: MiddlewareFunction[]): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        const existingMiddlewares: MiddlewareFunction[] =
            Reflect.getMetadata?.(METADATA_KEYS.MIDDLEWARES, target, propertyKey as string) || [];

        Reflect.defineMetadata?.(
            METADATA_KEYS.MIDDLEWARES,
            [...existingMiddlewares, ...middlewares],
            target,
            propertyKey as string
        );

        return descriptor;
    };
}

/**
 * ApiOperation decorator - Add OpenAPI operation metadata
 */
export function ApiOperation(options: { summary?: string; description?: string }): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        const existingRoutes: RouteDefinition[] =
            Reflect.getMetadata?.(METADATA_KEYS.ROUTES, target) || [];

        // Find and update the route
        const routeIndex = existingRoutes.findIndex(r => r.handler === propertyKey);
        if (routeIndex >= 0) {
            existingRoutes[routeIndex] = {
                ...existingRoutes[routeIndex],
                ...options,
            };
            Reflect.defineMetadata?.(METADATA_KEYS.ROUTES, existingRoutes, target);
        }

        return descriptor;
    };
}
