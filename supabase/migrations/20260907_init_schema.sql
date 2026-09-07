-- Smart Pill Box & Medication Management System Database Schema
-- Compatible with Supabase PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Caregivers Table
CREATE TABLE IF NOT EXISTS caregivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('PRIMARY', 'FAMILY', 'NURSE', 'DOCTOR')) DEFAULT 'NURSE',
  avatar TEXT,
  telegram_chat_id TEXT,
  notify_telegram BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  avatar TEXT,
  room_number TEXT,
  caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL,
  medical_conditions TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  compliance_rate NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  dosage_form TEXT NOT NULL, -- e.g., Tablet, Capsule
  strength TEXT NOT NULL, -- e.g., 500mg
  total_stock INTEGER NOT NULL DEFAULT 0,
  min_threshold INTEGER NOT NULL DEFAULT 10,
  color_hex TEXT DEFAULT '#06b6d4',
  shape TEXT DEFAULT 'Round',
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pill Boxes Table
CREATE TABLE IF NOT EXISTS pill_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  model TEXT CHECK (model IN ('BOX_1_SERVO_WEIGHT', 'BOX_2_MODULAR_IR_RFID')) DEFAULT 'BOX_1_SERVO_WEIGHT',
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  device_api_key TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE')) DEFAULT 'ONLINE',
  battery_percentage INTEGER DEFAULT 100,
  rssi_signal INTEGER DEFAULT -60,
  firmware_version TEXT DEFAULT 'v1.0.0',
  ip_address TEXT,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Compartments Table
CREATE TABLE IF NOT EXISTS compartments (
  id SERIAL PRIMARY KEY,
  pill_box_id UUID REFERENCES pill_boxes(id) ON DELETE CASCADE,
  compartment_number INTEGER NOT NULL, -- 1 to 6
  label TEXT NOT NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  dosage TEXT DEFAULT '1 Tablet',
  current_pill_count INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 30,
  status TEXT CHECK (status IN ('READY', 'OPEN', 'EMPTY', 'REFILL_NEEDED', 'DISPENSED')) DEFAULT 'READY',
  led_color TEXT DEFAULT '#06b6d4',
  UNIQUE (pill_box_id, compartment_number)
);

-- 6. Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  pill_box_id UUID REFERENCES pill_boxes(id) ON DELETE CASCADE,
  compartment_id INTEGER REFERENCES compartments(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  dosage TEXT NOT NULL,
  scheduled_time TIME NOT NULL, -- e.g., '08:00:00'
  time_window_minutes INTEGER DEFAULT 30,
  repeat_days TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Dose Records Table
CREATE TABLE IF NOT EXISTS dose_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  pill_box_id UUID REFERENCES pill_boxes(id) ON DELETE CASCADE,
  compartment_number INTEGER NOT NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('PENDING', 'TAKEN', 'MISSED', 'SKIPPED', 'SNOOZED')) DEFAULT 'PENDING',
  dispensed_by_sensor BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Device Events Table
CREATE TABLE IF NOT EXISTS device_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pill_box_id UUID REFERENCES pill_boxes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- MEDICINE_TAKEN, DOSE_MISSED, BOX_OPENED, etc.
  compartment_number INTEGER,
  details TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT')) DEFAULT 'INFO',
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  sent_to_telegram BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pill_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read access for demo / hardware API keys
CREATE POLICY "Public Read Access" ON patients FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON pill_boxes FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON compartments FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON schedules FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON dose_records FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON device_events FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON notifications FOR SELECT USING (true);

-- Publish hardware and dose changes to the caregiver dashboard in real time.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE device_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dose_records;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pill_boxes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
