#!/usr/bin/env bun
/**
 * ZenAPI CLI
 * Command-line interface for ZenAPI projects
 * 
 * Usage:
 *   zenapi new <project-name>    Create a new project
 *   zenapi dev                   Start development server
 *   zenapi build                 Build for production
 *   zenapi generate <type>       Generate code (controller, service, etc.)
 *   zenapi db <command>          Database operations
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

// Colors for terminal output
const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
    console.log(`${colors.green}✔${colors.reset} ${message}`);
}

function error(message: string) {
    console.log(`${colors.red}✖${colors.reset} ${message}`);
}

function info(message: string) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

// ============================================
// Project Templates
// ============================================

const templates = {
    packageJson: (name: string) => `{
  "name": "${name}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun",
    "start": "bun run dist/main.js",
    "db:generate": "bunx prisma generate",
    "db:migrate": "bunx prisma migrate dev",
    "db:push": "bunx prisma db push"
  },
  "dependencies": {
    "zenapi": "^1.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.3"
  }
}`,

    tsconfig: () => `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,

    mainTs: () => `/**
 * Main application entry point
 */
import { createApp } from "zenapi";
import { UserController } from "./controllers/user.controller";

const app = createApp({
  port: 3000,
  cors: true,
  logging: true,
  openapi: {
    enabled: true,
    path: "/docs",
    info: {
      title: "My ZenAPI App",
      version: "1.0.0",
    },
  },
});

// Register controllers
app.register(UserController);

// Start server
app.listen();
`,

    userController: () => `/**
 * User Controller
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "zenapi";
import { z } from "zenapi";

// Validation schemas
const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const UpdateUserSchema = CreateUserSchema.partial();

type CreateUser = z.infer<typeof CreateUserSchema>;
type UpdateUser = z.infer<typeof UpdateUserSchema>;

// Mock database
const users = [
  { id: 1, name: "John Doe", email: "john@example.com" },
];
let nextId = 2;

@Controller("/users")
export class UserController {
  @Get("/")
  async findAll(@Query("limit") limit?: string) {
    return limit ? users.slice(0, parseInt(limit)) : users;
  }

  @Get("/:id")
  async findOne(@Param("id") id: string) {
    const user = users.find(u => u.id === parseInt(id));
    if (!user) return { error: "User not found" };
    return user;
  }

  @Post("/")
  async create(@Body(CreateUserSchema) data: CreateUser) {
    const user = { id: nextId++, ...data };
    users.push(user);
    return user;
  }

  @Put("/:id")
  async update(@Param("id") id: string, @Body(UpdateUserSchema) data: UpdateUser) {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return { error: "User not found" };
    users[index] = { ...users[index], ...data };
    return users[index];
  }

  @Delete("/:id")
  async remove(@Param("id") id: string) {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return { error: "User not found" };
    users.splice(index, 1);
    return { message: "User deleted" };
  }
}
`,

    prismaSchema: () => `// Prisma Schema
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,

    envExample: () => `# Application
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
`,

    gitignore: () => `# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local
.env.*.local

# Database
*.db
*.db-journal

# Prisma
prisma/migrations/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
`,

    readme: (name: string) => `# ${name}

A modern API built with ZenAPI for Bun.js

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
\`\`\`

## API Documentation

Once the server is running, visit:
- API: http://localhost:3000
- Docs: http://localhost:3000/docs

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── controllers/    # API controllers
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   └── main.ts         # Entry point
├── prisma/
│   └── schema.prisma   # Database schema
└── package.json
\`\`\`

## License

MIT
`,

    // Controller generator template
    controllerTemplate: (name: string, Name: string) => `/**
 * ${Name} Controller
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "zenapi";
import { z } from "zenapi";

// Validation schemas
const Create${Name}Schema = z.object({
  // Add your fields here
  name: z.string(),
});

const Update${Name}Schema = Create${Name}Schema.partial();

type Create${Name} = z.infer<typeof Create${Name}Schema>;
type Update${Name} = z.infer<typeof Update${Name}Schema>;

@Controller("/${name}s")
export class ${Name}Controller {
  @Get("/")
  async findAll() {
    return [];
  }

  @Get("/:id")
  async findOne(@Param("id") id: string) {
    return { id };
  }

  @Post("/")
  async create(@Body(Create${Name}Schema) data: Create${Name}) {
    return data;
  }

  @Put("/:id")
  async update(@Param("id") id: string, @Body(Update${Name}Schema) data: Update${Name}) {
    return { id, ...data };
  }

  @Delete("/:id")
  async remove(@Param("id") id: string) {
    return { message: "${Name} deleted" };
  }
}
`,

    // Service generator template
    serviceTemplate: (name: string, Name: string) => `/**
 * ${Name} Service
 */
