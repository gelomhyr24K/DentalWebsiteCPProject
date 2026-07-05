# P&J Tanarte Dental Clinic Digital Ledger

A comprehensive, state-of-the-art Dental Clinic Management System designed to handle patient records, dental charting, calendar scheduling, billing & ledger tracking, prescription management, and PDF document customization.

---

## 📋 1. Project Description
This system serves as a digital ledger and workspace for dental practitioners. It streamlines clinic operations with the following modules:
*   **Dashboard**: A clinical overview of active patient records, scheduling statuses, upcoming birthdays, and billing summaries.
*   **Patients Registry**: Centralized patient profiles with searchable medical history and treatment tracking.
*   **Dental Charting**: Graphical, interactive dental chart supporting status indicators, prosthodontics, and surgical markings.
*   **Calendar & Appointments**: Live visual calendar for scheduling, tracking checkups, and dispatching reminders.
*   **Master File Directory**: A customizable metadata index for treatment procedures, fees, medicines, habit checklists, and tagging logic.
*   **System Settings**: Live designers for branding details, logos, custom printable PDF receipts, certificates, and surgery consent forms.

---

## 🛠️ 2. Tech Stack
The application is built on a modern, high-performance web development stack:
*   **Frontend Library**: React (v19)
*   **Programming Language**: TypeScript
*   **Bundler & Build Tool**: Vite (v8)
*   **Styling**: Tailwind CSS & Custom CSS
*   **Database & Authentication**: Supabase (PostgreSQL with Realtime capabilities)
*   **Runtime Environment**: Node.js & npm

---

## 💻 3. Prerequisites & Requirements
To run this project locally, ensure you have the following installed on your machine:
*   **Node.js**: Recommended LTS Version `18.x` or `20.x` (Do not use legacy versions)
*   **npm**: Comes bundled with Node.js (v9+ recommended)
*   **Git**: For cloning the repository and managing version control
*   **Supabase Account**: A free Supabase project to host your database schemas
*   **Web Browser**: Google Chrome, Microsoft Edge, or Mozilla Firefox (Recommended for development tools)

---

## 📦 4. How to Install
Follow these simple step-by-step instructions to get the application set up on your machine:

1.  **Clone the Repository**:
    Open your terminal, command prompt, or Git Bash, and clone the project using Git:
    ```bash
    git clone https://github.com/gelomhyr24K/DentalWebsiteCPProject.git
    ```
2.  **Navigate to Project Directory**:
    Move into the root folder of the cloned repository:
    ```bash
    cd V5
    ```
3.  **Install Project Dependencies**:
    Run the following command to download and install all required packages:
    ```bash
    npm install
    ```
4.  **Set Up Environment Variables**:
    *   Duplicate the file named `.env.example` in the root folder.
    *   Rename the duplicate file to `.env.local` (or `.env`).
    *   Open the newly created file in your text editor and fill in your Supabase project keys (see the **Environment Variables** section below).

---

## ⚙️ 5. Environment Variables
To connect the application to Supabase, create a file named `.env.local` in the project root directory and add the following keys:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-reference.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anonymous-public-key
VITE_SUPABASE_PUBLISHABLE_KEY=your-actual-anonymous-public-key

