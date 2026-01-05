<h1 align="center">🧘 AstraAPI</h1>

<p align="center">
  <strong>AstraAPI for Bun.js and Node.js — Same power, more speed</strong>
</p>

<p align="center">
  Build modern, type-safe REST APIs with TypeScript decorators, automatic validation, JWT authentication, and auto-generated OpenAPI documentation — all running on the blazing-fast Bun runtime.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/astraapi"><img src="https://img.shields.io/npm/v/astraapi.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/astraapi"><img src="https://img.shields.io/npm/dm/astraapi.svg?style=flat-square&color=green" alt="npm downloads" /></a>
  <a href="https://github.com/Mohammad007/astraapi/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square" alt="License" /></a>
  <a href="https://github.com/Mohammad007/astraapi"><img src="https://img.shields.io/github/stars/Mohammad007/astraapi?style=flat-square&color=orange" alt="GitHub Stars" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun-f472b6?style=flat-square" alt="Bun Runtime" /></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-cli">CLI</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 🌟 Why AstraAPI?

| Feature | Express | NestJS | FastAPI (Python) | **AstraAPI** |
|---------|---------|--------|------------------|------------|
| Decorators | ❌ | ✅ | ✅ | ✅ |
| Auto Validation | ❌ | ✅ | ✅ | ✅ |
| Auto OpenAPI Docs | ❌ | Plugin | ✅ | ✅ |
| Type Safety | ❌ | ✅ | Partial | ✅ |
| Startup Time | ~300ms | ~500ms | ~200ms | **~10ms** |
| Runtime | Node | Node | Python | **Bun** |

> **AstraAPI brings the developer experience of FastAPI to the JavaScript/TypeScript ecosystem, running on the fastest JavaScript runtime available.**

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎯 **Decorators**
Clean, intuitive syntax with `@Controller`, `@Get`, `@Post`, and more.

### ✅ **Validation**
Built-in Zod integration for automatic request validation.

### 🔐 **Authentication**
JWT tokens, OAuth2, password hashing, guards, and roles.

### 📚 **Auto Documentation**  
Swagger/OpenAPI docs generated automatically from your code.

</td>
<td width="50%">

### 💉 **Dependency Injection**
Service injection similar to NestJS and FastAPI.

### 🗄️ **Database Support**
Prisma ORM integration + native Bun SQLite.

### 🛠️ **CLI Tools**
Project scaffolding, code generators, and database commands.

### 🚀 **Blazing Fast**
Built for Bun runtime — ultra-fast startup and execution.

</td>
</tr>
</table>

---

## 📦 Installation

```bash
# Install with Bun (recommended)
bun add astraapi

# Or with npm
npm install astraapi

# Or with yarn
yarn add astraapi

# Or with pnpm
pnpm add astraapi
```

