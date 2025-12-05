# 📋 TODO

<details>
<summary>Quick Reference</summary>

**Current Issues:**

- ❌ Photos stored in public folder (security risk)
- ❌ No authentication system
- ⚠️ UI could be more polished
- ⚠️ Mobile rendering needs refactoring
- ⚠️ Lint errors and warnings need to be fixed
- ⚠️ No multi-language support

</details>

## 🔴 URGENT

### 🔐 Enhance Photo Storage Security

<details>
<summary>Click to expand details</summary>

**Priority:** URGENT  
**Status:** Not Started  
**Description:** Currently, photos are stored in the `public/photos/` folder, making them publicly accessible without authentication. This is a security risk.

**Tasks:**

- [ ] Store photos in database (as BLOB/Binary) or secure storage outside public folder
- [ ] Create secure API endpoint to serve photos with authentication checks
- [ ] Update `app/api/upload-photo/route.ts` to store photos securely
- [ ] Update `components/PersonManagement.tsx` to use secure photo endpoints
- [ ] Migrate existing photos from `public/photos/` to secure storage
- [ ] Update database schema if needed to store binary data or secure paths
- [ ] Add access control to photo retrieval (only authorized users can view photos)

</details>

---

### 🔒 Add Authentication & Access Control

<details>
<summary>Click to expand details</summary>

**Priority:** URGENT  
**Status:** Started  
**Description:** The system currently has no authentication. All API endpoints and pages are publicly accessible, which is a major security vulnerability.

**Tasks:**

- [ ] Implement authentication system (NextAuth.js or similar)
- [ ] Create user/login management system
- [ ] Add role-based access control (Admin, Staff, Viewer)
- [ ] Protect all API routes with authentication middleware
- [ ] Add login page and session management
- [ ] Implement password hashing and secure storage
- [ ] Add logout functionality
- [ ] Protect dashboard and management pages
- [ ] Add JWT tokens or session cookies
- [ ] Create middleware for route protection

</details>

---

## 🟡 HIGH PRIORITY

### 🔧 Fix Lint Errors and Warnings

<details>
<summary>Click to expand details</summary>

**Priority:** HIGH  
**Status:** Started  
**Description:** Fix all linting errors, warnings, and code quality issues throughout the codebase to ensure clean, maintainable code.

**Tasks:**

- [ ] Run linter on entire codebase to identify all errors and warnings
- [ ] Fix TypeScript type errors and warnings
- [ ] Fix ESLint errors and warnings
- [ ] Fix unused imports and variables
- [ ] Fix missing dependencies in useEffect hooks
- [ ] Fix accessibility warnings (if any)
- [ ] Fix console errors and warnings
- [ ] Ensure consistent code formatting across all files
- [ ] Add missing type definitions
- [ ] Fix any deprecated API usage
- [ ] Resolve any build-time warnings
- [ ] Update ESLint/TypeScript configuration if needed

</details>

---

### 🎨 Enhance User Interface

<details>
<summary>Click to expand details</summary>

**Priority:** HIGH  
**Status:** Not Started  
**Description:** Improve the overall UI/UX of the application for better user experience.

**Tasks:**

- [ ] Improve responsive design for mobile devices
- [ ] Refactor the mobile rendering
- [ ] Add loading states and skeleton screens
- [ ] Enhance form validation with better error messages
- [ ] Add toast notifications for success/error messages
- [ ] Improve table design with better spacing and typography
- [ ] Add dark mode support (if not already present)
- [ ] Enhance dashboard with better charts and visualizations
- [ ] Add animations and transitions for better UX
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Add confirmation dialogs for destructive actions
- [ ] Enhance photo preview and upload experience
- [ ] Add pagination for large data sets

</details>

---

## 🟢 MEDIUM PRIORITY

### 🌍 Add Multi-language Support

<details>
<summary>Click to expand details</summary>

**Priority:** MEDIUM  
**Status:** Not Started  
**Description:** Add support for multiple languages, starting with French and potentially more languages.

**Tasks:**

- [ ] Set up i18n library (next-intl, react-i18next, or similar)
- [ ] Create translation files for English and French
- [ ] Add language switcher component
- [ ] Translate all UI text, labels, and messages
- [ ] Translate error messages and notifications
- [ ] Translate form labels and placeholders
- [ ] Add language detection (browser/URL based)
- [ ] Store language preference in user settings
- [ ] Translate API error messages
- [ ] Add support for additional languages (Arabic, Spanish, etc.)

</details>

---

## 📝 Additional Improvements

### 📊 Enhanced Reporting

<details>
<summary>Click to see tasks</summary>

**Tasks:**

- [ ] Add export functionality (PDF, Excel, CSV)
- [ ] Add custom date range filters
- [ ] Add advanced analytics and insights
- [ ] Add email reports

</details>

### 🔔 Notifications

<details>
<summary>Click to see tasks</summary>

**Tasks:**

- [ ] Add email notifications for important events
- [ ] Add SMS notifications (optional)
- [ ] Add in-app notification system

</details>

### 10. 🧪 Testing

<details>
<summary>Click to see tasks</summary>

**Tasks:**

- [ ] Add unit tests for API routes
- [ ] Add integration tests
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Add test coverage reporting

</details>

### 📱 Mobile App

<details>
<summary>Click to see tasks</summary>

**Tasks:**

- [ ] Create mobile app (React Native or PWA)
- [ ] Add offline support
- [ ] Add push notifications

</details>

### 🔧 DevOps & Infrastructure

<details>
<summary>Click to see tasks</summary>

**Tasks:**

- [ ] Add CI/CD pipeline
- [ ] Add Docker containerization
- [ ] Add environment-specific configurations
- [ ] Add monitoring and logging (Sentry, etc.)
- [ ] Add backup and recovery procedures

</details>

---

## 📌 Notes

- **Security items (1-3) should be prioritized** as they address critical vulnerabilities
- **UI enhancements** can be done incrementally
- **Internationalization** can be added after core features are stable
- Consider creating separate branches for each major feature
