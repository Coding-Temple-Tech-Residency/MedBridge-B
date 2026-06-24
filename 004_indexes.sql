-- health_records
CREATE INDEX idx_health_records_user_id ON health_records(user_id);
CREATE INDEX idx_health_records_status ON health_records(status);
CREATE INDEX idx_health_records_source_type ON health_records(source_type);

-- fhir_connections
CREATE INDEX idx_fhir_connections_user_id ON fhir_connections(user_id);

-- conditions
CREATE INDEX idx_conditions_health_record_id ON conditions(health_record_id);
CREATE INDEX idx_conditions_user_id ON conditions(user_id);

-- medications
CREATE INDEX idx_medications_health_record_id ON medications(health_record_id);
CREATE INDEX idx_medications_user_id ON medications(user_id);

-- lab_results
CREATE INDEX idx_lab_results_health_record_id ON lab_results(health_record_id);
CREATE INDEX idx_lab_results_user_id ON lab_results(user_id);
CREATE INDEX idx_lab_results_flag ON lab_results(flag);

-- encounters
CREATE INDEX idx_encounters_health_record_id ON encounters(health_record_id);
CREATE INDEX idx_encounters_user_id ON encounters(user_id);

-- follow_ups
CREATE INDEX idx_follow_ups_health_record_id ON follow_ups(health_record_id);
CREATE INDEX idx_follow_ups_user_id ON follow_ups(user_id);

-- allergies
CREATE INDEX idx_allergies_health_record_id ON allergies(health_record_id);
CREATE INDEX idx_allergies_user_id ON allergies(user_id);

-- summaries
CREATE INDEX idx_summaries_health_record_id ON summaries(health_record_id);

-- chat_messages
CREATE INDEX idx_chat_messages_health_record_id ON chat_messages(health_record_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);