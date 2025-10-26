-- API Keys Table for User-Specific Service Credentials
-- Stores encrypted API keys for external services (e.g., DRM)

-- Create API keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL CHECK (service_name IN ('drm')),
    api_key_id TEXT NOT NULL,     -- Encrypted
    api_key_secret TEXT NOT NULL, -- Encrypted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_service UNIQUE (user_id, service_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_service ON user_api_keys(service_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_key_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
CREATE TRIGGER trigger_update_api_key_timestamp
BEFORE UPDATE ON user_api_keys
FOR EACH ROW
EXECUTE FUNCTION update_api_key_timestamp();

-- Grant permissions
GRANT ALL PRIVILEGES ON user_api_keys TO dani_user;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'API keys table initialized successfully';
END $$;
