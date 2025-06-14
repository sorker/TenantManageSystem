module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  verbose: true,
  testTimeout: 10000
}; 