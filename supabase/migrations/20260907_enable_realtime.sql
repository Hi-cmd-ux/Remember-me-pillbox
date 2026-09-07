-- Enable Supabase Realtime for the core caregiver dashboard stream.
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
