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
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import './App.css';

// Translation for Open-Meteo WMO weather codes
function getWeatherDescription(code) {
  if (code === 0) return "Clear/Sunny";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzling";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowy";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Clear";
}

// Relative time formatter
function getRelativeTime(isoString) {
  if (!isoString) return "";
  try {
    const checkTime = new Date(isoString);
    const now = new Date();
    const diffMs = now - checkTime;
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return "just now";
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (e) {
    return isoString;
  }
}

const FALLBACK_RECOMMENDATIONS = [
  {
    placeName: "Dineen Coffee Co.",
    Type: "Cafe",
    reason: "A historic spot in downtown Toronto with a gorgeous interior and excellent espresso. Perfect for a chill morning coffee or reading a book."
  },
  {
    placeName: "Balzac's Distillery District",
    Type: "Coffee Shop",
    reason: "Housed in a gorgeous 1895 pump house, this cafe offers a grand, Parisian-style atmosphere with rich, organic coffees."
  },
  {
    placeName: "Quantum Coffee",
    Type: "Cafe",
    reason: "A modern, tech-forward cafe in King West. Offers incredibly fast Wi-Fi, spacious seating, and artisanal pour-overs."
  },
  {
    placeName: "Fahrenheit Coffee",
    Type: "Coffee Shop",
    reason: "Regularly voted as one of Toronto's best espresso bars. Features custom bean selections and a cozy, friendly neighborhood vibe."
  }
];

const FALLBACK_PLACES = [
  {
    displayName: { text: "Dineen Coffee Co." },
    formattedAddress: "140 Yonge St, Toronto, ON M5C 1X6",
    nationalPhoneNumber: "(416) 900-0949",
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Monday: 7:00 AM – 6:00 PM",
        "Tuesday: 7:00 AM – 6:00 PM",
        "Wednesday: 7:00 AM – 6:00 PM",
        "Thursday: 7:00 AM – 6:00 PM",
        "Friday: 7:00 AM – 6:00 PM",
        "Saturday: 8:00 AM – 6:00 PM",
        "Sunday: 8:00 AM – 6:00 PM"
      ]
    },
    location: { latitude: 43.6518, longitude: -79.3792 }
  },
  {
    displayName: { text: "Balzac's Distillery District" },
    formattedAddress: "1 Trinity St, Toronto, ON M5A 3C4",
    nationalPhoneNumber: "(416) 207-1709",
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Monday: 7:00 AM – 7:00 PM",
        "Tuesday: 7:00 AM – 7:00 PM",
        "Wednesday: 7:00 AM – 7:00 PM",
        "Thursday: 7:00 AM – 8:00 PM",
        "Friday: 7:00 AM – 8:00 PM",
        "Saturday: 7:00 AM – 8:00 PM",
        "Sunday: 7:00 AM – 7:00 PM"
      ]
    },
    location: { latitude: 43.6503, longitude: -79.3596 }
  },
  {
    displayName: { text: "Quantum Coffee" },
    formattedAddress: "460 King St W, Toronto, ON M5V 1L7",
    nationalPhoneNumber: "(416) 200-4567",
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Monday: 7:30 AM – 6:00 PM",
        "Tuesday: 7:30 AM – 6:00 PM",
        "Wednesday: 7:30 AM – 6:00 PM",
        "Thursday: 7:30 AM – 6:00 PM",
        "Friday: 7:30 AM – 6:00 PM",
        "Saturday: 8:00 AM – 6:00 PM",
        "Sunday: 8:00 AM – 6:00 PM"
      ]
    },
    location: { latitude: 43.6453, longitude: -79.3980 }
  },
  {
    displayName: { text: "Fahrenheit Coffee" },
    formattedAddress: "120 Lombard St, Toronto, ON M5C 3H5",
    nationalPhoneNumber: "(647) 896-1774",
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Monday: 7:00 AM – 5:00 PM",
        "Tuesday: 7:00 AM – 5:00 PM",
        "Wednesday: 7:00 AM – 5:00 PM",
        "Thursday: 7:00 AM – 5:00 PM",
        "Friday: 7:00 AM – 5:00 PM",
        "Saturday: 8:00 AM – 5:00 PM",
        "Sunday: 9:00 AM – 3:00 PM"
      ]
    },
    location: { latitude: 43.6521, longitude: -79.3725 }
  }
];

