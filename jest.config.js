module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    'react-markdown': '<rootDir>/test/__mocks__/react-markdown.js'
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest'
  },
  transformIgnorePatterns: ['/node_modules/(?!(react-markdown)/)']
};
