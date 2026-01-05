/**
 * AstraAPI Basic Example
 * Demonstrates core features: routing, validation, auth, and decorators
 */

import {
    createApp,
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    CurrentUser,
    UseGuards,
    z,
    Injectable,
    createAuth,
    AuthGuard,
    Password,
} from "..";

// ============================================
// Auth Setup
// ============================================

const auth = createAuth({
    secret: "your-super-secret-key",
    expiresIn: "7d",
});

// ============================================
// DTOs (Data Transfer Objects) with Zod
// ============================================

const CreateUserSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(6),
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const UpdateUserSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
});

type CreateUser = z.infer<typeof CreateUserSchema>;
type LoginInput = z.infer<typeof LoginSchema>;
type UpdateUser = z.infer<typeof UpdateUserSchema>;

// ============================================
// Service (Business Logic)
// ============================================

interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

@Injectable()
class UserService {
    private users: User[] = [];
    private nextId = 1;

    async findAll(): Promise<Omit<User, "password">[]> {
        return this.users.map(({ password, ...user }) => user);
    }

    async findById(id: number): Promise<Omit<User, "password"> | null> {
        const user = this.users.find(u => u.id === id);
        if (!user) return null;
        const { password, ...rest } = user;
        return rest;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.users.find(u => u.email === email) || null;
    }

    async create(data: CreateUser): Promise<Omit<User, "password">> {
        const hashedPassword = await Password.hash(data.password);
        const user: User = {
            id: this.nextId++,
            name: data.name,
            email: data.email,
            password: hashedPassword,
            createdAt: new Date(),
        };
        this.users.push(user);
        const { password, ...rest } = user;
        return rest;
    }

    async validatePassword(email: string, password: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user) return null;

        const isValid = await Password.verify(password, user.password);
        return isValid ? user : null;
    }

    async update(id: number, data: UpdateUser): Promise<Omit<User, "password"> | null> {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return null;

        this.users[index] = { ...this.users[index], ...data };
        const { password, ...rest } = this.users[index];
        return rest;
    }

    async delete(id: number): Promise<boolean> {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return false;

        this.users.splice(index, 1);
        return true;
    }
}

// ============================================
// Auth Controller
// ============================================

@Controller("/auth")
class AuthController {
    constructor(private userService: UserService) { }

    @Post("/register")
    async register(@Body(CreateUserSchema) data: CreateUser) {
        const existing = await this.userService.findByEmail(data.email);
        if (existing) {
            return { error: "Email already exists", status: 400 };
        }

        const user = await this.userService.create(data);
        const token = await auth.sign({ sub: user.id, email: user.email });

        return {
            user,
            token,
        };
    }

    @Post("/login")
    async login(@Body(LoginSchema) data: LoginInput) {
        const user = await this.userService.validatePassword(data.email, data.password);

        if (!user) {
            return { error: "Invalid credentials", status: 401 };
        }

        const token = await auth.sign({ sub: user.id, email: user.email });
        const { password, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            token,
        };
    }

    @Get("/me")
    @UseGuards(new AuthGuard(auth))
    async me(@CurrentUser() user: any) {
        return user;
    }
}

// ============================================
// User Controller (Protected)
// ============================================

@Controller("/users")
class UserController {
    constructor(private userService: UserService) { }

    @Get("/")
    async getUsers(@Query("limit") limit?: string) {
        const users = await this.userService.findAll();
        if (limit) {
            return users.slice(0, parseInt(limit));
        }
        return users;
    }

    @Get("/:id")
    async getUser(@Param("id") id: string) {
        const user = await this.userService.findById(parseInt(id));
        if (!user) {
            return { error: "User not found", status: 404 };
        }
        return user;
    }

    @Put("/:id")
    @UseGuards(new AuthGuard(auth))
    async updateUser(
        @Param("id") id: string,
        @Body(UpdateUserSchema) data: UpdateUser
    ) {
        const user = await this.userService.update(parseInt(id), data);
        if (!user) {
            return { error: "User not found", status: 404 };
        }
        return user;
    }

    @Delete("/:id")
    @UseGuards(new AuthGuard(auth))
    async deleteUser(@Param("id") id: string) {
        const deleted = await this.userService.delete(parseInt(id));
        if (!deleted) {
            return { error: "User not found", status: 404 };
        }
        return { message: "User deleted successfully" };
    }
}

// ============================================
// Health Check Controller
// ============================================

@Controller("/")
class RootController {
    @Get("/")
    home() {
        return {
            name: "🧘 AstraAPI",
            version: "1.0.0",
            message: "Welcome to AstraAPI for Bun.js!",
            docs: "/docs",
            endpoints: {
                auth: {
                    register: "POST /auth/register",
                    login: "POST /auth/login",
                    me: "GET /auth/me (protected)",
                },
                users: {
                    list: "GET /users",
                    get: "GET /users/:id",
                    update: "PUT /users/:id (protected)",
                    delete: "DELETE /users/:id (protected)",
                },
            },
        };
    }

    @Get("/health")
    health() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }
}

// ============================================
// Start Application
// ============================================

const app = createApp({
    port: 3000,
    cors: true,
    logging: true,
    openapi: {
        enabled: true,
        path: "/docs",
        info: {
            title: "AstraAPI Example",
            version: "1.0.0",
            description: "A REST API built with AstraAPI featuring auth, validation, and CRUD",
        },
    },
});

// Register controllers
app.register(RootController, AuthController, UserController);

// Start server
app.listen().then(() => {
    console.log("\n📚 Try these endpoints:");
    console.log("   GET  http://localhost:3000/");
    console.log("   POST http://localhost:3000/auth/register");
    console.log("   POST http://localhost:3000/auth/login");
    console.log("   GET  http://localhost:3000/users");
    console.log("\n📖 API Docs: http://localhost:3000/docs");
});
