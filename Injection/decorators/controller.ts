/**
 * AstraAPI Controller Decorator
 * Marks a class as an API controller with route prefix
 */

import { METADATA_KEYS, type MiddlewareFunction } from "../../core/types";
import { container } from "../../context/di";

export interface ControllerOptions {
    /** Route prefix for all routes in this controller */
    prefix?: string;
    /** Tags for OpenAPI documentation */
    tags?: string[];
    /** Middleware to apply to all routes */
    middlewares?: MiddlewareFunction[];
}

/**
 * Controller decorator - marks a class as a REST controller
 * 
 * @example
 * ```ts
 * @Controller("/users")
 * class UserController {
 *   @Get("/")
 *   getUsers() {
 *     return []
 *   }
 * }
 * ```
 */
export function Controller(prefixOrOptions?: string | ControllerOptions): ClassDecorator {
    return (target) => {
        let prefix = "";
        let tags: string[] = [];
        let middlewares: MiddlewareFunction[] = [];

        if (typeof prefixOrOptions === "string") {
            prefix = prefixOrOptions;
        } else if (prefixOrOptions) {
            prefix = prefixOrOptions.prefix || "";
            tags = prefixOrOptions.tags || [];
            middlewares = prefixOrOptions.middlewares || [];
        }

        // Store controller metadata
        Reflect.defineMetadata?.(
            METADATA_KEYS.CONTROLLER,
            { prefix, tags },
            target
        );

        // Store controller middlewares
        if (middlewares.length > 0) {
            Reflect.defineMetadata?.(METADATA_KEYS.MIDDLEWARES, middlewares, target);
        }

        // Auto-register with DI container
        container.registerClass(target as any);
    };
}

/**
 * ApiTags decorator - adds OpenAPI tags to controller
 * 
 * @example
 * ```ts
 * @ApiTags("Users", "Authentication")
 * @Controller("/users")
 * class UserController {}
 * ```
 */
export function ApiTags(...tags: string[]): ClassDecorator {
    return (target) => {
        const existing = Reflect.getMetadata?.(METADATA_KEYS.CONTROLLER, target) || {};
        Reflect.defineMetadata?.(
            METADATA_KEYS.CONTROLLER,
            { ...existing, tags: [...(existing.tags || []), ...tags] },
            target
        );
    };
}
