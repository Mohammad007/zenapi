/**
 * 🧘 AstraAPI for Bun.js and Node.js
 * Same power, more speed
 * 
 * @example
 * ```ts
 * import { createApp, Controller, Get, Post, Body } from "astraapi";
 * import { z } from "astraapi";
 * 
 * const UserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 * 
 * @Controller("/users")
 * class UserController {
 *   @Get("/")
 *   getUsers() {
 *     return [{ id: 1, name: "Bilal" }];
 *   }
 * 
 *   @Post("/")
 *   createUser(@Body(UserSchema) data: z.infer<typeof UserSchema>) {
 *     return data;
 *   }
 * }
 * 
 * const app = createApp({ port: 3000 });
 * app.register(UserController);
 * app.listen();
 * ```
 */

// Core
export {
    AstraAPI,
    createApp,
} from "./core/server";

export {
    Router,
    router,
} from "./core/router";

export {
    createContext,
    parseBody,
} from "./core/context";

// Types
export type {
    AstraContext,
    AstraServerOptions,
    HttpMethod,
    RouteDefinition,
    ControllerDefinition,
    MiddlewareFunction,
    CorsOptions,
    CookieOptions,
    ApiResponse,
} from "./core/types";

// Dependency Injection
export {
    container,
    Container,
    Injectable,
    Inject,
    Depends,
    registerProviders,
} from "./context/di";

// Exceptions
export {
    HttpException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ConflictException,
    ValidationException,
    TooManyRequestsException,
    InternalServerException,
    ServiceUnavailableException,
    handleException,
} from "./Injection/exception";

// Decorators
export {
    // Controller
    Controller,
    ApiTags,
    // Routes
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Options,
    Head,
    Use,
    ApiOperation,
    // Parameters
    Body,
    Query,
    Param,
    Headers,
    Ctx,
    CurrentUser,
    Req,
    // Auth
    UseGuards,
    Roles,
    Public,
    isPublicRoute,
} from "./Injection/decorators";

// Validation
export {
    z,
    validate,
    validateOrThrow,
    validateBody,
    validateQuery,
    validateParams,
    formatZodErrors,
    IdSchema,
    UuidSchema,
    EmailSchema,
    PaginationSchema,
    createPaginatedSchema,
} from "./Injection/validation";

export type {
    ZodSchema,
    Pagination,
} from "./Injection/validation";

// Authentication
export {
    AstraAuth,
    createAuth,
    AuthGuard,
    createAuthMiddleware,
    createOptionalAuthMiddleware,
    Password,
    OAuth2,
    OAuth2Providers,
} from "./Injection/auth";

export type {
    JWTConfig,
    JWTPayload,
    OAuth2Provider,
} from "./Injection/auth";

// Database
export {
    createRepository,
    BaseRepository,
    BunSQLite,
} from "./Injection/database";

export type {
    DatabaseConfig,
} from "./Injection/database";
