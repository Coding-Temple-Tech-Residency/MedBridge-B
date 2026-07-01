-- Align health_records with application code (document_service, integration tests).

ALTER TABLE health_records
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER;

ALTER TABLE health_records
  DROP CONSTRAINT IF EXISTS health_records_status_check;

ALTER TABLE health_records
  ADD CONSTRAINT health_records_status_check
  CHECK (status IN (
    'pending', 'uploaded', 'processing', 'extracting',
    'extracted', 'summarizing', 'summarized', 'ready', 'failed'
  ));