import { Injectable } from "zenapi";

@Injectable()
export class ${Name}Service {
  private items: any[] = [];
  private nextId = 1;

  async findAll() {
    return this.items;
  }

  async findById(id: number) {
    return this.items.find(item => item.id === id);
  }

  async create(data: any) {
    const item = { id: this.nextId++, ...data };
    this.items.push(item);
    return item;
  }

  async update(id: number, data: any) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async delete(id: number) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}
`,
};

// ============================================
// CLI Commands
// ============================================

async function createProject(name: string) {
    const projectPath = resolve(process.cwd(), name);

    if (existsSync(projectPath)) {
        error(`Directory "${name}" already exists`);
        process.exit(1);
    }

    log(`\n🧘 Creating ZenAPI project: ${name}\n`, "magenta");

    // Create directories
    const dirs = [
        "",
        "src",
        "src/controllers",
        "src/services",
        "src/models",
        "prisma",
    ];

    for (const dir of dirs) {
        mkdirSync(join(projectPath, dir), { recursive: true });
        success(`Created ${dir || name}/`);
    }

    // Create files
    const files: [string, string][] = [
        ["package.json", templates.packageJson(name)],
        ["tsconfig.json", templates.tsconfig()],
        ["src/main.ts", templates.mainTs()],
        ["src/controllers/user.controller.ts", templates.userController()],
        ["prisma/schema.prisma", templates.prismaSchema()],
        [".env.example", templates.envExample()],
        [".env", templates.envExample()],
        [".gitignore", templates.gitignore()],
        ["README.md", templates.readme(name)],
    ];

    for (const [file, content] of files) {
        writeFileSync(join(projectPath, file), content);
        success(`Created ${file}`);
    }

    log("\n✨ Project created successfully!\n", "green");
    log("Next steps:", "cyan");
    log(`  cd ${name}`, "dim");
    log("  bun install", "dim");
    log("  bun run dev", "dim");
    log("\n");
}

async function generateCode(type: string, name: string) {
    const srcPath = resolve(process.cwd(), "src");

    if (!existsSync(srcPath)) {
        error("Not in a ZenAPI project directory (src/ not found)");
        process.exit(1);
    }

    const Name = name.charAt(0).toUpperCase() + name.slice(1);

    switch (type) {
        case "controller":
        case "c": {
            const dir = join(srcPath, "controllers");
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

            const file = join(dir, `${name}.controller.ts`);
            writeFileSync(file, templates.controllerTemplate(name, Name));
            success(`Created src/controllers/${name}.controller.ts`);
            break;
        }

        case "service":
        case "s": {
            const dir = join(srcPath, "services");
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

            const file = join(dir, `${name}.service.ts`);
            writeFileSync(file, templates.serviceTemplate(name, Name));
            success(`Created src/services/${name}.service.ts`);
            break;
        }

        case "crud": {
            // Generate both controller and service
            const ctrlDir = join(srcPath, "controllers");
            const svcDir = join(srcPath, "services");

            if (!existsSync(ctrlDir)) mkdirSync(ctrlDir, { recursive: true });
            if (!existsSync(svcDir)) mkdirSync(svcDir, { recursive: true });

            writeFileSync(
                join(ctrlDir, `${name}.controller.ts`),
                templates.controllerTemplate(name, Name)
            );
            writeFileSync(
                join(svcDir, `${name}.service.ts`),
                templates.serviceTemplate(name, Name)
            );

            success(`Created src/controllers/${name}.controller.ts`);
            success(`Created src/services/${name}.service.ts`);
            info(`Don't forget to register ${Name}Controller in main.ts`);
            break;
        }

        default:
            error(`Unknown generator type: ${type}`);
            log("Available types: controller (c), service (s), crud", "dim");
            process.exit(1);
    }
}

