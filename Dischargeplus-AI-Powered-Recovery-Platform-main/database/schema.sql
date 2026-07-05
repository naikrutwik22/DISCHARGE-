-- ============================================================
-- Discharge+ — Complete Supabase Schema
-- Multi-tenant hospital post-discharge SaaS
-- ============================================================

-- ======================== ENUM TYPES ========================

CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient');
CREATE TYPE risk_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE call_type AS ENUM ('audio', 'video');
CREATE TYPE call_status AS ENUM ('initiated', 'ongoing', 'completed', 'missed');

-- ======================== TABLES ============================

-- 1. hospitals
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    max_doctors INT DEFAULT 10,
    max_patients INT DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. users (linked to auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. doctors
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    specialization TEXT,
    license_number TEXT,
    department TEXT,
    qualification TEXT,
    experience_years INT,
    bio TEXT,
    notes TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    diagnosis TEXT,
    discharge_date DATE,
    discharge_summary TEXT,
    comorbidities TEXT[],
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    expected_recovery_days INT DEFAULT 30,
    admission_date DATE,
    is_readmitted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. assignments (doctor ↔ patient)
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (doctor_id, patient_id)
);

-- 6. surveys
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    question_types TEXT[] NOT NULL,  -- e.g. {'fever','spo2','bp','sugar','pain','photo','voice','custom_text'}
    schedule_type TEXT DEFAULT 'one_time',  -- 'one_time' | 'recurring'
    schedule_interval_days INT,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. survey_questions
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. survey_responses
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    ai_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. response_answers
CREATE TABLE response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id UUID REFERENCES survey_questions(id) ON DELETE SET NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL,
    answer_value TEXT,
    answer_numeric NUMERIC,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. risk_scores
CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    survey_response_id UUID REFERENCES survey_responses(id) ON DELETE SET NULL,
    risk_level risk_level NOT NULL DEFAULT 'low',
    score NUMERIC,
    reasoning TEXT,
    factors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. chat_messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    message TEXT,
    file_url TEXT,
    file_type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. call_logs
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    room_id TEXT,
    call_type call_type NOT NULL DEFAULT 'video',
    call_status call_status NOT NULL DEFAULT 'initiated',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. medical_reports
CREATE TABLE medical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    ocr_text TEXT,
    language TEXT DEFAULT 'english',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. report_analysis
CREATE TABLE report_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    parameters JSONB DEFAULT '[]',
    summary TEXT,
    questions JSONB DEFAULT '[]',
    language TEXT DEFAULT 'english',
    raw_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. medications
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    time_of_day TEXT[],  -- e.g. {'morning','afternoon','night'}
    start_date DATE,
    end_date DATE,
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. medication_logs
CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    taken_at TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'taken',  -- 'taken' | 'missed'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',  -- 'info' | 'warning' | 'alert' | 'success'
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ======================== INDEXES ===========================

-- users
CREATE INDEX idx_users_hospital_id ON users(hospital_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- doctors
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_hospital_id ON doctors(hospital_id);
CREATE INDEX idx_doctors_created_at ON doctors(created_at);

-- patients
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_created_at ON patients(created_at);

-- assignments
CREATE INDEX idx_assignments_hospital_id ON assignments(hospital_id);
CREATE INDEX idx_assignments_doctor_id ON assignments(doctor_id);
CREATE INDEX idx_assignments_patient_id ON assignments(patient_id);
CREATE INDEX idx_assignments_created_at ON assignments(created_at);

-- surveys
CREATE INDEX idx_surveys_hospital_id ON surveys(hospital_id);
CREATE INDEX idx_surveys_doctor_id ON surveys(doctor_id);
CREATE INDEX idx_surveys_patient_id ON surveys(patient_id);
CREATE INDEX idx_surveys_created_at ON surveys(created_at);

-- survey_questions
CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);
CREATE INDEX idx_survey_questions_hospital_id ON survey_questions(hospital_id);

-- survey_responses
CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_patient_id ON survey_responses(patient_id);
CREATE INDEX idx_survey_responses_hospital_id ON survey_responses(hospital_id);
CREATE INDEX idx_survey_responses_created_at ON survey_responses(created_at);

