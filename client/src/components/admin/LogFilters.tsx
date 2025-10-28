/**
 * LogFilters Component
 * Filter controls for conversation logs
 */

import React, { useState } from 'react';
import { LogFilters as LogFiltersType, UserOption } from '../../types/log.types';
import './LogFilters.css';

interface LogFiltersProps {
  filters: LogFiltersType;
  onFilterChange: (filters: LogFiltersType) => void;
  onClearFilters: () => void;
  userOptions: UserOption[];
  toolOptions: string[];
}

const LogFilters: React.FC<LogFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  userOptions,
  toolOptions,
}) => {
  const [localFilters, setLocalFilters] = useState<LogFiltersType>(filters);

  const handleChange = (key: keyof LogFiltersType, value: any) => {
    const updated = { ...localFilters, [key]: value || undefined };
    setLocalFilters(updated);
  };

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const handleQuickFilter = (days: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const updated = {
      ...localFilters,
      date_from: from.toISOString().split('T')[0],
      date_to: now.toISOString().split('T')[0],
    };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  return (
    <div className="log-filters">
      <h3>Filters</h3>

      {/* Quick Filters */}
      <div className="quick-filters">
        <button onClick={() => handleQuickFilter(1)} className="btn-quick">
          Last 24h
        </button>
        <button onClick={() => handleQuickFilter(7)} className="btn-quick">
          Last 7d
        </button>
        <button onClick={() => handleQuickFilter(30)} className="btn-quick">
          Last 30d
        </button>
      </div>

      {/* Filter Fields */}
      <div className="filter-grid">
        {/* Date Range */}
        <div className="filter-field">
          <label>From Date</label>
          <input
            type="date"
            value={localFilters.date_from || ''}
            onChange={(e) => handleChange('date_from', e.target.value)}
          />
        </div>

        <div className="filter-field">
          <label>To Date</label>
          <input
            type="date"
            value={localFilters.date_to || ''}
            onChange={(e) => handleChange('date_to', e.target.value)}
          />
        </div>

        {/* User */}
        <div className="filter-field">
          <label>User</label>
          <select value={localFilters.user_id || ''} onChange={(e) => handleChange('user_id', e.target.value)}>
            <option value="">All Users</option>
            {userOptions.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="filter-field">
          <label>Model</label>
          <select value={localFilters.model || ''} onChange={(e) => handleChange('model', e.target.value)}>
            <option value="">All Models</option>
            <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
            <option value="claude-haiku-4.5">Claude Haiku 4.5</option>
          </select>
        </div>

        {/* Complexity */}
        <div className="filter-field">
          <label>Complexity</label>
          <select
            value={localFilters.complexity_level || ''}
            onChange={(e) => handleChange('complexity_level', e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="SIMPLE">Simple</option>
            <option value="PROCEDURAL">Procedural</option>
            <option value="ANALYTICAL">Analytical</option>
          </select>
        </div>

        {/* Feedback */}
        <div className="filter-field">
          <label>Feedback</label>
          <select
            value={localFilters.feedback_status || ''}
            onChange={(e) => handleChange('feedback_status', e.target.value)}
          >
            <option value="">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="none">None</option>
          </select>
        </div>

        {/* Tool Used */}
        <div className="filter-field">
          <label>Tool Used</label>
          <select value={localFilters.tool_used || ''} onChange={(e) => handleChange('tool_used', e.target.value)}>
            <option value="">All Tools</option>
            {toolOptions.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>
        </div>

        {/* Query Text Search */}
        <div className="filter-field filter-field-wide">
          <label>Search Query Text</label>
          <input
            type="text"
            placeholder="Enter search terms..."
            value={localFilters.query_text || ''}
            onChange={(e) => handleChange('query_text', e.target.value)}
          />
        </div>

        {/* Execution Time */}
        <div className="filter-field">
          <label>Min Execution Time (ms)</label>
          <input
            type="number"
            placeholder="e.g. 5000"
            value={localFilters.min_execution_time || ''}
            onChange={(e) => handleChange('min_execution_time', parseInt(e.target.value) || undefined)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="filter-actions">
        <button onClick={handleApply} className="btn btn-primary">
          Apply Filters
        </button>
        <button onClick={handleClear} className="btn btn-secondary">
          Clear All
        </button>
      </div>
    </div>
  );
};

export default LogFilters;