**Prerequisites:**
- [Bun](https://bun.sh) v1.0.0 or higher

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Windows PowerShell
powershell -c "irm bun.sh/install.ps1 | iex"
```

---

## 🚀 Quick Start

### Create Your First API in 30 Seconds

```typescript
// main.ts
import { createApp, Controller, Get, Post, Body, z } from "astraapi";

// Define validation schema
const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

// Create controller
@Controller("/users")
class UserController {
  private users = [{ id: 1, name: "Bilal", email: "bilal@example.com" }];

  @Get("/")
  getUsers() {
    return this.users;
  }

  @Post("/")
  createUser(@Body(UserSchema) data: z.infer<typeof UserSchema>) {
    const user = { id: this.users.length + 1, ...data };
    this.users.push(user);
    return user;
  }
}

// Create and start app
const app = createApp({ port: 3000 });
app.register(UserController);
app.listen();
```

### Run It

```bash
bun run main.ts
```

### Try It

```bash
# Get all users
curl http://localhost:3000/users

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'
```

### View Documentation

Open http://localhost:3000/docs for auto-generated Swagger UI! 📚

---

## 📖 Documentation

### Table of Contents

- [Controllers & Routes](#controllers--routes)
- [Parameter Decorators](#parameter-decorators)
- [Validation with Zod](#validation-with-zod)
- [Authentication](#authentication)
- [Dependency Injection](#dependency-injection)
- [Database](#database)
- [Exception Handling](#exception-handling)
- [Configuration](#configuration)

---

### Controllers & Routes

Define your API endpoints using decorators:

```typescript
import { Controller, Get, Post, Put, Patch, Delete } from "astraapi";

@Controller("/products")
class ProductController {
  @Get("/")              // GET /products
  findAll() {}

  @Get("/:id")           // GET /products/:id
  findOne() {}

  @Post("/")             // POST /products
  create() {}

  @Put("/:id")           // PUT /products/:id
  update() {}

  @Patch("/:id")         // PATCH /products/:id
  partialUpdate() {}

  @Delete("/:id")        // DELETE /products/:id
  remove() {}
}
```

---

### Parameter Decorators

Extract data from requests easily:

```typescript
import { 
  Controller, Get, Post,
  Param, Query, Body, Headers, CurrentUser, Ctx 
} from "astraapi";

@Controller("/items")
class ItemController {
  @Get("/:id")
  getItem(
    @Param("id") id: string,              // Route parameter
    @Query("include") include: string,    // Query string ?include=...
    @Headers("authorization") auth: string // Request header
  ) {
    return { id, include, auth };
  }

  @Post("/")
  createItem(
    @Body(ItemSchema) data: CreateItem,   // Validated body
    @CurrentUser() user: any,             // Authenticated user
    @Ctx() ctx: AstraContext                // Full request context
  ) {
    return { data, userId: user?.id };
  }
}
```

---

### Validation with Zod

Automatic request validation with detailed error messages:

```typescript
import { z, Body, Query } from "astraapi";

// Define schemas
const CreateUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// Use in controller
@Post("/")
createUser(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
  // data is fully validated and typed!
  return data;
}

@Get("/")
listUsers(@Query(PaginationSchema) pagination: z.infer<typeof PaginationSchema>) {
  const { page, limit } = pagination;
  return { page, limit };
}
```

**Invalid requests automatically return:**
```json
{
  "success": false,
  "error": {
    "status": 422,
    "code": "VALIDATION_ERROR",
    "message": "Validation Failed",
    "errors": [
      { "field": "email", "message": "Invalid email" },
      { "field": "age", "message": "Number must be greater than or equal to 18" }
    ]
  }
}
```

---

### Authentication

#### JWT Authentication

```typescript
import { createAuth, AuthGuard, UseGuards, CurrentUser, Password } from "astraapi";

// Create auth instance
const auth = createAuth({
  secret: process.env.JWT_SECRET!,
  expiresIn: "7d",
});

// Register user
@Post("/register")
async register(@Body(RegisterSchema) data: RegisterInput) {
  const hashedPassword = await Password.hash(data.password);
  const user = await createUser({ ...data, password: hashedPassword });
  
  const token = await auth.sign({ sub: user.id, email: user.email });
  return { user, token };
}

// Login
@Post("/login")
async login(@Body(LoginSchema) data: LoginInput) {
  const user = await findUserByEmail(data.email);
  const valid = await Password.verify(data.password, user.password);
  
  if (!valid) throw new UnauthorizedException("Invalid credentials");
  
  const token = await auth.sign({ sub: user.id, email: user.email });
  return { user, token };
}

// Protected route
@Get("/profile")
@UseGuards(new AuthGuard(auth))
getProfile(@CurrentUser() user: JWTPayload) {
  return user;
}
```

#### Role-Based Access

```typescript
import { Roles, UseGuards } from "astraapi";

@Get("/admin")
@UseGuards(new AuthGuard(auth))
@Roles("admin")
adminOnly(@CurrentUser() user: any) {
  return { message: "Welcome, admin!" };
}

@Get("/moderator")
@UseGuards(new AuthGuard(auth))
@Roles("admin", "moderator")
moderatorAccess() {
  return { message: "Moderator or Admin access" };
}
```

#### OAuth2 Support

```typescript
import { OAuth2, OAuth2Providers } from "astraapi";

const googleAuth = new OAuth2(OAuth2Providers.google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: "http://localhost:3000/auth/google/callback",
}));

