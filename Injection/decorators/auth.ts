/**
 * AstraAPI Auth Decorators
 * Authentication and authorization decorators
 */

import type { MiddlewareFunction, AstraContext } from "../../core/types";
import { METADATA_KEYS } from "../../core/types";
import { UnauthorizedException, ForbiddenException } from "../exception";

/**
 * Guard interface - implement this for custom guards
 */
export interface Guard {
    canActivate(ctx: AstraContext): boolean | Promise<boolean>;
}

export type GuardClass = new (...args: any[]) => Guard;

/**
 * @UseGuards decorator - Apply guards to controller or route
 * 
 * @example
 * ```ts
 * @UseGuards(AuthGuard)
 * @Controller("/admin")
 * class AdminController {}
 * ```
 */
export function UseGuards(...guards: (GuardClass | Guard | MiddlewareFunction)[]): ClassDecorator & MethodDecorator {
    return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
        const guardMiddlewares: MiddlewareFunction[] = guards.map((guard) => {
            return async (ctx: AstraContext, next) => {
                let canActivate = false;

                if (typeof guard === "function" && guard.prototype?.canActivate) {
                    // It's a Guard class
                    const guardInstance = new (guard as GuardClass)();
                    canActivate = await guardInstance.canActivate(ctx);
                } else if (typeof (guard as Guard).canActivate === "function") {
                    // It's a Guard instance
                    canActivate = await (guard as Guard).canActivate(ctx);
                } else if (typeof guard === "function") {
                    // It's a middleware function
                    return (guard as MiddlewareFunction)(ctx, next);
                }

                if (!canActivate) {
                    throw new UnauthorizedException("Access denied");
                }

                return next();
            };
        });

        if (propertyKey) {
            // Method decorator
            const existingMiddlewares: MiddlewareFunction[] =
                Reflect.getMetadata?.(METADATA_KEYS.MIDDLEWARES, target, propertyKey as string) || [];

            Reflect.defineMetadata?.(
                METADATA_KEYS.MIDDLEWARES,
                [...guardMiddlewares, ...existingMiddlewares],
                target,
                propertyKey as string
            );

            return descriptor!;
        } else {
            // Class decorator
            const existingMiddlewares: MiddlewareFunction[] =
                Reflect.getMetadata?.(METADATA_KEYS.MIDDLEWARES, target) || [];

            Reflect.defineMetadata?.(
                METADATA_KEYS.MIDDLEWARES,
                [...guardMiddlewares, ...existingMiddlewares],
                target
            );
        }
    };
}

/**
 * @Roles decorator - Require specific roles for access
 * 
 * @example
 * ```ts
 * @Roles("admin", "moderator")
 * @Get("/admin")
 * adminRoute() {}
 * ```
 */
export function Roles(...roles: string[]): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        const roleMiddleware: MiddlewareFunction = async (ctx, next) => {
            const user = ctx.user as { roles?: string[] } | undefined;

            if (!user) {
                throw new UnauthorizedException("Authentication required");
            }

            const userRoles = user.roles || [];
            const hasRole = roles.some((role) => userRoles.includes(role));

            if (!hasRole) {
                throw new ForbiddenException(`Required roles: ${roles.join(", ")}`);
            }

            return next();
        };

        const existingMiddlewares: MiddlewareFunction[] =
            Reflect.getMetadata?.(METADATA_KEYS.MIDDLEWARES, target, propertyKey as string) || [];

        Reflect.defineMetadata?.(
            METADATA_KEYS.MIDDLEWARES,
            [roleMiddleware, ...existingMiddlewares],
            target,
            propertyKey as string
        );

        return descriptor;
    };
}

/**
 * @Public decorator - Mark route as public (no auth required)
 * Used with global auth guard to skip authentication
 */
export function Public(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata?.("isPublic", true, target, propertyKey as string);
        return descriptor;
    };
}

/**
 * Check if route is marked as public
 */
export function isPublicRoute(target: any, propertyKey: string): boolean {
    return Reflect.getMetadata?.("isPublic", target, propertyKey) === true;
}
