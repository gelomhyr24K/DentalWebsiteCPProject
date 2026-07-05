# P&J Dental Clinic Management System - Architecture & Re-platforming

This document outlines the professional feature-based frontend and modular data architecture implemented for the Dental Clinic Management System.

---

## 🏗️ Project Architecture Overview

The system is designed around a modern **Feature-Based Presentation Pattern** paired with a clear **Separation of Concerns (SoC)** between reusable UI components, centralized state controls, types, and business constants.

By grouping code into distinct, self-contained domain folders, we ensure high maintainability, low coupling, and easy extendability as new features are introduced.

---

## 📁 Directory Structure

```
/
├── docs/                             # Project-wide documentation
│   └── ARCHITECTURE.md               # System Architecture (This file)
├── src/
│   ├── main.tsx                      # Vite React application entry point
│   ├── App.tsx                       # Global state coordinator and workspace router
│   ├── index.css                     # Global styles and Tailwind v4 themes
│   │
│   ├── components/                   # Shared Reusable UI Components
│   │   └── SmartAutocomplete.tsx     # Generic searchable multi-select dropdown
│   │
│   ├── features/                     # Feature-Based Domain Modules
│   │   ├── analytics/                # Financial and clinical performance analytics
│   │   │   └── Analytics.tsx
│   │   │
│   │   ├── authentication/           # User login, registration, and session management
│   │   │   └── LoginScreen.tsx
│   │   │
│   │   ├── calendar/                 # Appointment scheduling and clinic calendar grid
│   │   │   └── ClinicCalendar.tsx
│   │   │
│   │   ├── clinic-operations/        # Ledger tracking and collection accounting
│   │   │   └── ClinicOperationsLedger.tsx
│   │   │
│   │   ├── dashboard/                # Live clinic dashboards and workspace hubs
│   │   │   ├── Dashboard.tsx
│   │   │   └── WorkspaceSelection.tsx
│   │   │
│   │   ├── patients/                 # Comprehensive Patient registration and charts
│   │   │   └── components/
│   │   │       ├── PatientsList.tsx
│   │   │       ├── PatientDetails.tsx
│   │   │       ├── PersonalInfoForm.tsx
│   │   │       ├── GuardianInfoForm.tsx
│   │   │       ├── MedicalHistoryForm.tsx
│   │   │       └── DentalHistoryForm.tsx
│   │   │
│   │   ├── settings/                 # Service master records and rules manager
│   │   │   ├── MasterRecord.tsx
│   │   │   └── TreatmentRulesManager.tsx
│   │   │
│   │   ├── smart-decision-support/   # Clinical Decision Support Engine
│   │   │   └── SmartRecommendationEngine.tsx
│   │   │
│   │   └── user-management/          # Associate and Staff registration management
│   │       └── UserManagementScreen.tsx
│   │
│   ├── types/                        # Modular Type & Interface declarations
│   │   ├── index.ts                  # Re-exporting index file
│   │   ├── patient.ts                # Patient record schemas
│   │   ├── clinic.ts                 # Clinic and user authorization schemas
│   │   ├── progressNote.ts           # Treatment progress notes
│   │   ├── recall.ts                 # Recalls and charting schemas
│   │   └── treatment.ts              # Clinical rules schemas
│   │
│   ├── constants/                    # Application configuration and static lists
│   │   ├── presetAvatars.ts          # Static avatar URLs for profiles
│   │   └── medicalConditions.ts      # Clinical dropdown options
│   │
│   └── utils/                        # Shared general-purpose pure helpers
│       └── date.ts                   # Age and underage calculators
```

---

## 🛠️ Feature Modules Description

1. **`authentication`**
   - Handles account login, role-based entry checking (Clinic Owner, Associate Dentist, Staff Member), and clinic registrations.
2. **`dashboard`**
   - Renders live metric summaries, birthday cards, and workspace selections based on logged-in roles.
3. **`patients`**
   - Handles patient data lifecycles, active dental charting with status-based coloring, comprehensive clinical progress notes, digital signature captures, and billing receipt generations.
4. **`calendar`**
   - Renders daily, weekly, or monthly schedule calendars. Features quick appointment scheduling and color-coded tags indicating patient and dentist assignments.
5. **`clinic-operations`**
   - Manages clinic ledgers, patient balance payments, daily collection summaries, and medical/clinic expenses.
6. **`smart-decision-support`**
   - Evaluates active tooth status and prior treatments. Suggests treatment plans with clinical reasons and estimates.
7. **`analytics`**
   - Generates responsive charts using Recharts to display patient volumes, collection trends, and expense ratios.
8. **`settings`**
   - Houses the master record catalog (services, medicines, dental procedures) and the Treatment Rules configurations.
9. **`user-management`**
   - Handles clinic staff/associate profiles, active calendar toggles, and status updates.

---

## 💻 Development Standards & Naming Conventions

### File and Directory Naming
- **Components & Features**: Use **PascalCase** for component files (e.g. `PatientsList.tsx`, `ClinicCalendar.tsx`).
- **Types & Utils**: Use **camelCase** for modular helper scripts (e.g. `patient.ts`, `date.ts`).
- **Styles & Core**: Lowercase hyphenated names for assets or configurations.

### Types & Interfaces
- Types should always reside inside `/src/types/` rather than being declared inline within components.
- Always use standard TypeScript `interface` declarations for objects, and standard `enum` declarations for constants.

### React Practices
- All components must be **functional components** using standard Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`).
- Components should only be responsible for rendering and user interaction UI. Domain services and date-calculation utilities are completely separated out into dedicated modules.
