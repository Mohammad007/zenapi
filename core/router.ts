/**
 * ZenAPI Router
 * Fast route matching with parameter extraction
 */

import type {
    HttpMethod,
    RouteDefinition,
    ControllerDefinition,
    MiddlewareFunction,
    ZenContext,
    ControllerClass,
} from "./types";
import { METADATA_KEYS } from "./types";
import { container } from "../context/di";

/**
 * Route node for trie-based routing
 */
interface RouteNode {
    children: Map<string, RouteNode>;
    paramChild?: { name: string; node: RouteNode };
    wildcardChild?: RouteNode;
    handlers: Map<HttpMethod, CompiledRoute>;
}

/**
 * Compiled route with resolved handler
 */
interface CompiledRoute {
    controller: ControllerClass;
    handler: string;
    middlewares: MiddlewareFunction[];
    definition: RouteDefinition;
}

/**
 * Route match result
 */
interface RouteMatch {
    route: CompiledRoute;
    params: Record<string, string>;
}

/**
 * Router class - handles route registration and matching
 */
export class Router {
    private root: RouteNode = this.createNode();
    private controllers: Map<ControllerClass, ControllerDefinition> = new Map();
    private globalMiddlewares: MiddlewareFunction[] = [];
    private prefix: string = "";

    /**
     * Create a new route node
     */
    private createNode(): RouteNode {
        return {
            children: new Map(),
            handlers: new Map(),
        };
    }

    /**
     * Set global route prefix
     */
    setPrefix(prefix: string): this {
        this.prefix = this.normalizePath(prefix);
        return this;
    }

    /**
     * Add global middleware
     */
    use(middleware: MiddlewareFunction): this {
        this.globalMiddlewares.push(middleware);
        return this;
    }

    /**
     * Register a controller
     */
    registerController(target: ControllerClass): void {
        // Get controller metadata
        const metadata = Reflect.getMetadata?.(METADATA_KEYS.CONTROLLER, target);
        if (!metadata) {
            console.warn(`[ZenAPI] Class ${target.name} is not decorated with @Controller`);
            return;
        }

        // Get routes metadata
        const routes: RouteDefinition[] =
            Reflect.getMetadata?.(METADATA_KEYS.ROUTES, target.prototype) || [];

        // Get controller-level middlewares
        const controllerMiddlewares: MiddlewareFunction[] =
            Reflect.getMetadata?.(METADATA_KEYS.MIDDLEWARES, target) || [];

        const controllerDef: ControllerDefinition = {
            prefix: metadata.prefix,
            target,
            routes,
            middlewares: controllerMiddlewares,
            tags: metadata.tags,
        };

        this.controllers.set(target, controllerDef);

        // Register each route
        for (const route of routes) {
            this.addRoute(
                route.method,
                this.combinePaths(this.prefix, metadata.prefix, route.path),
                target,
                route.handler,
                [...controllerMiddlewares, ...route.middlewares],
                route
            );
        }
    }

    /**
     * Add a route to the trie
     */
    private addRoute(
        method: HttpMethod,
        path: string,
        controller: ControllerClass,
        handler: string,
        middlewares: MiddlewareFunction[],
        definition: RouteDefinition
    ): void {
        const normalizedPath = this.normalizePath(path);
        const segments = normalizedPath.split("/").filter(Boolean);

        let node = this.root;

        for (const segment of segments) {
            if (segment.startsWith(":")) {
                // Parameter segment
                const paramName = segment.slice(1);
                if (!node.paramChild) {
                    node.paramChild = { name: paramName, node: this.createNode() };
                }
                node = node.paramChild.node;
            } else if (segment === "*") {
                // Wildcard segment
                if (!node.wildcardChild) {
                    node.wildcardChild = this.createNode();
                }
                node = node.wildcardChild;
            } else {
                // Static segment
                if (!node.children.has(segment)) {
                    node.children.set(segment, this.createNode());
                }
                node = node.children.get(segment)!;
            }
        }

        // Store the handler
        const compiledRoute: CompiledRoute = {
            controller,
            handler,
            middlewares: [...this.globalMiddlewares, ...middlewares],
            definition,
        };

        if (node.handlers.has(method)) {
            console.warn(`[ZenAPI] Route ${method} ${path} already exists, overwriting`);
        }

        node.handlers.set(method, compiledRoute);
    }

    /**
     * Match a request to a route
     */
    match(method: HttpMethod, path: string): RouteMatch | null {
        const normalizedPath = this.normalizePath(path);
        const segments = normalizedPath.split("/").filter(Boolean);
        const params: Record<string, string> = {};

        const result = this.matchNode(this.root, segments, 0, params);

        if (!result) return null;

        const route = result.handlers.get(method);
        if (!route) return null;

        return { route, params };
    }

    /**
     * Recursively match nodes
     */
    private matchNode(
        node: RouteNode,
        segments: string[],
        index: number,
        params: Record<string, string>
    ): RouteNode | null {
        // Base case: we've matched all segments
        if (index === segments.length) {
            return node;
        }

        const segment = segments[index];

        // Try static match first (most specific)
        if (node.children.has(segment)) {
            const result = this.matchNode(
                node.children.get(segment)!,
                segments,
                index + 1,
                params
            );
            if (result && result.handlers.size > 0) return result;
        }

        // Try parameter match
        if (node.paramChild) {
            const savedParam = params[node.paramChild.name];
            params[node.paramChild.name] = segment;

            const result = this.matchNode(
                node.paramChild.node,
                segments,
                index + 1,
                params
            );

            if (result && result.handlers.size > 0) return result;

            // Backtrack
            if (savedParam !== undefined) {
                params[node.paramChild.name] = savedParam;
            } else {
                delete params[node.paramChild.name];
            }
        }

        // Try wildcard match (least specific)
        if (node.wildcardChild) {
            return node.wildcardChild;
        }

        return null;
    }

    /**
     * Get all registered routes (for OpenAPI generation)
     */
    getRoutes(): Array<{
        method: HttpMethod;
        path: string;
        definition: RouteDefinition;
        controller: ControllerClass;
    }> {
        const routes: Array<{
            method: HttpMethod;
            path: string;
            definition: RouteDefinition;
            controller: ControllerClass;
        }> = [];

        for (const [controller, def] of this.controllers) {
            for (const route of def.routes) {
                routes.push({
                    method: route.method,
                    path: this.combinePaths(this.prefix, def.prefix, route.path),
                    definition: route,
                    controller,
                });
            }
        }

        return routes;
    }

    /**
     * Get all registered controllers
     */
    getControllers(): Map<ControllerClass, ControllerDefinition> {
        return this.controllers;
    }

    /**
     * Normalize a path
     */
    private normalizePath(path: string): string {
        // Remove trailing slashes, ensure leading slash
        let normalized = path.replace(/\/+/g, "/");
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.length > 1 && normalized.endsWith("/")) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }

    /**
     * Combine multiple path segments
     */
    private combinePaths(...paths: string[]): string {
        const combined = paths
            .filter(Boolean)
            .map((p) => p.replace(/^\/+|\/+$/g, ""))
            .filter(Boolean)
            .join("/");
        return this.normalizePath(combined);
    }

    /**
     * Clear all routes
     */
    clear(): void {
        this.root = this.createNode();
        this.controllers.clear();
        this.globalMiddlewares = [];
    }
}

// Global router instance
export const router = new Router();
