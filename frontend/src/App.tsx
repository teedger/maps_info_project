import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Alert, Category, NewAlert } from './types';
import AlertForm from './components/AlertForm';
import './App.css';

const API_URL = 'http://localhost:3001/api';

// Custom marker icons
const createIcon = (emoji: string, color: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${emoji}</div>`,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function App() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/alerts`).then(res => res.json()),
      fetch(`${API_URL}/categories`).then(res => res.json())
    ]).then(([alertsData, categoriesData]) => {
      setAlerts(alertsData);
      setCategories(categoriesData);
      setActiveFilters(categoriesData.map((c: Category) => c.id));
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch data:', err);
      setLoading(false);
    });
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setShowForm(true);
  };

  const handleAddAlert = async (alertData: NewAlert) => {
    try {
      const response = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      const newAlert = await response.json();
      setAlerts([newAlert, ...alerts]);
      setShowForm(false);
      setSelectedPosition(null);
    } catch (error) {
      console.error('Failed to add alert:', error);
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/alerts/${id}/upvote`, {
        method: 'POST',
      });
      const updatedAlert = await response.json();
      setAlerts(alerts.map(a => a.id === id ? updatedAlert : a));
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const toggleFilter = (categoryId: string) => {
    setActiveFilters(prev =>
      prev.includes(categoryId)
        ? prev.filter(f => f !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredAlerts = alerts.filter(a => activeFilters.includes(a.category));

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || { icon: '📍', color: '#9b59b6', name: 'Unknown' };
  };

  if (loading) {
    return <div className="loading">Loading map...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Community Maps</h1>
        <p>Click on the map to report an alert</p>
      </header>

      <div className="filters">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${activeFilters.includes(cat.id) ? 'active' : ''}`}
            onClick={() => toggleFilter(cat.id)}
            style={{ borderColor: cat.color }}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="map-container">
        <MapContainer
          center={[40.7128, -74.006]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {filteredAlerts.map(alert => {
            const catInfo = getCategoryInfo(alert.category);
            return (
              <Marker
                key={alert.id}
                position={[alert.latitude, alert.longitude]}
                icon={createIcon(catInfo.icon, catInfo.color)}
              >
                <Popup>
                  <div className="popup-content">
                    <h3>{catInfo.icon} {catInfo.name}</h3>
                    <p>{alert.description || 'No description'}</p>
                    <p className="severity">Severity: <span className={alert.severity}>{alert.severity}</span></p>
                    <p className="meta">
                      {new Date(alert.created_at).toLocaleDateString()}
                      {' • '}
                      <button onClick={() => handleUpvote(alert.id)} className="upvote-btn">
                        👍 {alert.upvotes}
                      </button>
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {selectedPosition && (
            <Marker position={selectedPosition} icon={createIcon('📍', '#e74c3c')} />
          )}
        </MapContainer>
      </div>

      {showForm && selectedPosition && (
        <AlertForm
          position={selectedPosition}
          categories={categories}
          onSubmit={handleAddAlert}
          onCancel={() => {
            setShowForm(false);
            setSelectedPosition(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