function App() {
  const [theme, setTheme] = useState('light');
  
  // Data states
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [vibeChecks, setVibeChecks] = useState([]);
  
  // UI states
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [usingFallbacks, setUsingFallbacks] = useState(false);
  
  // Vibe Check Submission Form state
  const [vibeStatus, setVibeStatus] = useState(null); // "Busy" | "Chill" | "Empty"
  const [isVegan, setIsVegan] = useState(false);
  const [submittingVibe, setSubmittingVibe] = useState(false);

  // Sync theme to root HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Fetch all data from endpoints
  const fetchAllData = async () => {
    setLoadingData(true);
    setErrorMsg(null);
    setUsingFallbacks(false);
    try {
      // Fetch all data concurrently
      const [weatherData, placesData, vibesData, recsData] = await Promise.all([
        api.getWeather(),
        api.getPlaces(),
        api.getVibeChecks(),
        api.getRecommendations()
      ]);

      setWeather(weatherData);
      setPlaces(placesData);
      setVibeChecks(vibesData);

      // Look if there are any backend errors reported inside response objects
      const containsError = recsData.find(r => r.error);
      if (containsError) {
        throw new Error(containsError.error);
      }
      
      setRecommendations(recsData);

      // Auto-select first cafe if recommendations exist
      if (recsData && recsData.length > 0) {
        setSelectedCafe(recsData[0]);
      }
    } catch (err) {
      console.log("Using curated Toronto cafes fallback (Backend API limit reached).");
      setRecommendations(FALLBACK_RECOMMENDATIONS);
      setPlaces(prevPlaces => prevPlaces.length > 0 ? prevPlaces : FALLBACK_PLACES);
      setUsingFallbacks(true);
      if (FALLBACK_RECOMMENDATIONS.length > 0) {
        setSelectedCafe(FALLBACK_RECOMMENDATIONS[0]);
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch only vibe checks (used for refreshing lists after submission)
  const refreshVibeChecks = async () => {
    try {
      const vibesData = await api.getVibeChecks();
      setVibeChecks(vibesData);
    } catch (err) {
      console.error("Failed to refresh vibe checks:", err);
    }
  };

  // Submit vibe check
  const handleVibeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCafe || !vibeStatus) return;

    setSubmittingVibe(true);
    try {
      await api.submitVibeCheck(selectedCafe.placeName, vibeStatus, isVegan);
      setVibeStatus(null);
      setIsVegan(false);
      // Refresh timeline
      await refreshVibeChecks();
    } catch (err) {
      alert("Could not submit vibe check. Please try again.");
    } finally {
      setSubmittingVibe(false);
    }
  };

  // Find matching Place details from Places API
  const getMatchedPlace = (cafeName) => {
    if (!cafeName) return null;
    return places.find(p => 
      p.displayName && 
      p.displayName.text && 
      p.displayName.text.toLowerCase() === cafeName.toLowerCase()
    );
  };

  // Aggregate vibe checks statistics for selected cafe
  const getSelectedVibeStats = (cafeName) => {
    if (!cafeName) return { recentReports: 0, dominantStatus: "No reports", veganPercentage: null, filteredList: [] };

    // Filter vibe checks for this cafe
    const filteredList = vibeChecks
      .filter(v => v.placeId && v.placeId.toLowerCase() === cafeName.toLowerCase())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const now = new Date();
    let recentReports = 0;
    const statusCounts = { Busy: 0, Chill: 0, Empty: 0 };
    let veganCount = 0;
    let veganReportedCount = 0;

    filteredList.forEach(v => {
      // Check status
      if (v.status && statusCounts[v.status] !== undefined) {
        statusCounts[v.status]++;
      }
      
      // Check if within the last hour
      if (v.timestamp) {
        const timeDiffMs = Math.abs(now - new Date(v.timestamp));
        if (timeDiffMs / (1000 * 60 * 60) < 1) {
          recentReports++;
        }
      }

      // Check vegan-friendly report
      if (v.isVeganFriendly !== null && v.isVeganFriendly !== undefined) {
        veganReportedCount++;
        if (v.isVeganFriendly) {
          veganCount++;
        }
      }
    });

    // Find dominant status
    let dominantStatus = "Chill";
    let maxCount = -1;
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantStatus = status;
      }
    });

    const veganPercentage = veganReportedCount > 0 
      ? Math.round((veganCount / veganReportedCount) * 100) 
      : null;

    return {
      recentReports,
      dominantStatus: filteredList.length > 0 ? dominantStatus : "No reports",
      veganPercentage,
      filteredList
    };
  };

  // Compute stats for currently selected cafe
  const activeStats = getSelectedVibeStats(selectedCafe?.placeName);
  const matchedPlace = getMatchedPlace(selectedCafe?.placeName);

  // Maps URL formatting
  const getMapsUrl = () => {
    if (!selectedCafe) return "#";
    if (matchedPlace && matchedPlace.location) {
      return `https://www.google.com/maps/search/?api=1&query=${matchedPlace.location.latitude},${matchedPlace.location.longitude}`;
    }
    if (matchedPlace && matchedPlace.formattedAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedPlace.formattedAddress)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCafe.placeName + ', Toronto')}`;
  };

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="app-header animate-fade-in">
        <div className="brand-section">
          <div className="brand-logo">
            <Coffee size={26} />
            <span>RightNow TO</span>
          </div>
          <span className="brand-tagline">Real-Time AI-Driven Toronto Cafe Guide</span>
        </div>

        <div className="header-meta">
          {/* Weather Widget */}
          {weather && weather.current ? (
            <div className="weather-chip">
              <CloudSun size={18} className="weather-icon" />
              <span>
                Toronto: {Math.round(weather.current.temperature_2m)}°C · {getWeatherDescription(weather.current.weather_code)}
              </span>
            </div>
          ) : (
            <div className="weather-chip loading">
              <CloudSun size={18} className="weather-icon animate-pulse" />
              <span>Fetching Toronto Weather...</span>
            </div>
          )}

          {/* Theme Toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      {loadingData ? (
        <div className="loading-state-container animate-fade-in">
          <div className="loading-card">
            <div className="coffee-loader">
              <div className="coffee-cup">
                <div className="coffee-steam">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="cup-body"></div>
                <div className="cup-handle"></div>
              </div>
            </div>
            
            <h2 className="loading-title">Wait, we are preparing the list for you...</h2>
            
            <div className="loading-progress-bar">
              <div className="loading-progress-fill"></div>
            </div>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="error-state animate-fade-in">
          <AlertTriangle className="error-icon" />
          <h2 className="error-title">Oops! Something went wrong</h2>
          <p className="error-message">{errorMsg}</p>
          <button className="reload-btn" onClick={fetchAllData} style={{ marginTop: '16px' }}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <div className="dashboard-grid animate-fade-in">
          {/* LEFT SIDE: RECOMMENDATIONS FEED */}
          <div className="main-content">
            <div className="section-title-bar">
              <h2 className="section-title">
                <Sparkles size={20} style={{ color: 'rgb(var(--primary-rgb))' }} />
                <span>AI Recommended Spots Right Now</span>
              </h2>
              <button className="reload-btn" onClick={fetchAllData}>
                <RefreshCw size={14} />
                <span>Refresh Recommendations</span>
              </button>
            </div>

            {usingFallbacks && (
              <div className="fallback-banner">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Live AI & Places APIs are currently rate-limited (Quota Exceeded).</strong> Showing pre-loaded curated cafes so you can test all details, navigation, and live vibe check features.
                </span>
              </div>
            )}

            <div className="recommendations-list">
              {recommendations.map((cafe, idx) => {
                const cafeVibe = getSelectedVibeStats(cafe.placeName);
                const cafePlace = getMatchedPlace(cafe.placeName);
                const isOpen = cafePlace?.regularOpeningHours?.openNow;

                return (
                  <div 
                    key={idx} 
                    className={`cafe-card ${selectedCafe?.placeName === cafe.placeName ? 'active' : ''}`}
                    onClick={() => setSelectedCafe(cafe)}
                  >
                    <div className="cafe-header">
                      <h3 className="cafe-name">{cafe.placeName}</h3>
                      {cafe.Type && <span className="cafe-type-tag">{cafe.Type}</span>}
                    </div>

                    <p className="cafe-reason">{cafe.reason}</p>

                    <div className="cafe-footer">
                      <div className="cafe-meta-item">
                        <Users size={14} />
                        <span>Vibe: <strong style={{ color: cafeVibe.dominantStatus === 'Chill' ? 'var(--status-chill)' : cafeVibe.dominantStatus === 'Busy' ? 'var(--status-busy)' : 'var(--status-empty)' }}>{cafeVibe.dominantStatus}</strong></span>
                      </div>

                      {cafePlace && (
                        <div className="cafe-meta-item">
                          <Clock size={14} />
                          {isOpen !== undefined ? (
                            isOpen ? <span className="open-badge">Open Now</span> : <span className="closed-badge">Closed</span>
                          ) : (
                            <span>Hours Available</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: SELECTED SPOT DETAILS */}
          <aside className="details-sidebar">
            {selectedCafe ? (
              <>
                {/* 1. Cafe Profile */}
                <div className="sidebar-section">
                  <span className="brand-tagline">Selected Location</span>
                  <h3 className="spot-title">{selectedCafe.placeName}</h3>
                  
                  {matchedPlace ? (
                    <>
                      <p className="spot-address">
                        <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{matchedPlace.formattedAddress}</span>
                      </p>
                      {matchedPlace.nationalPhoneNumber && (
                        <p className="spot-phone">
                          <Phone size={14} />
                          <span>{matchedPlace.nationalPhoneNumber}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="spot-address">
                      <MapPin size={16} />
                      <span>Address not found in Places search</span>
                    </p>
                  )}
                </div>

                {/* 2. Navigation Button */}
                <a href={getMapsUrl()} target="_blank" rel="noopener noreferrer" className="maps-btn">
                  <ExternalLink size={16} />
                  <span>Navigate in Google Maps</span>
                </a>

                {/* 3. Opening Hours */}
                {matchedPlace && matchedPlace.regularOpeningHours?.weekdayDescriptions && (
                  <div className="sidebar-section">
                    <h4 className="sidebar-section-title">Opening Hours</h4>
                    <div className="hours-list">
                      {matchedPlace.regularOpeningHours.weekdayDescriptions.map((day, idx) => (
                        <div key={idx}>{day}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Vibe Check Live Statistics */}
                <div className="sidebar-section">
                  <h4 className="sidebar-section-title">Live Community Vibe</h4>
                  <div className="vibe-summary-card">
                    <div className="stats-grid">
                      <div className="stat-box">
                        <div className="stat-label">Active Status</div>
                        <div className={`stat-value ${activeStats.dominantStatus.toLowerCase()}`}>
                          {activeStats.dominantStatus}
                        </div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Vegan-Friendly</div>
                        <div className="stat-value" style={{ color: activeStats.veganPercentage > 50 ? 'var(--status-chill)' : 'inherit' }}>
                          {activeStats.veganPercentage !== null ? `${activeStats.veganPercentage}%` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    {activeStats.recentReports > 0 && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Based on {activeStats.recentReports} community updates in the last hour.
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Report Vibe Check */}
                <div className="sidebar-section">
                  <h4 className="sidebar-section-title">Submit Vibe Report</h4>
                  <form onSubmit={handleVibeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="vibe-buttons">
                      {['Busy', 'Chill', 'Empty'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={submittingVibe}
                          className={`vibe-submit-btn ${status.toLowerCase()} ${vibeStatus === status ? 'selected' : ''}`}
                          onClick={() => setVibeStatus(status)}
                        >
                          <span style={{ fontSize: '16px' }}>
                            {status === 'Busy' ? '🔴' : status === 'Chill' ? '🟢' : '🔵'}
                          </span>
                          <span>{status}</span>
                        </button>
                      ))}
                    </div>

                    <label className="vegan-checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={isVegan}
                        onChange={(e) => setIsVegan(e.target.checked)}
                        disabled={submittingVibe}
                      />
                      <span>Vegan-friendly options available</span>
                    </label>

                    <button 
                      type="submit" 
                      className="action-submit-btn"
                      disabled={submittingVibe || !vibeStatus}
                    >
                      {submittingVibe ? "Submitting Report..." : "Submit Vibe Check"}
                    </button>
                  </form>
                </div>

                {/* 6. Vibe Feed / Timeline */}
                <div className="sidebar-section">
                  <h4 className="sidebar-section-title">Timeline Reports</h4>
                  {activeStats.filteredList.length > 0 ? (
                    <div className="vibe-timeline">
                      {activeStats.filteredList.map((item, idx) => (
                        <div key={idx} className="timeline-item animate-fade-in">
                          <div className={`timeline-status-dot ${item.status?.toLowerCase()}`} />
                          <div className="timeline-details">
                            <span className="timeline-header-text">{item.status} Report</span>
                            <span className="timeline-time">{getRelativeTime(item.timestamp)}</span>
                            {item.isVeganFriendly && (
                              <span className="timeline-vegan-indicator">✓ Vegan options noted</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                      No reports submitted yet. Be the first to submit a report!
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="sidebar-placeholder">
                <Compass className="sidebar-placeholder-icon" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>No Cafe Selected</h3>
                <p style={{ fontSize: '13px' }}>Click on any cafe card in the list to view live details, directions, opening hours, and submit vibe reports.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
