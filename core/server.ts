/**
 * AstraAPI Server
 * Main Bun server with all features integrated
 */

import type { Server } from "bun";
import type {
    AstraServerOptions,
    AstraContext,
    MiddlewareFunction,
    ControllerClass,
    HttpMethod,
    ParamMetadata,
    CorsOptions,
} from "./types";
import { METADATA_KEYS } from "./types";
import { Router, router as globalRouter } from "./router";
import { createContext, parseBody } from "./context";
import { handleException, NotFoundException, MethodNotAllowedException } from "../Injection/exception";
import { container } from "../context/di";

/**
 * AstraAPI Application
 */
export class AstraAPI {
    private router: Router;
    private server: Server | null = null;
    private options: Required<AstraServerOptions>;
    private startTime: number = 0;

    constructor(options: AstraServerOptions = {}) {
        this.router = globalRouter;
        this.options = this.mergeOptions(options);

        // Apply global prefix
        if (this.options.prefix) {
            this.router.setPrefix(this.options.prefix);
        }

        // Add CORS middleware if enabled
        if (this.options.cors) {
            this.router.use(this.createCorsMiddleware());
        }

        // Add logging middleware if enabled
        if (this.options.logging) {
            this.router.use(this.createLoggingMiddleware());
        }
    }

    /**
     * Merge user options with defaults
     */
    private mergeOptions(options: AstraServerOptions): Required<AstraServerOptions> {
        return {
            port: options.port ?? 3000,
            hostname: options.hostname ?? "0.0.0.0",
            development: options.development ?? process.env.NODE_ENV !== "production",
            cors: options.cors ?? false,
            logging: options.logging ?? true,
            prefix: options.prefix ?? "",
            openapi: {
                enabled: options.openapi?.enabled ?? true,
                path: options.openapi?.path ?? "/docs",
                info: {
                    title: options.openapi?.info?.title ?? "AstraAPI",
                    version: options.openapi?.info?.version ?? "1.0.0",
                    description: options.openapi?.info?.description ?? "API Documentation",
                },
                servers: options.openapi?.servers ?? [],
            },
            rateLimit: options.rateLimit ?? undefined as any,
            compression: options.compression ?? false,
        };
    }

    /**
     * Register controllers
     */
    register(...controllers: ControllerClass[]): this {
        for (const controller of controllers) {
            this.router.registerController(controller);
        }
        return this;
    }

    /**
     * Add global middleware
     */
    use(middleware: MiddlewareFunction): this {
        this.router.use(middleware);
        return this;
    }