@Get("/auth/google")
googleLogin() {
  return { url: googleAuth.getAuthUrl() };
}

@Get("/auth/google/callback")
async googleCallback(@Query("code") code: string) {
  const tokens = await googleAuth.getToken(code);
  // Handle user login/registration
  return tokens;
}
```

---

### Dependency Injection

Create reusable services with automatic injection:

```typescript
import { Injectable, Controller } from "astraapi";

// Define a service
@Injectable()
class EmailService {
  async send(to: string, subject: string, body: string) {
    console.log(`Sending email to ${to}: ${subject}`);
    // Actual email logic here
  }
}

@Injectable()
class UserService {
  constructor(private emailService: EmailService) {}

  async create(data: CreateUser) {
    const user = { id: 1, ...data };
    await this.emailService.send(
      user.email,
      "Welcome!",
      `Hello ${user.name}, welcome to our platform!`
    );
    return user;
  }
}

// Use in controller - services are auto-injected
@Controller("/users")
class UserController {
  constructor(private userService: UserService) {}

  @Post("/")
  async create(@Body(CreateUserSchema) data: CreateUser) {
    return this.userService.create(data);
  }
}
```

---

### Database

#### Prisma ORM

```typescript
import { createRepository } from "astraapi";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create typed repository
const userRepo = createRepository(prisma.user);

// Use repository methods
const users = await userRepo.findAll();
const user = await userRepo.findById(1);
const newUser = await userRepo.create({ name: "John", email: "john@example.com" });
const updated = await userRepo.update(1, { name: "Jane" });
const deleted = await userRepo.delete(1);

// Pagination
const paginated = await userRepo.paginate(1, 10, {
  where: { active: true },
  orderBy: { createdAt: "desc" },
});
// Returns: { items, total, page, limit, totalPages }
```

#### Bun SQLite (Native)

```typescript
import { BunSQLite } from "astraapi";

const db = new BunSQLite("./myapp.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Query data
const users = db.query("SELECT * FROM users WHERE active = ?", [true]);
const user = db.queryOne("SELECT * FROM users WHERE id = ?", [1]);

// Insert/Update/Delete
const result = db.run(
  "INSERT INTO users (name, email) VALUES (?, ?)",
  ["John", "john@example.com"]
);
console.log(`Inserted ID: ${result.lastInsertRowid}`);

// Transactions
db.transaction(() => {
  db.run("UPDATE accounts SET balance = balance - 100 WHERE id = ?", [1]);
  db.run("UPDATE accounts SET balance = balance + 100 WHERE id = ?", [2]);
});
```

---

### Exception Handling

Built-in HTTP exceptions with proper error responses:

```typescript
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  ValidationException,
} from "astraapi";

@Get("/:id")
async getUser(@Param("id") id: string) {
  const user = await findUser(parseInt(id));
  
  if (!user) {
    throw new NotFoundException("User not found");
  }
  
  return user;
}

