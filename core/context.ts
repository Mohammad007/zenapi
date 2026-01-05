/**
 * AstraAPI Context
 * Request/Response context
 */

import type { AstraContext, CookieOptions } from "./types";

/**
 * Create a new context for each request
 */
export function createContext(
    req: Request,
    params: Record<string, string> = {}
): AstraContext {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());

    let _statusCode = 200;
    const _cookies: Map<string, { value: string; options: CookieOptions }> = new Map();

    const ctx: AstraContext = {
        req,
        params,
        query,
        body: undefined,
        headers: req.headers,
        state: new Map(),
        user: undefined,

        // Response helpers
        json: <T>(data: T, status?: number) => {
            const responseHeaders = new Headers({
                "Content-Type": "application/json",
            });

            // Add cookies to response
            for (const [name, { value, options }] of _cookies) {
                responseHeaders.append("Set-Cookie", serializeCookie(name, value, options));
            }

            return new Response(JSON.stringify(data), {
                status: status ?? _statusCode,
                headers: responseHeaders,
            });
        },

        text: (data: string, status?: number) => {
            const responseHeaders = new Headers({
                "Content-Type": "text/plain",
            });

            for (const [name, { value, options }] of _cookies) {
                responseHeaders.append("Set-Cookie", serializeCookie(name, value, options));
            }

            return new Response(data, {
                status: status ?? _statusCode,
                headers: responseHeaders,
            });
        },

        html: (data: string, status?: number) => {
            const responseHeaders = new Headers({
                "Content-Type": "text/html",
            });

            for (const [name, { value, options }] of _cookies) {
                responseHeaders.append("Set-Cookie", serializeCookie(name, value, options));
            }

            return new Response(data, {
                status: status ?? _statusCode,
                headers: responseHeaders,
            });
        },

        redirect: (url: string, status = 302) => {
            return Response.redirect(url, status);
        },

        status: (code: number) => {
            _statusCode = code;
            return ctx;
        },

        // Request helpers
        getHeader: (name: string) => {
            return req.headers.get(name);
        },

        getCookie: (name: string) => {
            const cookieHeader = req.headers.get("Cookie");
            if (!cookieHeader) return undefined;

            const cookies = parseCookies(cookieHeader);
            return cookies[name];
        },

        setCookie: (name: string, value: string, options: CookieOptions = {}) => {
            _cookies.set(name, { value, options });
        },
    };

    return ctx;
}

/**
 * Parse body based on content type
 */
export async function parseBody(req: Request): Promise<unknown> {
    const contentType = req.headers.get("Content-Type") || "";

    // No body for GET/HEAD/OPTIONS
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return undefined;
    }

    try {
        if (contentType.includes("application/json")) {
            return await req.json();
        }

        if (contentType.includes("application/x-www-form-urlencoded")) {
            const text = await req.text();
            return Object.fromEntries(new URLSearchParams(text));
        }

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const result: Record<string, unknown> = {};

            for (const [key, value] of formData.entries()) {
                if (value instanceof File) {
                    result[key] = {
                        name: value.name,
                        size: value.size,
                        type: value.type,
                        lastModified: value.lastModified,
                        file: value,
                    };
                } else {
                    result[key] = value;
                }
            }

            return result;
        }

        if (contentType.includes("text/")) {
            return await req.text();
        }

        // Try to parse as JSON by default
        const text = await req.text();
        if (text) {
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        }

        return undefined;
    } catch (error) {
        console.error("[AstraAPI] Error parsing body:", error);
        return undefined;
    }
}

/**
 * Parse cookies from header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    const pairs = cookieHeader.split(";");
    for (const pair of pairs) {
        const [name, ...valueParts] = pair.trim().split("=");
        if (name) {
            cookies[name] = valueParts.join("=");
        }
    }

    return cookies;
}

/**
 * Serialize cookie for Set-Cookie header
 */
function serializeCookie(
    name: string,
    value: string,
    options: CookieOptions
): string {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.maxAge !== undefined) {
        cookie += `; Max-Age=${options.maxAge}`;
    }

    if (options.expires) {
        cookie += `; Expires=${options.expires.toUTCString()}`;
    }

    if (options.path) {
        cookie += `; Path=${options.path}`;
    }

    if (options.domain) {
        cookie += `; Domain=${options.domain}`;
    }

    if (options.secure) {
        cookie += "; Secure";
    }

    if (options.httpOnly) {
        cookie += "; HttpOnly";
    }

    if (options.sameSite) {
        cookie += `; SameSite=${options.sameSite}`;
    }

    return cookie;
}

/**
 * Response helper functions (can be used outside of context)
 */
export const Response = {
    json: <T>(data: T, status = 200, headers?: Record<string, string>) => {
        return new globalThis.Response(JSON.stringify(data), {
            status,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        });
    },

    text: (data: string, status = 200, headers?: Record<string, string>) => {
        return new globalThis.Response(data, {
            status,
            headers: {
                "Content-Type": "text/plain",
                ...headers,
            },
        });
    },

    html: (data: string, status = 200, headers?: Record<string, string>) => {
        return new globalThis.Response(data, {
            status,
            headers: {
                "Content-Type": "text/html",
                ...headers,
            },
        });
    },

    empty: (status = 204) => {
        return new globalThis.Response(null, { status });
    },

    redirect: (url: string, status = 302) => {
        return globalThis.Response.redirect(url, status);
    },
};
