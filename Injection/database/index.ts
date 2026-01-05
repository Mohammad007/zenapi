/**
 * AstraAPI Database Layer
 * Prisma + SQLite integration
 */

// Re-export for convenience
export { PrismaClient } from "@prisma/client";

/**
 * Database configuration options
 */
export interface DatabaseConfig {
    /** Database URL (default: file:./dev.db for SQLite) */
    url?: string;
    /** Enable query logging */
    logging?: boolean;
    /** Connection pool size */
    poolSize?: number;
}

/**
 * Create a typed repository for a Prisma model
 */
export function createRepository<T, CreateInput, UpdateInput>(
    model: any
) {
    return {
        /**
         * Find all records
         */
        async findAll(options?: { skip?: number; take?: number; where?: any; orderBy?: any }): Promise<T[]> {
            return model.findMany(options);
        },

        /**
         * Find one by ID
         */
        async findById(id: number | string): Promise<T | null> {
            return model.findUnique({ where: { id } });
        },

        /**
         * Find one by condition
         */
        async findOne(where: any): Promise<T | null> {
            return model.findFirst({ where });
        },

        /**
         * Create a new record
         */
        async create(data: CreateInput): Promise<T> {
            return model.create({ data });
        },

        /**
         * Update a record
         */
        async update(id: number | string, data: UpdateInput): Promise<T> {
            return model.update({ where: { id }, data });
        },

        /**
         * Delete a record
         */
        async delete(id: number | string): Promise<T> {
            return model.delete({ where: { id } });
        },

        /**
         * Count records
         */
        async count(where?: any): Promise<number> {
            return model.count({ where });
        },

        /**
         * Check if exists
         */
        async exists(where: any): Promise<boolean> {
            const count = await model.count({ where });
            return count > 0;
        },

        /**
         * Paginated find
         */
        async paginate(
            page: number = 1,
            limit: number = 10,
            options?: { where?: any; orderBy?: any }
        ): Promise<{ items: T[]; total: number; page: number; limit: number; totalPages: number }> {
            const skip = (page - 1) * limit;
            const [items, total] = await Promise.all([
                model.findMany({ ...options, skip, take: limit }),
                model.count({ where: options?.where }),
            ]);

            return {
                items,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        },
    };
}

/**
 * Base repository class (alternative to function)
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
    constructor(protected model: any) { }

    async findAll(options?: { skip?: number; take?: number; where?: any; orderBy?: any }): Promise<T[]> {
        return this.model.findMany(options);
    }

    async findById(id: number | string): Promise<T | null> {
        return this.model.findUnique({ where: { id } });
    }

    async findOne(where: any): Promise<T | null> {
        return this.model.findFirst({ where });
    }

    async create(data: CreateInput): Promise<T> {
        return this.model.create({ data });
    }

    async update(id: number | string, data: UpdateInput): Promise<T> {
        return this.model.update({ where: { id }, data });
    }

    async delete(id: number | string): Promise<T> {
        return this.model.delete({ where: { id } });
    }

    async count(where?: any): Promise<number> {
        return this.model.count({ where });
    }

    async exists(where: any): Promise<boolean> {
        const count = await this.model.count({ where });
        return count > 0;
    }

    async paginate(
        page: number = 1,
        limit: number = 10,
        options?: { where?: any; orderBy?: any }
    ) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.model.findMany({ ...options, skip, take: limit }),
            this.model.count({ where: options?.where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}

/**
 * SQLite helper for Bun native SQLite
 */
export class BunSQLite {
    private db: any;

    constructor(filename: string = ":memory:") {
        // Use Bun's native SQLite
        const Database = require("bun:sqlite").Database;
        this.db = new Database(filename);
    }

    /**
     * Execute a query
     */
    query<T = any>(sql: string, params?: any[]): T[] {
        const stmt = this.db.prepare(sql);
        return params ? stmt.all(...params) : stmt.all();
    }

    /**
     * Execute a single query
     */
    queryOne<T = any>(sql: string, params?: any[]): T | null {
        const stmt = this.db.prepare(sql);
        return params ? stmt.get(...params) : stmt.get();
    }

    /**
     * Run a statement (INSERT, UPDATE, DELETE)
     */
    run(sql: string, params?: any[]): { changes: number; lastInsertRowid: number } {
        const stmt = this.db.prepare(sql);
        return params ? stmt.run(...params) : stmt.run();
    }

    /**
     * Execute multiple statements
     */
    exec(sql: string): void {
        this.db.exec(sql);
    }

    /**
     * Create a transaction
     */
    transaction<T>(fn: () => T): T {
        return this.db.transaction(fn)();
    }

    /**
     * Close the database
     */
    close(): void {
        this.db.close();
    }
}
