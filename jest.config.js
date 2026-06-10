module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup.ts'],
};