# Developer/Demo Mode Auth Toggle (set to true for offline local mock login)
VITE_ENABLE_DEV_AUTH=true
```

> [!WARNING]
> **Security Protocol**: Never place your `SUPABASE_SERVICE_ROLE_KEY` (secret key) in a frontend environment file or commit it to GitHub. This key bypasses row-level security and must remain private.

---

## 🔑 6. Developer Mock Login Mode
To facilitate local development and quick testing without configuring real email accounts or checking OTPs, the app supports **Developer Mock Login Mode**.

*   **Enabling Mock Login**: Set `VITE_ENABLE_DEV_AUTH=true` in your `.env.local` file.
*   **Access Credentials**: Use the following pre-configured mock user profiles:

### 💼 Clinic Owner Account
*   **Email**: `pnjtanartedentalclinic@gmail.com`
*   **Password**: `pnjtanarte2020`
*   *Role capabilities: Full administration, Users & Roles management, Master Directory configuration, Billing.*

### 🩺 Associate Dentist Account
*   **Email**: `associate@pj-dental.com`
*   **Password**: `pj2020`
*   *Role capabilities: Patient records, Dental charts, Calendar, Appointments.*

### 📝 Staff Member Account
*   **Email**: `staff@pj-dental.com`
*   **Password**: `pj2020`
*   *Role capabilities: View appointments, reception desk controls.*

> [!IMPORTANT]
> **Production Handoff**: Set `VITE_ENABLE_DEV_AUTH=false` in production environments to enforce standard Supabase Auth OTP verification.

---

## 🗄️ 7. Supabase Database Schema Setup
You must initialize your Supabase database schema before running the application:

1.  Log in to your **Supabase Dashboard**.
2.  Select your project and click on the **SQL Editor** tab in the left sidebar.
3.  Click **New Query** to open an editor window.
4.  Copy the content of the schema files located in the `Assets/` directory in this chronological order:
    *   **Step 1**: Load and run `Assets/supabase-schema.sql` (Creates core tables, columns, and types).
    *   **Step 2**: Load and run `Assets/supabase-phase2-migration.sql` (Applies schema upgrades and structures).
    *   **Step 3**: Load and run `Assets/supabase-clinic-users.sql` (Configures the clinic users authorization profiles).
5.  Click the **Run** button for each script execution.

---

## 🚀 8. How to Run the Application
Launch the local web server to start using the system:

1.  Start the Vite development server:
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to the link printed in the terminal (typically `http://localhost:5173`).
3.  Any changes you make to the source files will reflect in the browser instantly.

*Note: If you need to seed administrative authentication accounts directly to your backend, you can also run the utility script:*
```bash
npm run seed:demo-auth-users
```

---

## 🏗️ 9. Building for Production Deployment
To compile and optimize the application for hosting on production environments (Vercel, Netlify, Hostinger, etc.):

1.  Compile TypeScript files and bundle assets:
    ```bash
    npm run build
    ```
2.  All optimized bundle output will compile inside the **`Frontend/dist/`** directory.
3.  You can locally test the production build before hosting it live by running:
    ```bash
    npm run preview
    ```

---

## 📂 10. Project Directory Guide
*   `Frontend/app.tsx`: The core application container, sidebar router, and state manager.
*   `Frontend/src/components/`: Reusable React layout elements (e.g., `DentalChart`, `MasterFileDirectory`, `ClinicCalendar`).
*   `Frontend/src/services/`: Supabase communication adapters (e.g., `patientService.ts`, `appointmentService.ts`).
*   `Frontend/src/utils/`: Shared utilities (e.g., finance formatters, developer authentication locks).
*   `Frontend/src/types/`: TypeScript interface declarations.
*   `Backend/scripts/`: Backend management tasks and database seeding scripts.
*   `Assets/`: PostgreSQL SQL scripts for schema migrations.

---

## ⚠️ 11. Troubleshooting & Common Issues
*   **Blank Page or "Missing configuration" Banner**:
    Ensure your `.env.local` contains correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` properties, and that they start with `https://`.
*   **Mock Login Fails**:
    Check that `VITE_ENABLE_DEV_AUTH` is explicitly set to `true` inside `.env.local`. Restart your development server (`Ctrl + C` and run `npm run dev`) after modifying environment files.
*   **Port 5173 Already In Use**:
    Vite will automatically fall back to another port (e.g. `5174`). Check your terminal logs for the updated URL.
*   **Database Errors / Missing Columns**:
    Make sure you have run all three SQL files in the **Supabase Database Schema Setup** guide in the exact order specified.
*   **Module Not Found / NPM Install Fails**:
    Delete the `node_modules` folder and `package-lock.json` file, then run `npm install` again.

---

## 👥 12. Team Workflow Guidelines
*   **Always Pull First**: Run `git pull origin main` before starting any coding block to avoid conflicts.
*   **Use Feature Branches**: Avoid committing directly to `main`. Create branches: `git checkout -b feature/your-feature-name`.
*   **Run Build Before Pushing**: Verify your code compiles successfully without compilation issues by running `npm run build` before pushing commits.
*   **Keep Secrets Safe**: Never check in `.env.local` or `.env` files. Ensure they are listed in `.gitignore`.

---

## 🚀 13. Production Deployment Checks
Before publishing your capstone to production web hosting:
1.  Disable local mock auth: `VITE_ENABLE_DEV_AUTH=false`.
2.  Enable Row Level Security (RLS) on your Supabase tables.
3.  Configure official emails and standard user authorization in your Supabase Auth dashboard.

---

## 📞 14. Support & Contacts
For queries regarding setup, database access configuration, or hosting parameters, reach out to the capstone project coordinator or system lead developer.
