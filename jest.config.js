module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.superpowers/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
