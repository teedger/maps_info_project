import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Alert, Category, NewAlert, User } from './types';
import AlertForm from './components/AlertForm';
import AuthModal from './components/AuthModal';
import AlertDetail from './components/AlertDetail';
import StatsPanel from './components/StatsPanel';
import UserProfile from './components/UserProfile';
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

function LocationButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();

  const handleClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 15);
          onLocate(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Could not get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <button className="locate-btn" onClick={handleClick} title="Go to my location">
      My Location
    </button>
  );
}

function App() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyCount, setNearbyCount] = useState(0);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load saved auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

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

  // Check for nearby alerts when location changes
  useEffect(() => {
    if (userLocation) {
      fetch(`${API_URL}/alerts/nearby?lat=${userLocation[0]}&lng=${userLocation[1]}&radius=2`)
        .then(res => res.json())
        .then(data => {
          setNearbyCount(data.length);
          if (data.length > 0) {
            // Could show notification here
          }
        })
        .catch(err => console.error('Failed to fetch nearby alerts:', err));
    }
  }, [userLocation, alerts]);

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setShowAuth(false);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setShowForm(true);
  };

  const handleAddAlert = async (alertData: NewAlert) => {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers,
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
      setAlerts(alerts.map(a => a.id === id ? { ...a, upvotes: updatedAlert.upvotes } : a));
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const toggleFilter = (categoryId: string) => {
    setActiveFilters(prev =>
      prev.includes(categoryId)
        ? prev.filter(f => f !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${API_URL}/alerts?${params}`);
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to search:', error);
    }
  };

  const clearSearch = async () => {
    setSearchQuery('');
    const response = await fetch(`${API_URL}/alerts`);
    const data = await response.json();
    setAlerts(data);
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
        <div className="header-left">
          <h1>Community Maps</h1>
          <p className="subtitle">Click on the map to report an alert</p>
        </div>
        <div className="header-right">
          <button onClick={() => setShowStats(true)} className="stats-btn" title="View Statistics">
            Stats
          </button>
          {user ? (
            <div className="user-info">
              <button onClick={() => setShowProfile(true)} className="profile-btn">
                {user.username}
              </button>
              <button onClick={handleLogout} className="auth-btn">Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="auth-btn">Login</button>
          )}
        </div>
      </header>

      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search alerts..."
        />
        <button onClick={handleSearch} className="search-btn">Search</button>
        {searchQuery && (
          <button onClick={clearSearch} className="clear-btn">Clear</button>
        )}
        {nearbyCount > 0 && userLocation && (
          <span className="nearby-badge">{nearbyCount} nearby</span>
        )}
      </div>

      <div className="filters">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${activeFilters.includes(cat.id) ? 'active' : ''}`}
            onClick={() => toggleFilter(cat.id)}
            style={{ borderColor: cat.color }}
          >
            <span className="filter-icon">{cat.icon}</span>
            <span className="filter-name">{cat.name}</span>
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
          <LocationButton onLocate={(lat, lng) => setUserLocation([lat, lng])} />

          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                html: '<div style="background: #4285f4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                className: 'user-location-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
          )}

          {filteredAlerts.map(alert => {
            const catInfo = getCategoryInfo(alert.category);
            return (
              <Marker
                key={alert.id}
                position={[alert.latitude, alert.longitude]}
                icon={createIcon(catInfo.icon, catInfo.color)}
                eventHandlers={{
                  click: () => setSelectedAlertId(alert.id),
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h3>{catInfo.icon} {catInfo.name}</h3>
                    {alert.photo_url && (
                      <img
                        src={`http://localhost:3001${alert.photo_url}`}
                        alt="Alert"
                        className="popup-photo"
                      />
                    )}
                    <p>{alert.description || 'No description'}</p>
                    <p className="severity">Severity: <span className={alert.severity}>{alert.severity}</span></p>
                    <p className="author">By: {alert.author || 'Anonymous'}</p>
                    <p className="meta">
                      {new Date(alert.created_at).toLocaleDateString()}
                      {' | '}
                      <button onClick={() => handleUpvote(alert.id)} className="upvote-btn">
                        {alert.upvotes}
                      </button>
                    </p>
                    <button
                      onClick={() => setSelectedAlertId(alert.id)}
                      className="view-details-btn"
                    >
                      View Details
                    </button>
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

      {showAuth && (
        <AuthModal
          onLogin={handleLogin}
          onClose={() => setShowAuth(false)}
        />
      )}

      {showStats && (
        <StatsPanel
          categories={categories}
          onClose={() => setShowStats(false)}
        />
      )}

      {showProfile && user && token && (
        <UserProfile
          user={user}
          token={token}
          categories={categories}
          onClose={() => setShowProfile(false)}
          onDeleteAlert={handleDeleteAlert}
        />
      )}

      {selectedAlertId && (
        <AlertDetail
          alertId={selectedAlertId}
          categories={categories}
          token={token}
          userId={user?.id || null}
          onClose={() => setSelectedAlertId(null)}
          onUpvote={handleUpvote}
          onDelete={handleDeleteAlert}
        />
      )}
    </div>
  );
}

export default App;
