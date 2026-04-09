{
  "testEnvironment": "node",
  "moduleFileExtensions": ["ts", "tsx", "js", "jsx"],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  },
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
  "collectCoverageFrom": [
    "app/api/**/*.ts",
    "lib/**/*.ts",
    "!**/node_modules/**",
    "!**/.next/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  },
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "lcov", "html"]
}
