import React, { useState, useRef } from 'react';
import { Category, NewAlert } from '../types';

interface AlertFormProps {
  position: [number, number];
  categories: Category[];
  onSubmit: (alert: NewAlert) => void;
  onCancel: () => void;
}

function AlertForm({ position, categories, onSubmit, onCancel }: AlertFormProps) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhoto(result);
        setPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    onSubmit({
      latitude: position[0],
      longitude: position[1],
      category,
      description,
      severity,
      photo: photo || undefined,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Report Alert</h2>
        <p className="coords">
          Location: {position[0].toFixed(4)}, {position[1].toFixed(4)}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this alert..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              ref={fileInputRef}
              className="file-input"
            />
            {photoPreview && (
              <div className="photo-preview">
                <img src={photoPreview} alt="Preview" />
                <button type="button" onClick={removePhoto} className="remove-photo">
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Report Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AlertForm;
