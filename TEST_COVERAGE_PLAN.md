# Test Coverage Roadmap
**Goal**: Reach 5% coverage by end of Week 1  
**Strategy**: Short, focused bursts of 1-2 hours each  
**Target Date**: February 15, 2026  

---

## Current State
- **Test Files**: 0
- **Test Coverage**: 0%
- **Total Lines of Code**: ~12,000
- **LOC to Cover for 5%**: ~600 lines

---

## 📋 Coverage Plan: 0% → 5% (3 Bursts)

### **BURST 1: Setup & Authentication Tests** (90 min)
**Goal**: Add Jest/Vitest, write 8 tests, hit 1-2% coverage

#### Tasks
- [ ] Install testing dependencies
- [ ] Setup Jest config
- [ ] Create first test file: `server/services/email/oauth-provider.test.ts`
- [ ] Write 8 OAuth tests

#### Tests to Write
```typescript
// oauth-provider.test.ts - 8 tests

1. ✓ fetchGmailEmails - returns emails array
2. ✓ fetchGmailEmails - respects skip parameter
3. ✓ fetchGmailEmails - respects limit parameter
4. ✓ fetchOutlookEmails - returns emails array
5. ✓ fetchOutlookEmails - respects skip parameter
6. ✓ fetchOutlookEmails - respects limit parameter
7. ✓ refreshAccessToken - Gmail provider
8. ✓ refreshAccessToken - Outlook provider
```

**Estimated Coverage**: ~150 lines (oauth-provider.ts has ~400 lines)  
**Coverage Gain**: +1.25%

#### Setup Commands
```bash
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev vitest
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

#### Jest Config
```javascript
// jest.config.js (create new)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/client'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    'client/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
```

**Duration**: 90 minutes  
**Timeline**: Monday/Tuesday Feb 10-11

---

### **BURST 2: Email Pagination Tests** (90 min)
**Goal**: Write 10 tests, add 2% coverage

#### Tasks
- [ ] Create `server/routes/email.test.ts`
- [ ] Create `server/routes/auth.test.ts`
- [ ] Write 10 core route tests

#### Tests to Write
```typescript
// email.test.ts - 6 tests

1. ✓ GET /api/email/oauth - returns encrypted data
2. ✓ GET /api/email/oauth - respects limit query param
3. ✓ GET /api/email/oauth - respects skip query param
4. ✓ GET /api/email/oauth/all - combines all providers
5. ✓ GET /api/email/oauth/all - includes hasMore flag
6. ✓ GET /api/email/test - returns test emails

// auth.test.ts - 4 tests

7. ✓ GET /auth/google/login - returns auth URL
8. ✓ GET /auth/outlook/login - returns auth URL
9. ✓ POST /auth/logout - clears credentials
10. ✓ GET /auth/status - returns provider status
```

**Estimated Coverage**: ~200 lines (email.ts: 982 lines + auth.ts: 400 lines)  
**Coverage Gain**: +1.67%

**Duration**: 90 minutes  
**Timeline**: Wednesday/Thursday Feb 12-13

---

### **BURST 3: Client Component Tests** (60 min)
**Goal**: Test UnifiedInbox component, add 1.5% coverage, reach 5%

#### Tasks
- [ ] Create `client/pages/UnifiedInbox.test.tsx`
- [ ] Write 8 component tests

#### Tests to Write
```typescript
// UnifiedInbox.test.tsx - 8 tests

1. ✓ Renders email list when emails loaded
2. ✓ Shows loading state initially
3. ✓ Displays correct email count
4. ✓ Load More button visible when hasMore=true
5. ✓ Load More button hidden when hasMore=false
6. ✓ Filters emails by provider
7. ✓ Fetches more emails on Load More click
8. ✓ Deduplicates emails after Load More
```

**Estimated Coverage**: ~150 lines (pagination logic in UnifiedInbox.tsx)  
**Coverage Gain**: +1.25%

**Total Coverage Achieved**: ~5%

**Duration**: 60 minutes  
**Timeline**: Friday Feb 14

---

## 📊 Weekly Breakdown

| Day | Burst | Tests | Duration | Coverage |
|-----|-------|-------|----------|----------|
| Mon | Setup + Auth | 8 | 90 min | 1.2% |
| Wed | Routes | 10 | 90 min | 1.7% |
| Fri | Components | 8 | 60 min | 1.1% |
| | **TOTAL** | **26** | **240 min** | **~5%** |

---

## 🛠️ File Structure After BURST 3

```
server/
  services/
    email/
      oauth-provider.test.ts (NEW - 8 tests)
      oauth-provider.ts
  routes/
    email.test.ts (NEW - 6 tests)
    auth.test.ts (NEW - 4 tests)
    auth.ts
    email.ts

client/
  pages/
    UnifiedInbox.test.tsx (NEW - 8 tests)
    UnifiedInbox.tsx
```

---

## 📈 Coverage Targets Beyond 5%

### BURST 4: Utils & Hooks (Post-Feb 15)
```
- utils.test.ts (5 tests)
- use-security.test.ts (4 tests)
- use-theme.test.ts (3 tests)
Target: +2% coverage (reach 7%)
```

### BURST 5: More Component Tests (Post-Feb 15)
```
- Settings.test.tsx (6 tests)
- Dashboard.test.tsx (5 tests)
- EmailList.test.tsx (4 tests)
Target: +2% coverage (reach 9%)
```

### BURST 6: Integration Tests (Post-Feb 15)
```
- Full OAuth flow test
- Email fetching pipeline test
- Pagination + filtering test
Target: +3% coverage (reach 12%)
```

---

## ✅ Definition of Done

Each test file must have:
- ✓ Clear test descriptions
- ✓ Proper mocking of external dependencies
- ✓ Error cases tested
- ✓ Type safety (no any types)
- ✓ Comments explaining complex mocks
- ✓ Passing CI/CD checks

---

## 🎯 Quick Start Commands

**Install dependencies**
```bash
npm install --save-dev jest ts-jest @types/jest vitest @testing-library/react @testing-library/jest-dom
```

**Create jest.config.js** (provided above)

**Run tests**
```bash
npm test                      # Run all tests
npm test -- --coverage        # Show coverage report
npm test -- --watch          # Watch mode
npm test -- --updateSnapshot # Update snapshots
```

**Add to package.json**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 🚀 Success Criteria

- ✅ 26 tests written across 5 files
- ✅ All tests passing
- ✅ 5% code coverage achieved
- ✅ No `any` types in test files
- ✅ CI/CD pipeline configured
- ✅ Coverage badge ready for README

---

## 📝 Notes

- **Why These Files First?**: OAuth and email fetching are highest-risk, most-critical paths
- **Why Short Bursts?**: Prevents burnout, easier to merge, maintains momentum
- **Why 5% Goal?**: ~26 tests is achievable in 4 hours, establishes testing culture
- **Post-5%**: Leverage tests as templates for further coverage growth

---

**Plan Created**: February 8, 2026  
**Target Completion**: February 15, 2026  
**Effort Required**: ~4 hours (3 short bursts)
