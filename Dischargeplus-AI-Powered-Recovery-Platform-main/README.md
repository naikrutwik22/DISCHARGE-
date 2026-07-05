# Discharge+ 🏥

**B2B Multi-Tenant Hospital Post-Discharge Care Platform**

Discharge+ is a comprehensive SaaS platform designed to help hospitals manage and monitor patient recovery after discharge. By leveraging AI-driven risk scoring, automated follow-up surveys, medical report analysis (OCR), and real-time communication tools, the platform helps clinical teams proactively identify potential issues, reduce hospital readmission rates, and improve patient outcomes.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Tech Stack](#%EF%B8%8F-tech-stack)
3. [Core Features](#-core-features)
4. [System Architecture](#-system-architecture)
5. [Local Setup & Deployment](#-local-setup--deployment)
6. [Environment Variables](#-environment-variables)
7. [API Endpoints](#-api-endpoints)
8. [Multi-Tenant Security](#-multi-tenant-security)
9. [Design System](#-design-system)
10. [Future Improvements](#-future-improvements)
11. [License](#-license)

---

## 🔍 Project Overview

The post-discharge transition is a critical window for patient recovery. A lack of continuous monitoring, missed medications, and delayed identification of warning signs frequently lead to high readmission rates and strained clinical resources.

**Discharge+** bridges this gap by enabling:
- **Hospitals (Admins):** Manage recovery workflows, onboard and assign clinical staff, review global analytics, and track patient complaints.
- **Doctors:** Build custom health surveys, monitor detailed vitals trends, record private notes, and consult patients via real-time chat or video.
- **Patients:** Log daily surveys and vitals, track medication schedules, translate and analyze complex medical reports using OCR and AI, and communicate directly with their healthcare providers.

---

## 🛠️ Tech Stack

The application is built on a modern, robust, asynchronous stack:

### Frontend
- **Framework & Build Tool:** React 19, Vite 6
- **Styling:** Vanilla CSS, Tailwind CSS v4 (integrating `@tailwindcss/vite` and dynamic glassmorphism styles)
- **State Management & Routing:** Zustand 5, React Router DOM 6
- **Charts:** Recharts (responsive Line, Bar, Pie, Area charts for vital trend plotting)
- **Client-Side OCR:** Tesseract.js (extracts text from uploaded medical documents)
- **Icons & Animations:** Lucide React, Framer Motion (for smooth layout transitions and micro-interactions)
- **HTTP Client:** Axios

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Validation & Settings:** Pydantic v2, Pydantic Settings
- **Authentication:** JWT (python-jose, Supabase custom verification)
- **AI Engine:** Groq API (LLM inference)
- **Emails:** aiosmtplib (asynchronous SMTP client with Jinja2 HTML templates)
- **Deployment:** Docker, Docker Compose

### Database & Storage
- **Database Engine:** PostgreSQL (hosted on Supabase)
- **Security:** Row Level Security (RLS) policies scoped to `hospital_id`
- **Logic:** PL/pgSQL database functions, custom triggers, and composite indexes

---

## ✨ Core Features

### 👨‍💼 Admin Portal
- **Hospital Onboarding:** Registration and administration of hospital tenants.
- **Staff & Patient CRUD:** Manage doctor/patient directories with auto-generated secure credentials.
- **CSV Bulk Import:** Upload lists of patients to fast-track onboarding.
- **Doctor-Patient Assignment:** Pair clinical staff with recovered patients.
- **Analytics Dashboard:** Real-time metrics tracking survey completion rates, risk distributions, and doctor performance.
- **Complaints Dashboard:** View, track, and update the status of issues raised by patients.

### 🩺 Doctor Portal
- **Patient Monitoring:** View lists of assigned patients with visual risk indicators (`High`, `Medium`, `Low`) and real-time filters.
- **Detailed Vitals Tracking:** Check detailed patient records with interactive trend charts representing 4 key vitals (Blood Pressure, SpO2, Temperature, Blood Sugar) with highlight bands for normal ranges.
- **Survey Builder:** Build and send dynamic, custom surveys (supporting 8 question types: text, numeric, vitals, pain slider, photo uploads, etc.).
- **Private Clinical Notes:** Write and store private doctor notes per patient.
- **Real-Time Telehealth:** Secure instant messaging and peer-to-peer video calling integrated via **100ms.live**.

### 🤒 Patient Portal
- **Recovery Timeline:** Track progress visually via a recovery ring (e.g., "Day X of Y").
- **Smart Surveys:** Answer dynamic surveys with instantaneous AI feedback upon submission.
- **Medical Report Analyzer:** Upload clinical reports, run client-side OCR (Tesseract.js), and obtain multi-language AI analysis (English / Hindi toggle) displaying:
  - Color-coded lab parameters (Normal, Borderline, Abnormal)
  - Plain-language patient explanation
  - Suggested follow-up questions to ask the doctor
- **Medication Tracker:** Manage prescriptions, log intakes, and maintain a medication streak (🔥 streak day count).
- **Telemedicine Client:** Chat directly with the assigned doctor or join video consultation rooms.
- **Complaints Hub:** File formal complaints or technical issues directly to hospital administrators.

### 🤖 AI Engine (Groq LLM)
- **Automated Risk Scoring:** Evaluates survey responses to assign risk thresholds (Low / Medium / High).
- **Report Parsing & Explanations:** Transforms OCR-extracted raw clinical text into readable summaries.
- **Multi-Language Translation:** Supports English and Hindi localized clinical responses.

---

## 🏗️ System Architecture

The following diagram illustrates the directory structure and main modules of the project:

```
Discharge++/
├── database/
│   ├── schema.sql              # Core tables (18+), RLS policies, indexes, and triggers
│   └── complaints_schema.sql   # Patient complaints tables, status enums, and RLS
├── backend/
│   ├── main.py                 # FastAPI application initializer, CORS, & routers mounting
│   ├── config.py               # Pydantic environment configuration settings
│   ├── dependencies.py         # Supabase client instances & JWT token verification
│   ├── models/
│   │   └── schemas.py          # Pydantic models for request/response validation
│   ├── routers/
│   │   ├── auth.py             # User authentication, admin registration, and doctor login
│   │   ├── admin.py            # Hospital analytics, doctor/patient CRUD, CSV imports, complaints
│   │   ├── doctor.py           # Patient lists, vital analytics, notes
│   │   ├── patient.py          # Profiles, medication management, complaints submission
│   │   ├── survey.py           # Survey template builder, responses, and submissions
│   │   ├── ai.py               # Medical report analysis & OCR endpoints
│   │   └── chat.py             # Messaging logs and 100ms video call rooms
│   ├── services/
│   │   ├── ai_service.py       # Groq LLM API integrations and prompting
│   │   ├── risk_service.py     # Patient survey clinical risk assessment
│   │   └── email_service.py    # Async SMTP notification handlers & Jinja2 templates
│   ├── utils/
│   │   └── helpers.py          # General-purpose backend helpers
│   ├── Dockerfile
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # React routing table with role-based Route Guards
│   │   ├── lib/                # API clients (axios, supabase-js)
│   │   ├── store/              # Zustand global state (auth, system state)
│   │   ├── hooks/              # Reusable react hooks (useAuth, useChat, useRealtime)
│   │   ├── components/         # Shared UI (Sidebar, StatCards, Vitals charts, Risk badges)
│   │   └── pages/
│   │       ├── Auth/           # Login portals (Admin, Doctor, Patient) & Register
│   │       ├── Admin/          # Management dashboards, assignments, analytics, complaints
│   │       ├── Doctor/         # Patient lists, detail views, custom survey builder, video consultation
│   │       └── Patient/        # Recovery tracker, report analyzer, medication logging, chat, complaints
│   ├── Dockerfile
│   └── vite.config.js          # Vite build config
├── docker-compose.yml          # Local multi-container deployment configuration
└── README.md                   # Project documentation (this file)
```

---

## 🚀 Local Setup & Deployment

Follow these steps to run the Discharge+ stack on your local machine:

### Prerequisites
- **Node.js** v18 or newer & **npm**
- **Python** 3.11 or newer
- **Supabase Account** (with a new empty project database)
- **Groq API Key** (from console.groq.com)
- *(Optional)* **100ms.live Account** (for video consultation capability)

---

### Step 1: Database Setup
1. Log in to your **Supabase Dashboard** and open your project's **SQL Editor**.
2. Run the main schema SQL by executing the contents of [schema.sql](file:///e:/PROJECTS/DISCHARGE++/Dischargeplus-AI-Powered-Recovery-Platform-main/database/schema.sql).
3. Next, execute the complaints schema SQL in [complaints_schema.sql](file:///e:/PROJECTS/DISCHARGE++/Dischargeplus-AI-Powered-Recovery-Platform-main/database/complaints_schema.sql).
4. Verify that the tables, triggers, indexes, and Row Level Security (RLS) policies are active.

---

### Step 2: Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - **Windows:**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS/Linux:**
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure the environment variables (see the [Environment Variables](#-environment-variables) section below).
5. Start the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend documentation will be accessible at [http://localhost:8000/docs](http://localhost:8000/docs).*

---

### Step 3: Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Configure the environment variables (see the [Environment Variables](#-environment-variables) section below).
3. Install package dependencies:
   ```bash
   npm install
   ```
4. Start the frontend Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

### Step 4: Run with Docker (Alternative)
You can deploy both services locally in Docker containers:
```bash
docker-compose up --build -d
```
- **Frontend URL:** [http://localhost:3000](http://localhost:3000)
- **Backend URL:** [http://localhost:8000](http://localhost:8000)
- **Deployed Frontend (Demo):** [https://discharge-plus-ai-powered-recovery.vercel.app/](https://discharge-plus-ai-powered-recovery.vercel.app/)
- **Deployed Backend (Demo):** [https://dischargeplus-ai-powered-recovery-gziu.onrender.com/](https://dischargeplus-ai-powered-recovery-gziu.onrender.com/)

---

## 🔑 Environment Variables

To protect credentials, never commit production values to Git. Use the provided template files to create local configuration files.

### Backend Configurations
Inside `backend/.env` (modeled after [backend/.env.example](file:///e:/PROJECTS/DISCHARGE++/Dischargeplus-AI-Powered-Recovery-Platform-main/.env.example)):
```env
SUPABASE_URL=https://<your-supabase-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_JWT_SECRET=<your-supabase-jwt-signing-secret>
GROQ_API_KEY=<gsk_your_groq_api_key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-smtp-username>
SMTP_PASSWORD=<your-smtp-app-password>
SMTP_FROM_NAME=Discharge+
SMTP_FROM_EMAIL=noreply@dischargeplus.com
HMS_ACCESS_KEY=<optional-100ms-access-key>
HMS_SECRET=<optional-100ms-secret-key>
HMS_TEMPLATE_ID=<optional-100ms-template-id>
APP_NAME=Discharge+
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
ENVIRONMENT=development
```

### Frontend Configurations
Inside `frontend/.env` (modeled after [frontend/.env.example](file:///e:/PROJECTS/DISCHARGE++/Dischargeplus-AI-Powered-Recovery-Platform-main/frontend/.env.example)):
```env
VITE_SUPABASE_URL=https://<your-supabase-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-public-key>
VITE_API_URL=http://localhost:8000
```

---

## 🔐 Multi-Tenant Security

Security and strict multi-tenancy are enforced at every level of the application architecture:

| Layer | Mechanism | Implementation Details |
| :--- | :--- | :--- |
| **Database** | Row Level Security (RLS) | Database-level filters require `hospital_id` validation via custom session parameters (`get_user_hospital_id()`) for every transactional query. |
| **Backend** | JWT Middleware | Intercepts HTTP requests, extracts security tokens, and verifies scopes, automatically binding matching user context and `hospital_id`. |
| **Frontend** | Role-Based Guards | Protected routing in `App.jsx` intercepts navigation, ensuring users (Admin, Doctor, Patient) are dynamically directed to their respective sub-portals. |

---

## 📋 API Endpoints

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| POST | `/auth/login` | Public | Authenticates credentials and issues tokens. |
| POST | `/auth/admin-register` | Public | Onboards a new hospital tenant. |
| GET | `/admin/stats` | Admin | Retreives clinical, patient, and response statistics. |
| POST | `/admin/doctors` | Admin | Adds a new doctor to the hospital. |
| POST | `/admin/patients` | Admin | Onboards a new patient to the system. |
| POST | `/admin/patients/bulk-import` | Admin | Onboards multiple patients via a CSV payload. |
| GET | `/doctor/patients` | Doctor | Lists all patients assigned to the active doctor. |
| POST | `/surveys/create` | Doctor | Creates and assigns survey templates. |
| POST | `/surveys/{id}/respond` | Patient | Submits answers for a targeted survey. |
| POST | `/ai/analyze-report` | Patient | Analyzes patient-uploaded PDF or image medical reports. |
| POST | `/chat/{patient_id}/message` | Any | Dispatches chat messages within a secure chat. |
| POST | `/chat/calls/create-room` | Doctor | Generates a 100ms.live active video room token. |

---

## 🎨 Design System

The application incorporates a sleek, professional clinical interface emphasizing accessibility and visual elegance:
- **Primary Palette:** Deep Navy Slate (`#0A1628`) for corporate clinical structure, paired with a vibrant Accent Teal (`#00D4AA`) highlighting active interactions.
- **UI Components:** Implements dynamic frosted-glass cards utilizing high-quality backdrop blurring filters (`backdrop-filter: blur(20px)`), sharp borders, and shadows.
- **Typography:** Uses the clean sans-serif *Inter* typography throughout.
- **Micro-Animations:** Driven by `framer-motion` for page-level entry transitions, modal overlays, and button clicks.
- **Charts:** Built with `recharts` (custom interactive line series overlayed with safe range areas).

---

## 🚀 Future Improvements

The following improvements are planned based on the [ML Integration Plan](file:///e:/PROJECTS/DISCHARGE++/Dischargeplus-AI-Powered-Recovery-Platform-main/ml_integration_plan.md) and general product design:

1. **Disease-Aware Survey Recommender:** Suggest survey templates automatically based on patient history, diagnosis, and comorbidities using an XGBoost multi-label classifier.
2. **Readmission Risk Predictor:** Build binary classification models using historical patient response trajectories to flag high readmission risks.
3. **Vital Trajectory Anomaly Detection:** Implement anomaly detection (e.g., Isolation Forest) to spot subtle shifts in vitals before they trigger absolute threshold alerts.
4. **Offline Survey Submissions:** Introduce service workers and IndexedDB storage on the client for storing survey data when offline.
5. **Wearable Integrations:** Connect directly with Google Fit, Fitbit, or Apple Health API to fetch vitals automatically.

---

## 📝 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.