-- response_answers
CREATE INDEX idx_response_answers_response_id ON response_answers(response_id);
CREATE INDEX idx_response_answers_hospital_id ON response_answers(hospital_id);

-- risk_scores
CREATE INDEX idx_risk_scores_patient_id ON risk_scores(patient_id);
CREATE INDEX idx_risk_scores_hospital_id ON risk_scores(hospital_id);
CREATE INDEX idx_risk_scores_risk_level ON risk_scores(risk_level);
CREATE INDEX idx_risk_scores_created_at ON risk_scores(created_at);

-- chat_messages
CREATE INDEX idx_chat_messages_hospital_id ON chat_messages(hospital_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_patient_id ON chat_messages(patient_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- call_logs
CREATE INDEX idx_call_logs_hospital_id ON call_logs(hospital_id);
CREATE INDEX idx_call_logs_doctor_id ON call_logs(doctor_id);
CREATE INDEX idx_call_logs_patient_id ON call_logs(patient_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);

-- medical_reports
CREATE INDEX idx_medical_reports_patient_id ON medical_reports(patient_id);
CREATE INDEX idx_medical_reports_hospital_id ON medical_reports(hospital_id);
CREATE INDEX idx_medical_reports_created_at ON medical_reports(created_at);

-- report_analysis
CREATE INDEX idx_report_analysis_report_id ON report_analysis(report_id);
CREATE INDEX idx_report_analysis_hospital_id ON report_analysis(hospital_id);

-- medications
CREATE INDEX idx_medications_patient_id ON medications(patient_id);
CREATE INDEX idx_medications_hospital_id ON medications(hospital_id);

-- medication_logs
CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_patient_id ON medication_logs(patient_id);
CREATE INDEX idx_medication_logs_hospital_id ON medication_logs(hospital_id);
CREATE INDEX idx_medication_logs_created_at ON medication_logs(created_at);

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_hospital_id ON notifications(hospital_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- audit_logs
CREATE INDEX idx_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ======================== RLS POLICIES ======================

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's hospital_id
CREATE OR REPLACE FUNCTION get_user_hospital_id()
RETURNS UUID AS $$
    SELECT hospital_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if doctor is assigned to patient
CREATE OR REPLACE FUNCTION is_doctor_assigned_to_patient(p_doctor_user_id UUID, p_patient_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM assignments a
        JOIN doctors d ON d.id = a.doctor_id
        WHERE d.user_id = p_doctor_user_id
        AND a.patient_id = p_patient_id
        AND a.is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get patient_id from user_id
CREATE OR REPLACE FUNCTION get_patient_id_for_user(p_user_id UUID)
RETURNS UUID AS $$
    SELECT id FROM patients WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- hospitals ----
CREATE POLICY "hospitals_select" ON hospitals FOR SELECT USING (
    id = get_user_hospital_id()
);
CREATE POLICY "hospitals_admin_all" ON hospitals FOR ALL USING (
    id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- users ----
CREATE POLICY "users_select_hospital" ON users FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "users_admin_write" ON users FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- doctors ----
CREATE POLICY "doctors_select_hospital" ON doctors FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "doctors_admin_write" ON doctors FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- patients ----
CREATE POLICY "patients_select_admin" ON patients FOR SELECT USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);
CREATE POLICY "patients_select_doctor" ON patients FOR SELECT USING (
    hospital_id = get_user_hospital_id()
    AND get_user_role() = 'doctor'
    AND is_doctor_assigned_to_patient(auth.uid(), id)
);
CREATE POLICY "patients_select_self" ON patients FOR SELECT USING (
    user_id = auth.uid()
);
CREATE POLICY "patients_admin_write" ON patients FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- assignments ----
CREATE POLICY "assignments_select_hospital" ON assignments FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "assignments_admin_write" ON assignments FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- surveys ----
CREATE POLICY "surveys_select_hospital" ON surveys FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "surveys_doctor_write" ON surveys FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'doctor'
);
CREATE POLICY "surveys_admin_write" ON surveys FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);
CREATE POLICY "surveys_select_patient" ON surveys FOR SELECT USING (
    patient_id = get_patient_id_for_user(auth.uid())
);

-- ---- survey_questions ----
CREATE POLICY "survey_questions_select_hospital" ON survey_questions FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "survey_questions_doctor_write" ON survey_questions FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id() AND get_user_role() IN ('doctor', 'admin')
);
CREATE POLICY "survey_questions_admin_write" ON survey_questions FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- survey_responses ----
CREATE POLICY "survey_responses_select_hospital" ON survey_responses FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "survey_responses_patient_write" ON survey_responses FOR INSERT WITH CHECK (
    patient_id = get_patient_id_for_user(auth.uid())
);
CREATE POLICY "survey_responses_admin_write" ON survey_responses FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- response_answers ----
CREATE POLICY "response_answers_select_hospital" ON response_answers FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "response_answers_patient_write" ON response_answers FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "response_answers_admin_write" ON response_answers FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- risk_scores ----
CREATE POLICY "risk_scores_select_hospital" ON risk_scores FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "risk_scores_select_patient" ON risk_scores FOR SELECT USING (
    patient_id = get_patient_id_for_user(auth.uid())
);
CREATE POLICY "risk_scores_admin_write" ON risk_scores FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- chat_messages ----
CREATE POLICY "chat_messages_select_own" ON chat_messages FOR SELECT USING (
    hospital_id = get_user_hospital_id()
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
);
CREATE POLICY "chat_messages_insert_own" ON chat_messages FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id() AND sender_id = auth.uid()
);

