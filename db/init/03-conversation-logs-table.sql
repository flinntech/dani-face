-- Conversation Logs Table
-- Stores detailed execution logs for each conversation interaction
-- Used for admin monitoring and user feedback collection

CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    log_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_conversation_logs_conversation_id ON conversation_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id ON conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON conversation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_feedback ON conversation_logs USING GIN ((log_data->'feedback'));

-- Grant permissions
GRANT ALL PRIVILEGES ON conversation_logs TO dani_db;

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'Conversation logs table created successfully';
END $$;