@Post("/")
async createUser(@Body() data: CreateUser) {
  const exists = await findUserByEmail(data.email);
  
  if (exists) {
    throw new ConflictException("Email already registered");
  }
  
  return createUser(data);
}
```

**Errors are automatically formatted:**
```json
{
  "success": false,
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "User not found",
    "timestamp": "2024-01-06T12:00:00.000Z"
  }
}
```

---

### Configuration

```typescript
const app = createApp({
  // Server
  port: 3000,
  hostname: "0.0.0.0",
  
  // CORS
  cors: true,
  // or detailed config:
  cors: {
    origin: ["http://localhost:3000", "https://myapp.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  
  // Logging
  logging: true,
  
  // Global prefix
  prefix: "/api/v1",
  
  // OpenAPI/Swagger
  openapi: {
    enabled: true,
    path: "/docs",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "My awesome API built with AstraAPI",
    },
    servers: [
      { url: "http://localhost:3000", description: "Development" },
      { url: "https://api.myapp.com", description: "Production" },
    ],
  },
});
```

---

## 🛠️ CLI

AstraAPI comes with a powerful CLI for scaffolding and code generation.

### Installation

```bash
# Global install
bun install -g astraapi

# Or use with bunx
bunx astraapi <command>
```

### Commands

#### Create New Project

```bash
astraapi new my-app
cd my-app
bun install
bun run dev
```

This creates:
```
my-app/
├── src/
│   ├── controllers/
│   │   └── user.controller.ts
│   ├── services/
│   ├── models/
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── .env
```

#### Generate Code

```bash
# Generate a controller
astraapi generate controller product
# Creates: src/controllers/product.controller.ts

# Generate a service
astraapi generate service product
# Creates: src/services/product.service.ts

# Generate full CRUD (controller + service)
astraapi generate crud order
# Creates both files with full CRUD operations
```

#### Database Commands

```bash
# Generate Prisma client
astraapi db generate

# Run migrations
astraapi db migrate

# Push schema to database
astraapi db push

# Open Prisma Studio
astraapi db studio
```

#### Development

```bash
# Start dev server with hot reload
astraapi dev

# Build for production
astraapi build
```

---

## 📁 Project Structure

Recommended structure for AstraAPI projects:

```
my-app/
├── src/
│   ├── controllers/        # API route handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   └── product.controller.ts
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── product.service.ts
│   ├── models/             # Data models & DTOs
│   │   ├── user.model.ts
│   │   └── product.model.ts
│   ├── guards/             # Auth guards
│   │   └── auth.guard.ts
│   ├── middleware/         # Custom middleware
│   │   └── logging.middleware.ts
│   └── main.ts             # Application entry point
├── prisma/
│   └── schema.prisma       # Database schema
├── tests/                  # Test files
│   └── user.test.ts
├── .env                    # Environment variables
├── .env.example            # Example env file
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contributing

We love contributions! AstraAPI is an open-source project and we welcome contributions from the community.

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/Mohammad007/astraapi.git
   cd astraapi
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests for new features

5. **Run tests**
   ```bash
   bun test
   ```

6. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   We use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance

7. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```
   Then open a Pull Request on GitHub.

### Contribution Ideas

- 🐛 **Bug fixes** - Found a bug? Fix it!
- 📚 **Documentation** - Improve docs, add examples
- ✨ **Features** - Check our [issues](https://github.com/Mohammad007/astraapi/issues) for feature requests
- 🧪 **Tests** - Increase test coverage
- 🌍 **i18n** - Add translations

### Development Setup

```bash
# Clone the repo
git clone https://github.com/Mohammad007/astraapi.git
cd astraapi

# Install dependencies
bun install

# Run the example
bun run example

# Run tests
bun test

# Build
bun run build
```

---

## 📜 License

MIT License © 2024 [Mohammad007](https://github.com/Mohammad007)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

## 🙏 Acknowledgements

- Inspired by [FastAPI](https://fastapi.tiangolo.com/) (Python)
- Built with [Bun](https://bun.sh/) runtime
- Validation powered by [Zod](https://zod.dev/)
- Influenced by [NestJS](https://nestjs.com/) decorators

---

## ⭐ Star History

If you find AstraAPI useful, please consider giving it a star! ⭐

---

<p align="center">
  <strong>Made with ❤️ for the Bun community</strong>
</p>

<p align="center">
  <a href="https://github.com/Mohammad007/astraapi">GitHub</a> •
  <a href="https://www.npmjs.com/package/astraapi">NPM</a> •
  <a href="https://twitter.com/astraapi">Twitter</a> •
  <a href="https://discord.gg/astraapi">Discord</a>
</p>
