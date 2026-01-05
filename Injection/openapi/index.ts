/**
 * AstraAPI OpenAPI Generator
 * Generates OpenAPI 3.0 specification from routes
 */

import type {
    HttpMethod,
    RouteDefinition,
    ControllerClass
} from "../../core/types";

export interface OpenAPIInfo {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: {
        name?: string;
        url?: string;
        email?: string;
    };
    license?: {
        name: string;
        url?: string;
    };
}

export interface OpenAPIServer {
    url: string;
    description?: string;
}

export interface OpenAPISpec {
    openapi: string;
    info: OpenAPIInfo;
    servers: OpenAPIServer[];
    paths: Record<string, Record<string, OpenAPIOperation>>;
    components?: {
        schemas?: Record<string, any>;
        securitySchemes?: Record<string, any>;
    };
    tags?: Array<{ name: string; description?: string }>;
}

export interface OpenAPIOperation {
    summary?: string;
    description?: string;
    tags?: string[];
    operationId?: string;
    parameters?: OpenAPIParameter[];
    requestBody?: {
        required?: boolean;
        content: Record<string, { schema: any }>;
    };
    responses: Record<string, {
        description: string;
        content?: Record<string, { schema: any }>;
    }>;
    security?: Array<Record<string, string[]>>;
}

export interface OpenAPIParameter {
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    description?: string;
    schema: any;
}

/**
 * Generate OpenAPI spec from routes
 */
export function generateOpenAPI(
    routes: Array<{
        method: HttpMethod;
        path: string;
        definition: RouteDefinition;
        controller: ControllerClass;
    }>,
    options: {
        info: OpenAPIInfo;
        servers?: OpenAPIServer[];
        securitySchemes?: Record<string, any>;
    }
): OpenAPISpec {
    const paths: Record<string, Record<string, OpenAPIOperation>> = {};
    const tags = new Set<string>();

    for (const route of routes) {
        // Convert :param to {param} for OpenAPI
        const openAPIPath = route.path.replace(/:(\w+)/g, "{$1}");

        if (!paths[openAPIPath]) {
            paths[openAPIPath] = {};
        }

        const operation = createOperation(route);
        paths[openAPIPath][route.method.toLowerCase()] = operation;

        // Collect tags
        if (operation.tags) {
            operation.tags.forEach(tag => tags.add(tag));
        }
    }

    const spec: OpenAPISpec = {
        openapi: "3.0.0",
        info: options.info,
        servers: options.servers || [{ url: "/" }],
        paths,
        components: {
            schemas: {},
            securitySchemes: options.securitySchemes || {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        tags: Array.from(tags).map(name => ({ name })),
    };

    return spec;
}

/**
 * Create OpenAPI operation from route
 */
function createOperation(route: {
    method: HttpMethod;
    path: string;
    definition: RouteDefinition;
    controller: ControllerClass;
}): OpenAPIOperation {
    const { method, path, definition, controller } = route;

    const operation: OpenAPIOperation = {
        summary: definition.summary || `${method} ${path}`,
        description: definition.description,
        tags: definition.tags || [controller.name.replace("Controller", "")],
        operationId: `${controller.name}_${definition.handler}`,
        responses: {
            "200": {
                description: "Successful response",
                content: {
                    "application/json": {
                        schema: { type: "object" },
                    },
                },
            },
            "400": {
                description: "Bad request",
            },
            "401": {
                description: "Unauthorized",
            },
            "404": {
                description: "Not found",
            },
            "500": {
                description: "Internal server error",
            },
        },
    };

    // Add path parameters
    const pathParams = path.match(/:(\w+)/g);
    if (pathParams) {
        operation.parameters = pathParams.map(param => ({
            name: param.slice(1),
            in: "path" as const,
            required: true,
            schema: { type: "string" },
        }));
    }

    // Add request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method)) {
        operation.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: definition.bodySchema
                        ? zodToJsonSchema(definition.bodySchema)
                        : { type: "object" },
                },
            },
        };
    }

    return operation;
}

/**
 * Convert Zod schema to JSON Schema (basic conversion)
 */
function zodToJsonSchema(schema: any): any {
    // This is a simplified conversion
    // In production, use zod-to-json-schema package

    if (!schema || !schema._def) {
        return { type: "object" };
    }

    const def = schema._def;

    switch (def.typeName) {
        case "ZodString":
            return { type: "string" };
        case "ZodNumber":
            return { type: "number" };
        case "ZodBoolean":
            return { type: "boolean" };
        case "ZodArray":
            return {
                type: "array",
                items: zodToJsonSchema(def.type),
            };
        case "ZodObject":
            const properties: Record<string, any> = {};
            const required: string[] = [];

            for (const [key, value] of Object.entries(def.shape())) {
                properties[key] = zodToJsonSchema(value);
                if (!(value as any)._def?.typeName?.includes("Optional")) {
                    required.push(key);
                }
            }

            return {
                type: "object",
                properties,
                required: required.length > 0 ? required : undefined,
            };
        case "ZodOptional":
            return zodToJsonSchema(def.innerType);
        case "ZodNullable":
            const inner = zodToJsonSchema(def.innerType);
            return { ...inner, nullable: true };
        case "ZodEnum":
            return {
                type: "string",
                enum: def.values,
            };
        default:
            return { type: "object" };
    }
}

/**
 * Generate OpenAPI JSON string
 */
export function generateOpenAPIJSON(
    routes: Array<{
        method: HttpMethod;
        path: string;
        definition: RouteDefinition;
        controller: ControllerClass;
    }>,
    options: {
        info: OpenAPIInfo;
        servers?: OpenAPIServer[];
    }
): string {
    const spec = generateOpenAPI(routes, options);
    return JSON.stringify(spec, null, 2);
}