    /**
     * Handle incoming request
     */
    private async handleRequest(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const method = req.method.toUpperCase() as HttpMethod;
        const path = url.pathname;

        // Handle CORS preflight
        if (method === "OPTIONS" && this.options.cors) {
            return this.handleCorsPreFlight(req);
        }

        // Handle OpenAPI documentation
        if (this.options.openapi.enabled) {
            if (path === this.options.openapi.path) {
                return this.serveSwaggerUI();
            }
            if (path === `${this.options.openapi.path}/openapi.json`) {
                return this.serveOpenAPISpec();
            }
        }

        // Match route
        const match = this.router.match(method, path);

        if (!match) {
            // Check if path exists with different method
            const methodCheck = ["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[];
            for (const m of methodCheck) {
                if (m !== method && this.router.match(m, path)) {
                    return handleException(new MethodNotAllowedException());
                }
            }
            return handleException(new NotFoundException(`Route ${method} ${path} not found`));
        }

        // Create context
        const ctx = createContext(req, match.params);

        try {
            // Parse body
            ctx.body = await parseBody(req);

            // Execute middleware chain
            const response = await this.executeMiddlewareChain(
                ctx,
                match.route.middlewares,
                async () => {
                    // Resolve controller instance
                    const controllerInstance = await container.resolve(match.route.controller);

                    // Get parameter metadata
                    const paramMetadata: ParamMetadata[] =
                        Reflect.getMetadata?.(
                            METADATA_KEYS.PARAMS,
                            match.route.controller.prototype,
                            match.route.handler
                        ) || [];

                    // Resolve parameters
                    const args = await this.resolveParameters(ctx, paramMetadata, match.route.definition);

                    // Call handler
                    const handlerFn = (controllerInstance as any)[match.route.handler];
                    const result = await handlerFn.apply(controllerInstance, args);

                    // Convert result to response
                    return this.createResponse(result, ctx);
                }
            );

            return response;
        } catch (error) {
            return handleException(error);
        }
    }

    /**
     * Execute middleware chain
     */
    private async executeMiddlewareChain(
        ctx: AstraContext,
        middlewares: MiddlewareFunction[],
        finalHandler: () => Promise<Response>
    ): Promise<Response> {
        let index = -1;

        const dispatch = async (i: number): Promise<Response> => {
            if (i <= index) {
                throw new Error("next() called multiple times");
            }
            index = i;

            if (i < middlewares.length) {
                const middleware = middlewares[i];
                return await middleware(ctx, () => dispatch(i + 1));
            } else {
                return await finalHandler();
            }
        };

        return dispatch(0);
    }

    /**
     * Resolve handler parameters
     */
    private async resolveParameters(
        ctx: AstraContext,
        metadata: ParamMetadata[],
        definition: any
    ): Promise<unknown[]> {
        // Sort by parameter index
        const sorted = [...metadata].sort((a, b) => a.index - b.index);
        const args: unknown[] = [];

        for (const param of sorted) {
            let value: unknown;

            switch (param.type) {
                case "body":
                    value = ctx.body;
                    break;
                case "query":
                    value = param.key ? ctx.query[param.key] : ctx.query;
                    break;
                case "params":
                    value = param.key ? ctx.params[param.key] : ctx.params;
                    break;
                case "headers":
                    value = param.key ? ctx.headers.get(param.key) : Object.fromEntries(ctx.headers);
                    break;
                case "ctx":
                    value = ctx;
                    break;
                case "user":
                    value = ctx.user;
                    break;
                default:
                    value = undefined;
            }

            // Apply validation schema if present
            if (param.schema && value !== undefined) {
                const result = param.schema.safeParse(value);
                if (!result.success) {
                    throw result.error;
                }
                value = result.data;
            }

            // Apply transform if present
            if (param.transform) {
                value = param.transform(value);
            }

            args[param.index] = value;
        }

        return args;
    }

    /**
     * Create response from handler result
     */
    private createResponse(result: unknown, ctx: AstraContext): Response {
        // Already a Response
        if (result instanceof Response) {
            return result;
        }

        // Undefined/null = 204 No Content
        if (result === undefined || result === null) {
            return new Response(null, { status: 204 });
        }

        // String = text response
        if (typeof result === "string") {
            return ctx.text(result);
        }

        // Object/Array = JSON response
        return ctx.json(result);
    }

    /**
     * Create CORS middleware
     */
    private createCorsMiddleware(): MiddlewareFunction {
        const corsOptions = typeof this.options.cors === "object"
            ? this.options.cors
            : {} as CorsOptions;

        return async (ctx, next) => {
            const response = await next();

            // Add CORS headers
            const origin = ctx.headers.get("Origin") || "*";
            const allowOrigin = this.getAllowedOrigin(origin, corsOptions);

            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", allowOrigin);
            headers.set("Access-Control-Allow-Methods", corsOptions.methods?.join(", ") || "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            headers.set("Access-Control-Allow-Headers", corsOptions.allowedHeaders?.join(", ") || "Content-Type, Authorization");

            if (corsOptions.credentials) {
                headers.set("Access-Control-Allow-Credentials", "true");
            }

            return new Response(response.body, {
                status: response.status,
                headers,
            });
        };
    }

    /**
     * Get allowed origin for CORS
     */
    private getAllowedOrigin(origin: string, options: CorsOptions): string {
        if (!options.origin) return "*";

        if (typeof options.origin === "string") {
            return options.origin;
        }

        if (Array.isArray(options.origin)) {
            return options.origin.includes(origin) ? origin : options.origin[0];
        }

        if (typeof options.origin === "function") {
            return options.origin(origin) ? origin : "";
        }

        return "*";
    }

    /**
     * Handle CORS preflight request
     */
    private handleCorsPreFlight(req: Request): Response {
        const corsOptions = typeof this.options.cors === "object"
            ? this.options.cors
            : {} as CorsOptions;

        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": this.getAllowedOrigin(
                    req.headers.get("Origin") || "*",
                    corsOptions
                ),
                "Access-Control-Allow-Methods": corsOptions.methods?.join(", ") || "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": corsOptions.allowedHeaders?.join(", ") || "Content-Type, Authorization",
                "Access-Control-Max-Age": String(corsOptions.maxAge || 86400),
            },
        });
    }

    /**
     * Create logging middleware
     */
    private createLoggingMiddleware(): MiddlewareFunction {
        return async (ctx, next) => {
            const start = performance.now();
            const method = ctx.req.method;
            const url = new URL(ctx.req.url);

            try {
                const response = await next();
                const duration = (performance.now() - start).toFixed(2);

                const status = response.status;
                const statusColor = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";

                console.log(
                    `\x1b[90m${new Date().toISOString()}\x1b[0m ${statusColor}${status}\x1b[0m ${method} ${url.pathname} \x1b[90m${duration}ms\x1b[0m`
                );

                return response;
            } catch (error) {
                const duration = (performance.now() - start).toFixed(2);
                console.log(
                    `\x1b[90m${new Date().toISOString()}\x1b[0m \x1b[31m500\x1b[0m ${method} ${url.pathname} \x1b[90m${duration}ms\x1b[0m`
                );
                throw error;
            }
        };
    }

    /**
     * Serve Swagger UI HTML
     */
    private serveSwaggerUI(): Response {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.options.openapi.info.title} - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "${this.options.openapi.path}/openapi.json",
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

        return new Response(html, {
            headers: { "Content-Type": "text/html" },
        });
    }

    /**
     * Serve OpenAPI JSON specification
     */
    private serveOpenAPISpec(): Response {
        const spec = this.generateOpenAPISpec();
        return new Response(JSON.stringify(spec, null, 2), {
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Generate OpenAPI specification
     */
    private generateOpenAPISpec(): object {
        const routes = this.router.getRoutes();
        const paths: Record<string, Record<string, object>> = {};

        for (const route of routes) {
            const path = route.path.replace(/:(\w+)/g, "{$1}");

            if (!paths[path]) {
                paths[path] = {};
            }

            const operation: Record<string, unknown> = {
                summary: route.definition.summary || `${route.method} ${route.path}`,
                description: route.definition.description,
                tags: route.definition.tags || [],
                responses: {
                    "200": {
                        description: "Successful response",
                        content: {
                            "application/json": {
                                schema: { type: "object" },
                            },
                        },
                    },
                },
            };

            // Add parameters
            const params: object[] = [];
            const paramMatches = route.path.match(/:(\w+)/g);
            if (paramMatches) {
                for (const match of paramMatches) {
                    params.push({
                        name: match.slice(1),
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    });
                }
            }

            if (params.length > 0) {
                operation.parameters = params;
            }

            // Add request body for POST/PUT/PATCH
            if (["POST", "PUT", "PATCH"].includes(route.method)) {
                operation.requestBody = {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object" },
                        },
                    },
                };
            }

            paths[path][route.method.toLowerCase()] = operation;
        }

        return {
            openapi: "3.0.0",
            info: this.options.openapi.info,
            servers: this.options.openapi.servers.length > 0
                ? this.options.openapi.servers
                : [{ url: `http://localhost:${this.options.port}` }],
            paths,
        };
    }

    /**
     * Start the server
     */
    listen(port?: number): Promise<Server> {
        const finalPort = port ?? this.options.port;
        this.startTime = Date.now();

        return new Promise((resolve) => {
            this.server = Bun.serve({
                port: finalPort,
                hostname: this.options.hostname,
                development: this.options.development,
                fetch: async (req) => {
                    return this.handleRequest(req);
                },
                error: (error) => {
                    console.error("[AstraAPI] Server error:", error);
                    return handleException(error);
                },
            });

            // Print startup message
            console.log("");
            console.log(" 🧘 \x1b[1m\x1b[35mAstraAPI\x1b[0m is running!");
            console.log("");
            console.log(` ➜  Local:   \x1b[36mhttp://localhost:${finalPort}\x1b[0m`);
            if (this.options.openapi.enabled) {
                console.log(` ➜  Docs:    \x1b[36mhttp://localhost:${finalPort}${this.options.openapi.path}\x1b[0m`);
            }
            console.log("");

            resolve(this.server);
        });
    }

    /**
     * Stop the server
     */
    stop(): void {
        if (this.server) {
            this.server.stop();
            this.server = null;
            console.log("[AstraAPI] Server stopped");
        }
    }

    /**
     * Get server instance
     */
    getServer(): Server | null {
        return this.server;
    }

    /**
     * Get router instance
     */
    getRouter(): Router {
        return this.router;
    }
}

/**
 * Create a new AstraAPI app
 */
export function createApp(options?: AstraServerOptions): AstraAPI {
    return new AstraAPI(options);
}
