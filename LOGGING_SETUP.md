# Setting Up Conversation Logging

## Step 1: Run the Migration

The database migration needs to be run to create the necessary tables.

```bash
cd /home/flinn/projects/dani/dani-face/server
npm run migrate
# Or if running in Docker, restart the container to auto-run migrations
```

## Step 2: Restart the Services

After building, restart both services:

```bash
# If using Docker Compose
docker-compose restart dani-face dani-agent

# Or if running directly
pm2 restart dani-face
pm2 restart dani-agent
```

## Step 3: Make a Test Query

1. Open DANI in your browser
2. Send a test message through the chat
3. Navigate to Admin Panel → Conversation Logs tab

## Troubleshooting

### No logs appearing:

1. **Check if migration ran:**
   ```sql
   psql -d dani -c "\d conversation_logs"
   ```
   Should show the table structure.

2. **Check for errors in server logs:**
   ```bash
   docker logs dani-face
   # or
   pm2 logs dani-face
   ```

3. **Verify database connection:**
   ```bash
   psql -d dani -c "SELECT COUNT(*) FROM conversation_logs;"
   ```

4. **Check browser console** for any React errors

### Common Issues:

**Issue:** "relation conversation_logs does not exist"
**Solution:** Run the migration (Step 1)

**Issue:** "Cannot read property of undefined" in UI
**Solution:** Clear browser cache and reload

**Issue:** Logs are created but not showing in UI
**Solution:** Check browser network tab for API errors

## Verify Setup

Run these commands to verify everything is working:

```sql
-- Check tables exist
\dt conversation_logs
\dt admin_log_access

-- Check indexes
\di conversation_logs*

-- Try inserting a test log (will be done automatically by the system)
-- Just send a message through the chat interface
```

## Manual Migration (if auto-migration doesn't work)

```bash
cd /home/flinn/projects/dani/dani-face/server
psql -d dani -f dist/migrations/004-conversation-logging.sql
```

Or connect to PostgreSQL and run the migration SQL directly.
