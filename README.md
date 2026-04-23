# EduSync - Role-Based Universal Data & Template Management System

EduSync is a full-stack, role-based reporting platform built with React, Express, MongoDB, and EJS. It lets institutions upload CSV data once, map CSV headers to dynamic metadata fields, and generate NAAC, NBA, and UGC reports without changing backend code.

## Stack

- Frontend: React, Vite, React Router, Axios, Tailwind CSS
- Backend: Node.js, Express, EJS, Puppeteer
- Database: MongoDB with Mongoose
- CSV parsing: csv-parser
- Auth: JWT + bcryptjs

## Roles

### User

- Login
- Upload CSV
- Preview parsed rows
- Map CSV headers to system fields
- Select a template
- Autofill and override values
- Generate HTML or PDF reports
- Review generated reports

### Admin

- Separate admin login
- Create, edit, and delete templates
- Create and remove metadata fields
- Configure field attachments for templates
- Review mapping configuration

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
    db/
    middleware/
    routes/
    templates/
    utils/

Frontend/
  src/
    api/
    components/
    context/
    layouts/
    pages/
    App.jsx
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

## Report Output

The backend renders reports with EJS and can return either HTML or PDF. Generated files are stored under `Backend/public/reports` and served through the `/reports` route.

## Notes

- MongoDB collections are created automatically through Mongoose.
- Default seed data includes admin/user accounts, template metadata, and starter fields.
- Template rendering, mapping, and DB integration are separated across dedicated backend modules.
