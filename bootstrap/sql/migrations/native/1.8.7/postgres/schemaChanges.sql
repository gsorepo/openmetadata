-- Create table for tracking index mapping versions
CREATE TABLE IF NOT EXISTS index_mapping_versions (
    entityType VARCHAR(256) NOT NULL,
    mappingHash VARCHAR(32) NOT NULL,
    mappingJson JSONB NOT NULL,
    version VARCHAR(36) NOT NULL,
    updatedAt BIGINT NOT NULL,
    updatedBy VARCHAR(256) NOT NULL,
    PRIMARY KEY (entityType)
);

CREATE INDEX IF NOT EXISTS idx_index_mapping_versions_version ON index_mapping_versions (version);
CREATE INDEX IF NOT EXISTS idx_index_mapping_versions_updatedAt ON index_mapping_versions (updatedAt);