async function runDev() {
    const mainFile = resolve(process.cwd(), "src/main.ts");

    if (!existsSync(mainFile)) {
        error("src/main.ts not found. Are you in a ZenAPI project?");
        process.exit(1);
    }

    info("Starting development server...\n");

    const proc = Bun.spawn(["bun", "run", "--watch", "src/main.ts"], {
        stdio: ["inherit", "inherit", "inherit"],
        cwd: process.cwd(),
    });

    await proc.exited;
}

async function runBuild() {
    const mainFile = resolve(process.cwd(), "src/main.ts");

    if (!existsSync(mainFile)) {
        error("src/main.ts not found. Are you in a ZenAPI project?");
        process.exit(1);
    }

    info("Building for production...\n");

    const proc = Bun.spawn(["bun", "build", "src/main.ts", "--outdir", "dist", "--target", "bun"], {
        stdio: ["inherit", "inherit", "inherit"],
        cwd: process.cwd(),
    });

    await proc.exited;
    success("Build complete! Output in dist/");
}

async function dbCommand(command: string) {
    switch (command) {
        case "generate":
            info("Generating Prisma client...");
            Bun.spawn(["bunx", "prisma", "generate"], { stdio: ["inherit", "inherit", "inherit"] });
            break;

        case "migrate":
            info("Running database migrations...");
            Bun.spawn(["bunx", "prisma", "migrate", "dev"], { stdio: ["inherit", "inherit", "inherit"] });
            break;

        case "push":
            info("Pushing schema to database...");
            Bun.spawn(["bunx", "prisma", "db", "push"], { stdio: ["inherit", "inherit", "inherit"] });
            break;

        case "studio":
            info("Opening Prisma Studio...");
            Bun.spawn(["bunx", "prisma", "studio"], { stdio: ["inherit", "inherit", "inherit"] });
            break;

        default:
            error(`Unknown db command: ${command}`);
            log("Available commands: generate, migrate, push, studio", "dim");
            process.exit(1);
    }
}

function showHelp() {
    console.log(`
${colors.magenta}${colors.bold}🧘 ZenAPI CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  zenapi <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}new${colors.reset} <name>              Create a new ZenAPI project
  ${colors.green}dev${colors.reset}                     Start development server
  ${colors.green}build${colors.reset}                   Build for production
  ${colors.green}generate${colors.reset} <type> <name>  Generate code
    - controller (c)        Generate a controller
    - service (s)           Generate a service
    - crud                  Generate controller + service
  ${colors.green}db${colors.reset} <command>            Database operations
    - generate              Generate Prisma client
    - migrate               Run migrations
    - push                  Push schema to database
    - studio                Open Prisma Studio

${colors.cyan}Examples:${colors.reset}
  zenapi new my-app
  zenapi generate controller user
  zenapi generate crud product
  zenapi db migrate

${colors.cyan}Documentation:${colors.reset}
  https://github.com/zenapi/zenapi
`);
}

function showVersion() {
    console.log("zenapi v1.0.0");
}

// ============================================
// Main CLI Entry
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === "help" || command === "-h" || command === "--help") {
        showHelp();
        return;
    }

    if (command === "version" || command === "-v" || command === "--version") {
        showVersion();
        return;
    }

    switch (command) {
        case "new":
        case "create":
        case "init":
            if (!args[1]) {
                error("Please provide a project name");
                log("Usage: zenapi new <project-name>", "dim");
                process.exit(1);
            }
            await createProject(args[1]);
            break;

        case "dev":
        case "start":
            await runDev();
            break;

        case "build":
            await runBuild();
            break;

        case "generate":
        case "g":
            if (!args[1] || !args[2]) {
                error("Please provide type and name");
                log("Usage: zenapi generate <type> <name>", "dim");
                log("Types: controller (c), service (s), crud", "dim");
                process.exit(1);
            }
            await generateCode(args[1], args[2]);
            break;

        case "db":
            if (!args[1]) {
                error("Please provide a db command");
                log("Usage: zenapi db <command>", "dim");
                log("Commands: generate, migrate, push, studio", "dim");
                process.exit(1);
            }
            await dbCommand(args[1]);
            break;

        default:
            error(`Unknown command: ${command}`);
            log("Run 'zenapi help' for available commands", "dim");
            process.exit(1);
    }
}

main().catch(console.error);
