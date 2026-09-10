/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['**/*.(t|j)s', '!main.ts', '!data-source.ts'],
  coverageDirectory: '../coverage',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@infra/(.*)$': '<rootDir>/infrastructure/$1',
  },
};
