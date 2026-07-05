-- ============================================================
-- Complaints Schema Update
-- ============================================================

CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    status complaint_status DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_complaints_hospital_id ON complaints(hospital_id);
CREATE INDEX idx_complaints_patient_id ON complaints(patient_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at);

-- RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "complaints_admin_all" ON complaints FOR ALL USING (
    hospital_id = get_user_hospital_id() AND get_user_role() = 'admin'
);

CREATE POLICY "complaints_patient_select" ON complaints FOR SELECT USING (
    patient_id = get_patient_id_for_user(auth.uid())
);

CREATE POLICY "complaints_patient_insert" ON complaints FOR INSERT WITH CHECK (
    patient_id = get_patient_id_for_user(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER auto_update_updated_at BEFORE UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION trigger_update_updated_at();
