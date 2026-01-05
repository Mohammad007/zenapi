/**
 * ZenAPI Parameter Decorators
 * Decorators for extracting request data
 */

import type { ParamMetadata, ParamType } from "../../core/types";
import { METADATA_KEYS } from "../../core/types";
import type { ZodSchema } from "zod";

/**
 * Create a parameter decorator factory
 */
function createParamDecorator(type: ParamType) {
    return function (keyOrSchema?: string | ZodSchema, schema?: ZodSchema): ParameterDecorator {
        return (target, propertyKey, parameterIndex) => {
            let key: string | undefined;
            let validationSchema: ZodSchema | undefined;

            if (typeof keyOrSchema === "string") {
                key = keyOrSchema;
                validationSchema = schema;
            } else if (keyOrSchema) {
                validationSchema = keyOrSchema;
            }

            // Get existing params or create new array
            const existingParams: ParamMetadata[] =
                Reflect.getMetadata?.(METADATA_KEYS.PARAMS, target, propertyKey as string) || [];

            // Create param metadata
            const paramMeta: ParamMetadata = {
                type,
                index: parameterIndex,
                key,
                schema: validationSchema,
            };

            // Add to params
            existingParams.push(paramMeta);

            // Store metadata
            Reflect.defineMetadata?.(
                METADATA_KEYS.PARAMS,
                existingParams,
                target,
                propertyKey as string
            );
        };
    };
}

/**
 * @Body decorator - Extract and validate request body
 * 
 * @example
 * ```ts
 * @Post("/users")
 * createUser(@Body(CreateUserSchema) data: CreateUser) {
 *   return data
 * }
 * ```
 */
export const Body = createParamDecorator("body");

/**
 * @Query decorator - Extract query parameters
 * 
 * @example
 * ```ts
 * @Get("/users")
 * getUsers(@Query("page") page: string, @Query() all: Record<string, string>) {
 *   return { page, all }
 * }
 * ```
 */
export const Query = createParamDecorator("query");

/**
 * @Param decorator - Extract route parameters
 * 
 * @example
 * ```ts
 * @Get("/users/:id")
 * getUser(@Param("id") id: string) {
 *   return { id }
 * }
 * ```
 */
export const Param = createParamDecorator("params");

/**
 * @Headers decorator - Extract request headers
 * 
 * @example
 * ```ts
 * @Get("/auth")
 * checkAuth(@Headers("authorization") token: string) {
 *   return { token }
 * }
 * ```
 */
export const Headers = createParamDecorator("headers");

/**
 * @Ctx decorator - Get full request context
 * 
 * @example
 * ```ts
 * @Get("/info")
 * getInfo(@Ctx() ctx: ZenContext) {
 *   return { url: ctx.req.url }
 * }
 * ```
 */
export const Ctx = createParamDecorator("ctx");

/**
 * @CurrentUser decorator - Get authenticated user
 * 
 * @example
 * ```ts
 * @Get("/me")
 * getMe(@CurrentUser() user: User) {
 *   return user
 * }
 * ```
 */
export const CurrentUser = createParamDecorator("user");

/**
 * @Req decorator - Alias for getting request from context
 */
export function Req(): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        const existingParams: ParamMetadata[] =
            Reflect.getMetadata?.(METADATA_KEYS.PARAMS, target, propertyKey as string) || [];

        existingParams.push({
            type: "custom",
            index: parameterIndex,
            transform: (ctx: any) => ctx.req,
        });

        Reflect.defineMetadata?.(
            METADATA_KEYS.PARAMS,
            existingParams,
            target,
            propertyKey as string
        );
    };
}
