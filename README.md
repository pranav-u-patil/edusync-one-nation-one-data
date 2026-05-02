# EduSync - Role-Based Universal Data & Template Management System

EduSync is a full-stack, role-based reporting platform built with React, Express, MongoDB, and EJS. It lets institutions upload CSV data once, map CSV headers to dynamic metadata fields, and generate NAAC, NBA, and UGC reports without changing backend code.

## Stack

- Frontend: React 19, Vite, React Router, Axios, Tailwind CSS
- Backend: Node.js, Express, EJS, Puppeteer
- Database: MongoDB with Mongoose
- CSV parsing: csv-parser
- Auth: JWT + bcryptjs
- String Matching: string-similarity
- Optional AI: Google Generative AI (fallback for field matching)

## Features

- Upload CSV data (wide or vertical format)
- AI-assisted field mapping (string similarity + optional LLM fallback)
- Dynamic template selection (NAAC, NBA, UGC)
- Autofill and manual override of field values
- HTML/PDF report generation via EJS + Puppeteer
- Report storage and download
- Year-over-year metrics comparison
- Metadata suggestion and admin review
- Dashboard with session and report tracking

## Roles

### User

- Login with email and password
- Upload CSV (demo-data or custom)
- Preview parsed CSV rows
- Auto-match and manually map CSV columns to system fields
- Select report template
- Autofill template with mapped data and override values as needed
- Generate HTML or PDF reports
- Download and view generated reports
- Compare metrics across academic years

### Admin

- Separate admin login
- Create, edit, and delete report templates
- Create and manage metadata fields
- Configure which fields attach to which templates
- Review and approve AI-generated metadata suggestions
- Manage system configuration

## Default Demo Accounts

- Admin: `admin@edusync.local` / `Admin@123`
- User: `user@edusync.local` / `User@123`

## Project Structure

```text
Backend/
  server.js
  src/
    app.js
    controllers/
      apiController.js        # Core API logic (upload, map, generate)
      formController.js       # Form submission handling
    db/
      db.js                   # MongoDB schemas and models
    middleware/
      authMiddleware.js       # JWT auth middleware
    routes/
      apiRoutes.js            # All API routes
      formRoutes.js           # Form routes
    templates/
      naac.ejs                # NAAC report template
      nba.ejs                 # NBA report template
      report.ejs              # Generic report template
      ugc.ejs                 # UGC report template
    utils/
      extractText.js          # PDF text extraction
      parseCSV.js             # CSV parsing utilities
      parseUploadCsv.js       # CSV upload processing
      similarityMatch.js      # String similarity matching
      normalize.js            # Data normalization
      fieldSynonyms.js        # Field synonym mapping
      reportRenderer.js       # HTML/PDF rendering
      extraFieldHandler.js    # Handle extra/unmapped fields
      aiFallback.js           # AI-assisted matching (optional)
  uploads/                    # User uploaded CSV files
  public/
    reports/                  # Generated HTML/PDF reports

Frontend/
  src/
    api/
      client.js               # Axios API client wrapper
    components/
      ProtectedRoute.jsx      # Auth-protected route component
      Sidebar.jsx             # Navigation sidebar
    context/
      AuthContext.jsx         # User authentication state
      WorkspaceContext.jsx    # Workspace/session state
    layouts/
      MainLayout.jsx          # Main page layout
    pages/
      LoginPage.jsx
      AdminDashboardPage.jsx
      DashboardPage.jsx
      UploadCsvPage.jsx
      MappingPage.jsx
      MappingConfigPage.jsx
      TemplatesPage.jsx
      TemplateManagementPage.jsx
      FieldBuilderPage.jsx
      MetadataSuggestionsPage.jsx
      ReportsPage.jsx
      ReportOutputPage.jsx
      AutofillPage.jsx
      YearComparisonPage.jsx
    App.jsx
    main.jsx
  index.html
  package.json
  vite.config.js
  tailwind.config.js
```

## Setup

### 1) Install dependencies

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

### 2) Configure the backend

Create `Backend/.env` and set:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/edusync
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
SIMILARITY_THRESHOLD=0.7
USE_AI=false
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### 3) Start MongoDB

Make sure MongoDB is running locally or update `MONGODB_URI` to point at your server.

### 4) Start the backend

```bash
cd Backend
npm start
```

### 5) Start the frontend

```bash
cd Frontend
npm run dev
```

## Core API Routes

- `POST /api/login`
- `GET /api/me`
- `GET /api/dashboard`
- `POST /api/upload`
- `POST /api/map-fields`
- `GET /api/map-fields`
- `POST /api/save-mappings`
- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/:id`
- `DELETE /api/templates/:id`
- `GET /api/fields`
- `POST /api/fields`
- `DELETE /api/fields/:id`
- `POST /api/generate-report`
- `GET /api/reports`

## Notes

- MongoDB collections are created automatically through Mongoose.
- Default seed data includes admin/user accounts, template metadata, and starter fields.
- Template rendering, mapping, and DB integration are separated across dedicated backend modules.
- CSV format is auto-detected (vertical: field-value pairs; wide: multi-column format).
- String similarity matching is used for auto-field mapping; AI fallback available via Google Generative AI.
- Reports are generated using EJS templates and converted to PDF via Puppeteer.

