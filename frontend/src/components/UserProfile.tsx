import React, { useState, useEffect } from 'react';
import { Alert, User, UserStats, Category } from '../types';

interface UserProfileProps {
  user: User;
  token: string;
  categories: Category[];
  onClose: () => void;
  onDeleteAlert: (id: string) => void;
}

const API_URL = 'http://localhost:3001/api';

function UserProfile({ user, token, categories, onClose, onDeleteAlert }: UserProfileProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/users/${user.id}/alerts`).then(res => res.json()),
      fetch(`${API_URL}/users/${user.id}/stats`).then(res => res.json())
    ]).then(([alertsData, statsData]) => {
      setAlerts(alertsData);
      setStats(statsData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load profile:', err);
      setLoading(false);
    });
  }, [user.id]);

  const handleDelete = async (alertId: string) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;

    try {
      const response = await fetch(`${API_URL}/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId));
        onDeleteAlert(alertId);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete alert');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || { icon: '📍', name: 'Unknown', color: '#9b59b6' };
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal profile-modal">
        <div className="modal-header">
          <h2>My Profile</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="profile-info">
          <div className="profile-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="profile-details">
            <h3>{user.username}</h3>
            <p>{user.email}</p>
          </div>
        </div>

        {stats && (
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="value">{stats.total_alerts}</span>
              <span className="label">Alerts</span>
            </div>
            <div className="profile-stat">
              <span className="value">{stats.total_upvotes || 0}</span>
              <span className="label">Upvotes</span>
            </div>
            <div className="profile-stat">
              <span className="value">{stats.total_comments}</span>
              <span className="label">Comments</span>
            </div>
          </div>
        )}

        <div className="profile-alerts">
          <h3>My Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p className="no-alerts">You haven't created any alerts yet.</p>
          ) : (
            <div className="alerts-list">
              {alerts.map(alert => {
                const cat = getCategoryInfo(alert.category);
                return (
                  <div key={alert.id} className="alert-item">
                    <div className="alert-item-info">
                      <span className="alert-category">{cat.icon} {cat.name}</span>
                      <span className="alert-date">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="alert-item-meta">
                      <span className={`severity ${alert.severity}`}>{alert.severity}</span>
                      <span className="upvotes">{alert.upvotes} upvotes</span>
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="delete-btn"
                        title="Delete alert"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
