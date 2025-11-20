import React, { useState, useEffect } from 'react';
import { Alert, Comment, Category } from '../types';

interface AlertDetailProps {
  alertId: string;
  categories: Category[];
  token: string | null;
  onClose: () => void;
  onUpvote: (id: string) => void;
}

const API_URL = 'http://localhost:3001/api';

function AlertDetail({ alertId, categories, token, onClose, onUpvote }: AlertDetailProps) {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/alerts/${alertId}`)
      .then(res => res.json())
      .then(data => {
        setAlert(data);
        setComments(data.comments || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load alert:', err);
        setLoading(false);
      });
  }, [alertId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/alerts/${alertId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newComment,
          username: guestName || 'Anonymous'
        }),
      });

      const comment = await response.json();
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || { icon: '📍', color: '#9b59b6', name: 'Unknown' };
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">Loading...</div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <p>Alert not found</p>
          <button onClick={onClose} className="btn-cancel">Close</button>
        </div>
      </div>
    );
  }

  const catInfo = getCategoryInfo(alert.category);

  return (
    <div className="modal-overlay">
      <div className="modal alert-detail-modal">
        <div className="alert-detail-header">
          <h2>{catInfo.icon} {catInfo.name}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="alert-detail-content">
          <p className="description">{alert.description || 'No description provided'}</p>

          <div className="alert-meta">
            <span className={`severity ${alert.severity}`}>{alert.severity}</span>
            <span className="author">By: {alert.author || 'Anonymous'}</span>
            <span className="date">{new Date(alert.created_at).toLocaleDateString()}</span>
          </div>

          <button
            onClick={() => onUpvote(alert.id)}
            className="upvote-btn-large"
          >
            👍 Confirm ({alert.upvotes})
          </button>
        </div>

        <div className="comments-section">
          <h3>Comments ({comments.length})</h3>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">No comments yet</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <strong>{comment.username}</strong>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p>{comment.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="comment-form">
            {!token && (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name (optional)"
                className="guest-name-input"
              />
            )}
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
            />
            <button type="submit" className="btn-submit">
              Post Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AlertDetail;
