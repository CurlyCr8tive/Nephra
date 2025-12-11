# KSLS Testing Setup Guide

## Current Status
The KSLS feature includes comprehensive unit tests in `server/utils/ksls-calculator.test.ts`, but the project doesn't have a testing framework configured yet.

## Quick Setup for Jest (Recommended)

### 1. Install Jest Dependencies
```bash
npm install --save-dev jest @jest/globals @types/jest ts-jest
```

### 2. Create Jest Configuration
Create `jest.config.js` in the project root:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/**/*.test.ts',
    '!server/index.ts',
  ],
};
```

### 3. Add Test Scripts to package.json
```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
    "test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage",
    "test:ksls": "node --experimental-vm-modules node_modules/jest/bin/jest.js server/utils/ksls-calculator.test.ts"
  }
}
```

### 4. Run KSLS Tests
```bash
npm run test:ksls
```

## Alternative: Vitest (Faster, Modern)

### 1. Install Vitest
```bash
npm install --save-dev vitest @vitest/ui
```

### 2. Create vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

### 3. Update Test Imports
Change from:
```typescript
import { describe, it, expect } from '@jest/globals';
```

To:
```typescript
import { describe, it, expect } from 'vitest';
```

### 4. Add Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:ksls": "vitest server/utils/ksls-calculator.test.ts"
  }
}
```

## Manual Testing (No Framework)

If you want to test manually without a framework, create `server/utils/ksls-calculator.manual-test.ts`:

```typescript
import { calculateKSLS, interpretKSLS } from './ksls-calculator.js';

// Test 1: Healthy profile
console.log('=== Test 1: Healthy Profile ===');
const healthyResult = calculateKSLS({
  systolic_bp: 115,
  diastolic_bp: 75,
  fluid_intake_liters: 2.0,
  fluid_target_liters: 2.0,
  fatigue_score: 2,
  pain_score: 1,
  stress_score: 2,
  height_cm: 170,
  weight_kg: 70,
});
console.log('KSLS:', healthyResult.ksls);
console.log('Band:', healthyResult.band);
console.log('BMI:', healthyResult.bmi);
console.log('Expected: Low score (< 33), stable band, BMI ~24.2');
console.log('');

// Test 2: High stress profile
console.log('=== Test 2: High Stress Profile ===');
const highStressResult = calculateKSLS({
  systolic_bp: 160,
  diastolic_bp: 95,
  fluid_intake_liters: 0.5,
  fluid_target_liters: 2.0,
  fatigue_score: 9,
  pain_score: 8,
  stress_score: 9,
  height_cm: 170,
  weight_kg: 95,
});
console.log('KSLS:', highStressResult.ksls);
console.log('Band:', highStressResult.band);
console.log('Expected: High score (> 66), high band');
console.log('');

// Test 3: Demographics don't affect score
console.log('=== Test 3: Demographic Invariance ===');
const testInput = {
  systolic_bp: 130,
  diastolic_bp: 85,
  fluid_intake_liters: 1.8,
  fluid_target_liters: 2.0,
  fatigue_score: 5,
  pain_score: 3,
  stress_score: 4,
  height_cm: 170,
  weight_kg: 75,
};

const result1 = calculateKSLS(testInput);
const result2 = calculateKSLS(testInput);

const interp1 = interpretKSLS(result1, { age: 25, race_ethnicity: 'White' });
const interp2 = interpretKSLS(result2, { age: 75, race_ethnicity: 'Black / African American' });

console.log('Result 1 KSLS:', result1.ksls);
console.log('Result 2 KSLS:', result2.ksls);
console.log('Scores Match:', result1.ksls === result2.ksls);
console.log('Expected: true (scores identical regardless of demographics)');
console.log('');
console.log('Interpretation 1 context:', interp1.personalized_context?.substring(0, 50) + '...');
console.log('Interpretation 2 context:', interp2.personalized_context?.substring(0, 50) + '...');
console.log('Expected: Different personalized context');
```

Run with:
```bash
tsx server/utils/ksls-calculator.manual-test.ts
```

## Test Coverage Goals

For production readiness, aim for:
- ✅ Unit test coverage > 90% for calculator logic
- ⚠️ Integration tests for API endpoints (pending)
- ⚠️ E2E tests for client UI (pending)
- ⚠️ Edge case tests (extreme values, missing data) (written, need to run)

## Priority Tests to Run First

1. **Demographic Invariance** (CRITICAL)
   - Verify same input + different demographics = same score
   - This is the core equity principle

2. **Band Classification**
   - Verify boundaries: 0-33 = stable, 34-66 = elevated, 67-100 = high

3. **Missing Data Handling**
   - Verify function works with null symptom scores
   - Verify dynamic weight re-normalization

4. **Factor Normalization**
   - Verify BP normalization at key thresholds (120, 140, 90 diastolic)
   - Verify hydration normalization at key ratios (0.6, 0.9, 1.1, 1.5)
   - Verify BMI normalization at key values (20, 30, 40)

## Next Steps

1. Choose Jest or Vitest (Vitest recommended for new projects)
2. Install dependencies
3. Add configuration file
4. Update package.json scripts
5. Run tests: `npm run test:ksls`
6. Verify all tests pass
7. Add integration tests for API endpoints
8. Add E2E tests for client components

## Current Test File
- **Location**: `server/utils/ksls-calculator.test.ts`
- **Lines**: 450+
- **Test Suites**: 3 (Core, Interpretation, Edge Cases)
- **Test Cases**: 30+
- **Status**: Written, not yet run
