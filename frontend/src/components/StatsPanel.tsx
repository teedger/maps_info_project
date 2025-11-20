import React, { useState, useEffect } from 'react';
import { Stats, Category } from '../types';

interface StatsPanelProps {
  categories: Category[];
  onClose: () => void;
}

const API_URL = 'http://localhost:3001/api';

function StatsPanel({ categories, onClose }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load stats:', err);
        setLoading(false);
      });
  }, []);

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || { icon: '📍', name: categoryId };
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <p>Failed to load statistics</p>
          <button onClick={onClose} className="btn-cancel">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal stats-modal">
        <div className="modal-header">
          <h2>Community Statistics</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAlerts}</div>
            <div className="stat-label">Total Alerts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalComments}</div>
            <div className="stat-label">Comments</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.alertsLast24h}</div>
            <div className="stat-label">Last 24h</div>
          </div>
        </div>

        <div className="stats-section">
          <h3>Alerts by Category</h3>
          <div className="category-stats">
            {stats.byCategory.map(item => {
              const cat = getCategoryInfo(item.category);
              return (
                <div key={item.category} className="category-stat-item">
                  <span>{cat.icon} {cat.name}</span>
                  <span className="count">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="stats-section">
          <h3>Alerts by Severity</h3>
          <div className="severity-stats">
            {stats.bySeverity.map(item => (
              <div key={item.severity} className="severity-stat-item">
                <span className={`severity-badge ${item.severity}`}>{item.severity}</span>
                <span className="count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {stats.topContributors.length > 0 && (
          <div className="stats-section">
            <h3>Top Contributors</h3>
            <div className="contributors-list">
              {stats.topContributors.map((user, index) => (
                <div key={user.username} className="contributor-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="username">{user.username}</span>
                  <span className="alert-count">{user.alert_count} alerts</span>
                  <span className="upvotes">{user.total_upvotes || 0} upvotes</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsPanel;
