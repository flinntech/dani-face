/**
 * Logs API Routes
 * Provides access to dani-agent logs for authenticated users
 */

import express, { Request, Response } from 'express';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();
const execAsync = promisify(exec);

const LOG_DIR = '/var/log/dani-agent';

// Helper function to read log file
async function readLogFile(filePath: string, lines?: number): Promise<string> {
  try {
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return '';
    }

    if (lines) {
      // Use tail command to get last N lines
      const { stdout } = await execAsync(`tail -n ${lines} "${filePath}"`, {
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } else {
      // Read entire file
      return await fs.readFile(filePath, 'utf-8');
    }
  } catch (error: any) {
    console.error('Failed to read log file:', error);
    return '';
  }
}

// Helper function to grep log file
async function grepLogFile(filePath: string, query: string, lines: number): Promise<string> {
  try {
    // Escape query for shell
    const escapedQuery = query.replace(/'/g, "'\\''");
    const { stdout } = await execAsync(
      `grep -i '${escapedQuery}' "${filePath}" 2>/dev/null | tail -n ${lines} || echo ""`,
      {
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );
    return stdout;
  } catch (error: any) {
    // Grep returns non-zero if no matches, which is fine
    return '';
  }
}

/**
 * GET /api/logs/stream
 * Get recent logs from a specific log file
 */
router.get('/stream', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      type = 'combined',
      lines = '100',
      level = 'all'
    } = req.query;

    // Validate log type
    const validTypes = ['combined', 'error', 'activity'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({
        error: 'Invalid log type',
        validTypes
      });
    }

    // Validate lines parameter
    const lineCount = Math.min(parseInt(lines as string, 10) || 100, 1000);

    // Construct log file path
    const logFile = type === 'activity'
      ? 'agent-activity.log'
      : `${type}.log`;

    const logPath = path.join(LOG_DIR, logFile);

    // Get logs
    const output = await readLogFile(logPath, lineCount);

    // Parse JSON lines
    const logs = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          // If not JSON, return as raw text
          return { message: line, level: 'info', timestamp: new Date().toISOString() };
        }
      })
      .filter(log => {
        // Filter by level if specified
        if (level !== 'all' && log.level !== level) {
          return false;
        }
        return true;
      });

    res.json({
      logs,
      type,
      count: logs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      error: 'Failed to fetch logs',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/stats
 * Get log statistics and summary
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get file sizes
    const files: Array<{ name: string; size: string }> = [];
    try {
      const dirEntries = await fs.readdir(LOG_DIR);
      for (const entry of dirEntries) {
        if (entry.endsWith('.log')) {
          const stats = await fs.stat(path.join(LOG_DIR, entry));
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          files.push({ name: entry, size: `${sizeInMB}M` });
        }
      }
    } catch (error) {
      console.error('Failed to read log directory:', error);
    }

    // Count errors
    let errorCount = 0;
    try {
      const errorLogPath = path.join(LOG_DIR, 'error.log');
      const errorContent = await readLogFile(errorLogPath);
      errorCount = errorContent.split('\n').filter(line => line.includes('"level":"error"')).length;
    } catch (error) {
      console.error('Failed to count errors:', error);
    }

    // Get tool calls
    const toolCalls: Array<{ tool: string; count: number }> = [];
    try {
      const combinedLogPath = path.join(LOG_DIR, 'combined.log');
      const { stdout } = await execAsync(
        `grep -o '"tool":"[^"]*"' "${combinedLogPath}" 2>/dev/null | sort | uniq -c | tail -20 || echo ""`,
        { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
      );

      stdout.split('\n').forEach(line => {
        const match = line.trim().match(/(\d+)\s+"tool":"([^"]+)"/);
        if (match) {
          toolCalls.push({ tool: match[2], count: parseInt(match[1], 10) });
        }
      });
    } catch (error) {
      console.error('Failed to get tool calls:', error);
    }

    // Get models used
    const models: Array<{ model: string; count: number }> = [];
    try {
      const combinedLogPath = path.join(LOG_DIR, 'combined.log');
      const { stdout } = await execAsync(
        `grep -o '"model":"[^"]*"' "${combinedLogPath}" 2>/dev/null | sort | uniq -c || echo ""`,
        { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
      );

      stdout.split('\n').forEach(line => {
        const match = line.trim().match(/(\d+)\s+"model":"([^"]+)"/);
        if (match) {
          models.push({ model: match[2], count: parseInt(match[1], 10) });
        }
      });
    } catch (error) {
      console.error('Failed to get models:', error);
    }

    // Get conversation count
    let conversationCount = 0;
    try {
      const combinedLogPath = path.join(LOG_DIR, 'combined.log');
      const { stdout } = await execAsync(
        `grep -o '"conversationId":"[^"]*"' "${combinedLogPath}" 2>/dev/null | sort -u | wc -l || echo 0`,
        { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
      );
      conversationCount = parseInt(stdout.trim(), 10);
    } catch (error) {
      console.error('Failed to count conversations:', error);
    }

    res.json({
      files,
      errorCount,
      toolCalls,
      models,
      conversationCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({
      error: 'Failed to fetch log statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/search
 * Search logs for specific text
 */
router.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { query, lines = '50' } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const lineCount = Math.min(parseInt(lines as string, 10) || 50, 500);
    const logPath = path.join(LOG_DIR, 'combined.log');

    // Search logs
    const output = await grepLogFile(logPath, query, lineCount);

    // Parse results
    const results = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: 'info', timestamp: new Date().toISOString() };
        }
      });

    res.json({
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error searching logs:', error);
    res.status(500).json({
      error: 'Failed to search logs',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/export
 * Export logs as JSON
 */
router.get('/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type = 'combined' } = req.query;

    // Validate log type
    const validTypes = ['combined', 'error', 'activity'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({
        error: 'Invalid log type',
        validTypes
      });
    }

    const logFile = type === 'activity'
      ? 'agent-activity.log'
      : `${type}.log`;

    const logPath = path.join(LOG_DIR, logFile);

    // Get all logs
    const output = await readLogFile(logPath);

    // Parse JSON lines
    const logs = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: 'info', timestamp: new Date().toISOString() };
        }
      });

    // Set headers for file download
    const filename = `dani-agent-${type}-logs-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json({
      exportedAt: new Date().toISOString(),
      logType: type,
      totalLogs: logs.length,
      logs
    });

  } catch (error: any) {
    console.error('Error exporting logs:', error);
    res.status(500).json({
      error: 'Failed to export logs',
      message: error.message
    });
  }
});

export default router;
