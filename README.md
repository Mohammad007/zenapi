# 🧘 ZenAPI

**FastAPI for Bun.js – Same power, more speed**

[![npm version](https://badge.fury.io/js/zenapi.svg)](https://www.npmjs.com/package/zenapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build modern REST APIs with TypeScript decorators, automatic validation, JWT authentication, and auto-generated OpenAPI documentation.

## ✨ Features

- 🚀 **Bun-native** - Built specifically for Bun runtime
- 🎯 **Decorators** - Clean, intuitive `@Controller`, `@Get`, `@Post` syntax
- ✅ **Validation** - Zod schemas with automatic request validation
- 🔐 **Authentication** - JWT + OAuth2 built-in
- 📚 **Auto Docs** - Swagger/OpenAPI auto-generated
- 💉 **Dependency Injection** - Service injection like FastAPI
- 🗄️ **Database** - Prisma + SQLite support
- 🛠️ **CLI** - Project scaffolding and code generation

## 📦 Installation

```bash
bun add zenapi
```

## 🚀 Quick Start

```typescript
import { createApp, Controller, Get, Post, Body, z } from "zenapi";

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

@Controller("/users")
class UserController {
  @Get("/")
  getUsers() {
    return [{ id: 1, name: "Bilal" }];
  }

  @Post("/")
  createUser(@Body(UserSchema) data: z.infer<typeof UserSchema>) {
    return { id: 2, ...data };
  }
}

const app = createApp({ port: 3000 });
app.register(UserController);
app.listen();
```

Run your app:
```bash
bun run main.ts
```

Visit:
- API: http://localhost:3000
- Docs: http://localhost:3000/docs

## 📖 Documentation

### Decorators

#### Controller & Routes
```typescript
@Controller("/users")
class UserController {
  @Get("/")         // GET /users
  @Get("/:id")      // GET /users/:id
  @Post("/")        // POST /users
  @Put("/:id")      // PUT /users/:id
  @Patch("/:id")    // PATCH /users/:id
  @Delete("/:id")   // DELETE /users/:id
}
```

#### Parameters
```typescript
@Get("/:id")
getUser(
  @Param("id") id: string,           // Route params
  @Query("page") page: string,       // Query params
  @Body(Schema) data: any,           // Request body with validation
  @Headers("auth") auth: string,     // Headers
  @CurrentUser() user: any,          // Authenticated user
  @Ctx() ctx: ZenContext,            // Full context
) {}
```

### Validation with Zod

```typescript
import { z, Body } from "zenapi";

const CreateUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
});

@Post("/")
createUser(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
  return data;
}
```

### Authentication

```typescript
import { createAuth, AuthGuard, UseGuards, CurrentUser } from "zenapi";

const auth = createAuth({
  secret: "your-secret-key",
  expiresIn: "7d",
});

// Create token
const token = await auth.sign({ sub: userId, email });

// Verify token
const payload = await auth.verify(token);

// Protect routes
@UseGuards(new AuthGuard(auth))
@Get("/me")
getProfile(@CurrentUser() user: any) {
  return user;
}
```

### Password Hashing

```typescript
import { Password } from "zenapi";

// Hash password
const hash = await Password.hash("mypassword");

// Verify password
const isValid = await Password.verify("mypassword", hash);

// Generate random token
const token = Password.generateToken(32);
```

### Dependency Injection

```typescript
import { Injectable, Controller } from "zenapi";

@Injectable()
class UserService {
  async findAll() {
    return [];
  }
}

@Controller("/users")
class UserController {
  constructor(private userService: UserService) {}

  @Get("/")
  async getUsers() {
    return this.userService.findAll();
  }
}
```

### Database (Prisma)

```typescript
import { createRepository } from "zenapi/database";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const userRepo = createRepository(prisma.user);

// CRUD operations
await userRepo.findAll();
await userRepo.findById(1);
await userRepo.create({ name: "John", email: "john@example.com" });
await userRepo.update(1, { name: "Jane" });
await userRepo.delete(1);
await userRepo.paginate(1, 10);
```

### Bun SQLite (Native)

```typescript
import { BunSQLite } from "zenapi/database";

const db = new BunSQLite("./mydb.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE
  )
`);

const users = db.query("SELECT * FROM users");
db.run("INSERT INTO users (name, email) VALUES (?, ?)", ["John", "john@example.com"]);
```

## 🛠️ CLI

```bash
# Install globally
bun install -g zenapi

# Create new project
zenapi new my-app

# Start development server
zenapi dev

# Generate code
zenapi generate controller user
zenapi generate service user
zenapi generate crud product

# Database commands
zenapi db generate
zenapi db migrate
zenapi db push
zenapi db studio
```

## 📁 Project Structure

```
my-app/
├── src/
│   ├── controllers/      # API Controllers
│   ├── services/         # Business Logic
│   ├── models/           # Data Models
│   └── main.ts           # Entry Point
├── prisma/
│   └── schema.prisma     # Database Schema
├── package.json
└── tsconfig.json
```

## 🔧 Configuration

```typescript
const app = createApp({
  port: 3000,
  hostname: "0.0.0.0",
  cors: true,  // or { origin: "*", credentials: true }
  logging: true,
  prefix: "/api/v1",
  openapi: {
    enabled: true,
    path: "/docs",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API Description",
    },
  },
});
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © Bilal

---

Made with ❤️ for the Bun community
