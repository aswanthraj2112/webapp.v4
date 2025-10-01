// This file is deprecated - SQLite persistence has been removed
// The application now uses DynamoDB for all data persistence
// Video files are stored in S3, not local storage

console.warn('⚠️  db.js is deprecated. The application now uses DynamoDB.');
console.warn('⚠️  All data is persisted in AWS DynamoDB and files in S3.');

export const getDb = () => {
  throw new Error('SQLite database is no longer supported. Use DynamoDB.');
};

export async function initDb() {
  throw new Error('SQLite database initialization is no longer supported. Use DynamoDB.');
}

// For backward compatibility, export a rejected promise
export default Promise.reject(new Error('SQLite database is no longer supported. Use DynamoDB.'));
