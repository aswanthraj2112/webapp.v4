import { ValidationError } from './errors.js';

/**
 * Middleware to validate request body against a Zod schema
 * @param {ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const issues = result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
        }));
        return next(new ValidationError('Invalid request body', issues));
    }
    req.validatedBody = result.data;
    return next();
};

/**
 * Middleware to validate query parameters against a Zod schema
 * @param {ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        const issues = result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
        }));
        return next(new ValidationError('Invalid query parameters', issues));
    }
    req.validatedQuery = result.data;
    return next();
};

/**
 * Middleware to validate route parameters against a Zod schema
 * @param {ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
        const issues = result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
        }));
        return next(new ValidationError('Invalid route parameters', issues));
    }
    req.validatedParams = result.data;
    return next();
};
