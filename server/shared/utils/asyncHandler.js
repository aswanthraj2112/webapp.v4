/**
 * Async handler wrapper for Express routes
 * Catches rejected promises and forwards errors to Express error handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
