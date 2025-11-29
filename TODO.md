# 📋 TODO List - RFID Attendance System

## 🔴 URGENT - Security & Critical Features

### 1. 🔐 Enhance Photo Storage Security

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

**Files to modify:**

- `app/api/upload-photo/route.ts`
- `components/PersonManagement.tsx`
- `prisma/schema.prisma` (if storing in DB)
- Create new `app/api/photos/[id]/route.ts` for secure photo serving

---

### 2. 🔒 Add Authentication & Access Control

**Priority:** URGENT  
**Status:** Not Started  
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

**Files to create/modify:**

- `app/api/auth/[...nextauth]/route.ts` (if using NextAuth)
- `app/login/page.tsx`
- `middleware.ts` (for route protection)
- Update all API routes to check authentication
- `lib/auth.ts` (authentication utilities)

---

### 3. 📱 RFID Badge Scanning for User Registration

**Priority:** URGENT  
**Status:** Not Started  
**Description:** Currently, users manually type the RFID UUID when adding a person. This should be done by scanning the badge instead.

**Tasks:**

- [ ] Add RFID scanner integration in `PersonManagement.tsx` form
- [ ] Create UI component for badge scanning (button + status indicator)
- [ ] Connect to `/api/scan` endpoint or create dedicated scan endpoint for registration
- [ ] Auto-populate `rfid_uuid` field when badge is scanned
- [ ] Add visual feedback (success/error) when scanning
- [ ] Prevent duplicate UUID entries
- [ ] Add validation to ensure UUID is scanned (not manually entered)
- [ ] Handle scanner hardware integration (if using physical scanner)

**Files to modify:**

- `components/PersonManagement.tsx` (add scan button and handler)
- `app/api/scan/route.ts` (or create new endpoint for registration scanning)
- Add scanner component or integrate existing scan API

---

## 🟡 HIGH PRIORITY - Data Management & Validation

### 4. 🆔 Custom User ID Format Implementation

**Priority:** HIGH  
**Status:** Not Started  
**Description:** Modify the Person ID to follow a specific format: 10 characters total, with the first 4 characters being the first 4 characters of the user's name, and the remaining 6 characters being a random unique number.

**Format Specification:**

- Total length: 10 characters
- First 4 characters: First 4 characters of the user's name (from `nom` field, uppercase, padded if needed)
- Last 6 characters: Random unique numeric value (000000-999999)
- Must be unique across all persons
- Example: "DIAL000123" (for "Diallo" + random number 000123)

**Tasks:**

- [ ] Change Person ID from auto-increment integer to string type in database schema
- [ ] Create ID generation utility function in `lib/utils.ts`
- [ ] Implement uniqueness check before ID generation
- [ ] Handle name padding/truncation for names shorter/longer than 4 characters
- [ ] Update `app/api/persons/route.ts` to generate custom ID on person creation
- [ ] Update `app/api/persons/[id]/route.ts` to use string ID instead of integer
- [ ] Create database migration to convert existing integer IDs to new format
- [ ] Update all foreign key references (attendance.person_id, student_payments.student_id)
- [ ] Update all API endpoints that use person ID
- [ ] Update frontend components to handle string IDs
- [ ] Add validation to ensure ID format is correct
- [ ] Handle edge cases (duplicate names, name with special characters, etc.)
- [ ] Update seed data to use new ID format
- [ ] Test ID generation for uniqueness

**Files to modify:**

- `prisma/schema.prisma` (change `id` from `Int` to `String`, update foreign keys)
- `lib/utils.ts` (add `generatePersonId` function)
- `app/api/persons/route.ts` (generate ID on creation)
- `app/api/persons/[id]/route.ts` (update to use string ID)
- `app/api/attendance/route.ts` (if it uses person_id)
- `app/api/search/route.ts` (if it searches by ID)
- `components/PersonManagement.tsx` (handle string IDs)
- All other components that reference person.id
- Create migration file in `prisma/migrations/`

**Considerations:**

- Need to decide: use `nom` (last name) or `prenom` (first name) for the prefix?
- Handle names with less than 4 characters (pad with spaces or use full name?)
- Handle names with special characters (remove/convert to ASCII?)
- Ensure random number generation doesn't create collisions
- May need to update database indexes

---

## 🟡 HIGH PRIORITY - UI & UX Enhancements

### 5. 🎨 Enhance User Interface

**Priority:** HIGH  
**Status:** Not Started  
**Description:** Improve the overall UI/UX of the application for better user experience.

**Tasks:**

- [ ] Improve responsive design for mobile devices
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

**Files to modify:**

- All component files in `components/`
- `app/dashboard/page.tsx`
- `app/globals.css`

---

## 🟢 MEDIUM PRIORITY - Internationalization

### 6. 🌍 Add Multi-language Support

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

**Files to create/modify:**

- `lib/i18n.ts` or `i18n.config.ts`
- `messages/en.json`
- `messages/fr.json`
- Update all components to use translation keys
- `components/LanguageSwitcher.tsx`

---

## 📝 Additional Improvements (Future)

### 7. 📊 Enhanced Reporting

- [ ] Add export functionality (PDF, Excel, CSV)
- [ ] Add custom date range filters
- [ ] Add advanced analytics and insights
- [ ] Add email reports

### 8. 🔔 Notifications

- [ ] Add email notifications for important events
- [ ] Add SMS notifications (optional)
- [ ] Add in-app notification system

### 9. 🧪 Testing

- [ ] Add unit tests for API routes
- [ ] Add integration tests
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Add test coverage reporting

### 10. 📱 Mobile App

- [ ] Create mobile app (React Native or PWA)
- [ ] Add offline support
- [ ] Add push notifications

### 11. 🔧 DevOps & Infrastructure

- [ ] Add CI/CD pipeline
- [ ] Add Docker containerization
- [ ] Add environment-specific configurations
- [ ] Add monitoring and logging (Sentry, etc.)
- [ ] Add backup and recovery procedures

---

## 📌 Notes

- **Security items (1-3) should be prioritized** as they address critical vulnerabilities
- **UI enhancements** can be done incrementally
- **Internationalization** can be added after core features are stable
- Consider creating separate branches for each major feature

---

## 🎯 Quick Reference

**Current Issues:**

- ❌ Photos stored in public folder (security risk)
- ❌ No authentication system
- ❌ Manual UUID entry instead of scanning
- ⚠️ User ID uses auto-increment (should be custom format)
- ⚠️ UI could be more polished
- ⚠️ No multi-language support

**Next Steps:**

1. Start with photo storage security (highest priority)
2. Implement authentication system
3. Add badge scanning for registration
4. Implement custom User ID format
5. Enhance UI incrementally
6. Add internationalization support
