/**
 * AstraAPI Dependency Injection Container
 * Simple but powerful DI system
 */

import type {
    Constructor,
    ServiceIdentifier,
    ProviderDefinition
} from "../core/types";
import { METADATA_KEYS } from "../core/types";

/**
 * Dependency Injection Container
 */
class Container {
    private providers: Map<ServiceIdentifier, ProviderDefinition> = new Map();
    private singletons: Map<ServiceIdentifier, unknown> = new Map();
    private resolving: Set<ServiceIdentifier> = new Set();

    /**
     * Register a provider
     */
    register<T>(definition: ProviderDefinition<T>): this {
        this.providers.set(definition.provide, definition);
        return this;
    }

    /**
     * Register a class as a provider
     */
    registerClass<T>(target: Constructor<T>, singleton = true): this {
        this.providers.set(target, {
            provide: target,
            useClass: target,
            singleton,
        });
        return this;
    }

    /**
     * Register a value directly
     */
    registerValue<T>(identifier: ServiceIdentifier<T>, value: T): this {
        this.providers.set(identifier, {
            provide: identifier,
            useValue: value,
            singleton: true,
        });
        this.singletons.set(identifier, value);
        return this;
    }

    /**
     * Register a factory function
     */
    registerFactory<T>(
        identifier: ServiceIdentifier<T>,
        factory: () => T | Promise<T>,
        singleton = true
    ): this {
        this.providers.set(identifier, {
            provide: identifier,
            useFactory: factory,
            singleton,
        });
        return this;
    }

    /**
     * Resolve a dependency
     */
    async resolve<T>(identifier: ServiceIdentifier<T>): Promise<T> {
        // Check for circular dependency
        if (this.resolving.has(identifier)) {
            throw new Error(`Circular dependency detected for: ${String(identifier)}`);
        }

        // Check singleton cache
        if (this.singletons.has(identifier)) {
            return this.singletons.get(identifier) as T;
        }

        const provider = this.providers.get(identifier);

        if (!provider) {
            // If it's a class, try to auto-register it
            if (typeof identifier === "function") {
                this.registerClass(identifier as Constructor);
                return this.resolve(identifier);
            }
            throw new Error(`No provider found for: ${String(identifier)}`);
        }

        this.resolving.add(identifier);

        try {
            let instance: T;

            if (provider.useValue !== undefined) {
                instance = provider.useValue as T;
            } else if (provider.useFactory) {
                instance = await provider.useFactory() as T;
            } else if (provider.useClass) {
                instance = await this.createInstance(provider.useClass) as T;
            } else {
                throw new Error(`Invalid provider configuration for: ${String(identifier)}`);
            }

            // Cache singleton
            if (provider.singleton) {
                this.singletons.set(identifier, instance);
            }

            return instance;
        } finally {
            this.resolving.delete(identifier);
        }
    }

    /**
     * Create an instance of a class, resolving its dependencies
     */
    private async createInstance<T>(target: Constructor<T>): Promise<T> {
        // Get constructor parameter types from metadata
        const paramTypes = Reflect.getMetadata?.("design:paramtypes", target) || [];
        const injections = Reflect.getMetadata?.(METADATA_KEYS.INJECT, target) || {};

        const resolvedDeps = await Promise.all(
            paramTypes.map(async (type: Constructor, index: number) => {
                // Check if there's a custom injection token for this parameter
                const customToken = injections[index];
                if (customToken) {
                    return this.resolve(customToken);
                }
                // Otherwise use the type
                return this.resolve(type);
            })
        );

        return new target(...resolvedDeps);
    }

    /**
     * Check if a provider exists
     */
    has(identifier: ServiceIdentifier): boolean {
        return this.providers.has(identifier);
    }

    /**
     * Clear all registrations
     */
    clear(): void {
        this.providers.clear();
        this.singletons.clear();
        this.resolving.clear();
    }

    /**
     * Create a child container
     */
    createChild(): Container {
        const child = new Container();
        // Copy parent providers (not singletons, they should be resolved fresh)
        for (const [key, value] of this.providers) {
            child.providers.set(key, value);
        }
        return child;
    }
}

// Global container instance
export const container = new Container();

// Export Container class for testing or custom containers
export { Container };

/**
 * Injectable decorator - marks a class as injectable
 */
export function Injectable(): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata?.(METADATA_KEYS.INJECTABLE, true, target);
        container.registerClass(target as unknown as Constructor);
    };
}

/**
 * Inject decorator - specifies a custom injection token
 */
export function Inject(token: ServiceIdentifier): ParameterDecorator {
    return (target, _propertyKey, parameterIndex) => {
        const existingInjections = Reflect.getMetadata?.(METADATA_KEYS.INJECT, target) || {};
        existingInjections[parameterIndex] = token;
        Reflect.defineMetadata?.(METADATA_KEYS.INJECT, existingInjections, target);
    };
}

/**
 * Depends function
 * Can be used for dependency injection in route handlers
 */
export function Depends<T>(
    dependency: ServiceIdentifier<T> | (() => T | Promise<T>)
): () => Promise<T> {
    return async () => {
        if (typeof dependency === "function" && !isClass(dependency)) {
            // It's a factory function
            return (dependency as () => T | Promise<T>)();
        }
        // It's a service identifier
        return container.resolve<T>(dependency as ServiceIdentifier<T>);
    };
}

/**
 * Check if a function is a class
 */
function isClass(fn: Function): boolean {
    return fn.toString().startsWith("class ");
}

/**
 * Register multiple providers at once
 */
export function registerProviders(providers: ProviderDefinition[]): void {
    for (const provider of providers) {
        container.register(provider);
    }
}
