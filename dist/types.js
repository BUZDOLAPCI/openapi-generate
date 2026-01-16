/**
 * Type guards
 */
export function isOpenAPIV3(spec) {
    return (typeof spec === 'object' &&
        spec !== null &&
        'openapi' in spec &&
        typeof spec.openapi === 'string' &&
        spec.openapi.startsWith('3.'));
}
export function isOpenAPIV3_1(spec) {
    return (typeof spec === 'object' &&
        spec !== null &&
        'openapi' in spec &&
        typeof spec.openapi === 'string' &&
        spec.openapi.startsWith('3.1'));
}
/**
 * Helper to create success response
 */
export function successResponse(data, meta) {
    return {
        ok: true,
        data,
        meta: {
            retrieved_at: new Date().toISOString(),
            warnings: [],
            ...meta,
        },
    };
}
/**
 * Helper to create error response
 */
export function errorResponse(code, message, details = {}) {
    return {
        ok: false,
        error: {
            code,
            message,
            details,
        },
        meta: {
            retrieved_at: new Date().toISOString(),
        },
    };
}
//# sourceMappingURL=types.js.map