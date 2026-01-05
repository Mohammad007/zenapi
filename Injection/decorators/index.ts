/**
 * AstraAPI Decorators - Main Export
 */

// Controller
export { Controller, ApiTags, type ControllerOptions } from "./controller";

// Routes
export {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Options,
    Head,
    Use,
    ApiOperation,
    type RouteOptions,
} from "./route";

// Parameters
export {
    Body,
    Query,
    Param,
    Headers,
    Ctx,
    CurrentUser,
    Req,
} from "./params";

// Auth
export {
    UseGuards,
    Roles,
    Public,
    isPublicRoute,
    type Guard,
    type GuardClass,
} from "./auth";
