# 🛠️ Installation, Configuration, and Build Guide

Follow these steps to set up, configure, run, and compile the system locally on your machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following software installed:
*   [Node.js](https://nodejs.org) (Recommended: LTS Version 18 or 20)
*   [Git](https://git-scm.com)
*   A [Supabase Account](https://supabase.com) (For database and user authentication)

---

## 📦 1. Local Installation

Open your terminal or Git Bash and run the following commands:

```bash
# Clone the repository
git clone https://github.com

# Navigate into the project folder
cd DentalWebsiteCPProject

# Install all required frontend and backend dependencies
npm install
```

---

## ⚙️ 2. Environment Configuration (`.env`)

The application needs connection keys to communicate with your Supabase database server.

1. Go to the `Backend/` folder.
2. Duplicate the file named `.env.example` and rename the copy to `.env`.
3. Open `.env` in a text editor and fill in your actual Supabase configurations:

```env
SUPABASE_URL=https://supabase.co
SUPABASE_ANON_KEY=your-actual-anon-public-key
```

*Note: Never upload your actual `.env` file to GitHub. It is already safely blocked by your `.gitignore` file.*

---

## 🗄️ 3. Database Migration Setup

Initialize your Supabase database tables before running the software application:

1. Log into your **Supabase Dashboard**.
2. Go to the **SQL Editor** tab on the left sidebar.
3. Click **New Query**.
4. Copy the raw text from your local file `Assets/supabase-schema.sql`, paste it into the editor, and click **Run**.
5. Repeat this process for `Assets/supabase-phase2-migration.sql` to apply the latest system upgrades.

---

## 🚀 4. Running the Development Server

To launch the project locally for coding, testing, or review, run:

```bash
npm run dev
```

*   Your terminal will provide a local web URL (usually `http://localhost:5173`).
*   Open that URL in any web browser to see the live system.
*   The page updates automatically whenever you modify your code.

---

## 🏗️ 5. Building for Production Deployment

When your capstone project is complete and ready to be hosted live on production servers (like Vercel, Netlify, or Hostinger), compile your source files:

```bash
npm run build
```

### What happens next?
*   Vite compiles and optimizes all TypeScript, React, and Tailwind CSS files.
*   A new folder named **`dist/`** or **`build/`** will be generated in your project root directory.
*   This folder contains highly compressed, production-ready HTML, JS, and CSS files that you can directly upload to any web hosting service.

### Testing your production build locally
To test how your built project acts on a real web server before uploading it online, run:
```bash
npm run preview
```