-- ---- call_logs ----
CREATE POLICY "call_logs_select_hospital" ON call_logs FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "call_logs_admin_write" ON call_logs FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() IN ('admin', 'doctor')
);

-- ---- medical_reports ----
CREATE POLICY "medical_reports_select_hospital" ON medical_reports FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "medical_reports_patient_self" ON medical_reports FOR SELECT USING (
    patient_id = get_patient_id_for_user(auth.uid())
);
CREATE POLICY "medical_reports_insert" ON medical_reports FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id()
);

-- ---- report_analysis ----
CREATE POLICY "report_analysis_select_hospital" ON report_analysis FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "report_analysis_insert" ON report_analysis FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id()
);

-- ---- medications ----
CREATE POLICY "medications_select_hospital" ON medications FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "medications_select_patient" ON medications FOR SELECT USING (
    patient_id = get_patient_id_for_user(auth.uid())
);
CREATE POLICY "medications_admin_doctor_write" ON medications FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() IN ('admin', 'doctor')
);

-- ---- medication_logs ----
CREATE POLICY "medication_logs_select_hospital" ON medication_logs FOR SELECT USING (
    hospital_id = get_user_hospital_id()
);
CREATE POLICY "medication_logs_patient_write" ON medication_logs FOR INSERT WITH CHECK (
    patient_id = get_patient_id_for_user(auth.uid())
);

-- ---- notifications ----
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
    user_id = auth.uid()
);
CREATE POLICY "notifications_admin_write" ON notifications FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

-- ---- audit_logs ----
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (
    hospital_id = get_user_hospital_id()
);

-- ======================== TRIGGERS ==========================

-- Trigger 1: auto_update_updated_at
CREATE OR REPLACE FUNCTION trigger_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'hospitals','users','doctors','patients','assignments',
            'surveys','survey_questions','survey_responses','response_answers',
            'risk_scores','chat_messages','call_logs','medical_reports',
            'report_analysis','medications','medication_logs','notifications','audit_logs'
        ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER auto_update_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_update_updated_at();',
            tbl
        );
    END LOOP;
END;
$$;

-- Trigger 2: auto_insert_risk_score after survey_response insert
CREATE OR REPLACE FUNCTION trigger_auto_insert_risk_score()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO risk_scores (patient_id, hospital_id, survey_response_id, risk_level, reasoning)
    VALUES (NEW.patient_id, NEW.hospital_id, NEW.id, 'low', 'Pending AI analysis');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_insert_risk_score
    AFTER INSERT ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_insert_risk_score();

-- ======================== STORAGE ===========================

-- Create storage bucket for chat attachments and medical reports
-- Run via Supabase Dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('hospital-files', 'hospital-files', false);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
