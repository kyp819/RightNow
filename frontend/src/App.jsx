import { useState, useEffect } from 'react';
import { api } from './api';
import { 
  Coffee, 
  CloudSun, 
  RefreshCw, 
  Compass, 
  MapPin, 
  Phone, 
  Clock, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Sun, 
  Moon, 
  AlertTriangle 
} from 'lucide-react';
import './App.css';

function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [recsData, weatherData] = await Promise.all([
        api.getRecommendations(),
        api.getWeather()
      ]);
      
      if (recsData && recsData.length > 0 && recsData[0].error) {
        throw new Error(recsData[0].error);
      }
      
      setRecommendations(recsData || []);
      setWeather(weatherData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getVibeConfig = (vibeType) => {
    switch (vibeType?.toUpperCase()) {
      case 'BUSY': return { icon: Users, class: 'vibe-busy', label: 'Busy' };
      case 'CHILL': return { icon: Sparkles, class: 'vibe-chill', label: 'Chill' };
      case 'EMPTY': return { icon: CheckCircle2, class: 'vibe-empty', label: 'Empty' };
      default: return { icon: Compass, class: 'vibe-empty', label: 'Unknown' };
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Discovering Toronto's best spots...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="main-content">
        
        {/* HEADER */}
        <header className="top-bar">
          <div className="brand">
            <div className="brand-icon-wrapper">
              <Coffee size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1>RightNow TO</h1>
              <p>Toronto's Live Cafe Guide</p>
            </div>
          </div>
          
          <div className="header-controls">
            {weather && (
              <div className="weather-widget">
                <CloudSun size={18} />
                <span>{weather.temperature}°C {weather.condition}</span>
              </div>
            )}
            
            <button 
              className="theme-toggle"
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        {/* ERROR STATE */}
        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #fecaca' }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {/* CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Live Recommendations</h2>
          <button 
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>

        {/* CAFE GRID */}
        <div className="cafe-grid">
          {recommendations.map((cafe, index) => {
            const vibe = getVibeConfig(cafe.currentVibe || cafe.vibe);
            const VibeIcon = vibe.icon;
            
            const name = cafe.name || cafe.placeName || 'Unknown Cafe';
            const address = cafe.address || 'Toronto, ON';
            const description = cafe.reason || cafe.description || 'A great spot in the city.';
            
            return (
              <div key={cafe.id || index} className="cafe-card">
                <div>
                  <div className="cafe-header">
                    <h3 className="cafe-title">{name}</h3>
                    <div className={`vibe-tag ${vibe.class}`}>
                      <VibeIcon size={12} strokeWidth={3} />
                      {vibe.label}
                    </div>
                  </div>
                  <div className="cafe-address">
                    <MapPin size={14} />
                    {address}
                  </div>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {description}
                  </p>
                </div>

                <div className="stats-row">
                  <div className="stat-item" title="Wait time">
                    <Clock size={16} />
                    {cafe.estimatedWaitTime || '5'}m
                  </div>
                  <div className="stat-item" title="Noise level">
                    <Users size={16} />
                    {cafe.noiseLevel?.toLowerCase() || 'moderate'}
                  </div>
                  <div className="stat-item">
                    <Phone size={16} />
                    {cafe.hasWifi !== false ? 'WiFi' : 'No WiFi'}
                  </div>
                </div>

                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(name + ' ' + address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-button"
                >
                  <MapPin size={16} />
                  Navigate
                </a>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}

export default App;
