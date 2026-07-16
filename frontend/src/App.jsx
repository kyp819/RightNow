import { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   RightNowTO — live "what to do right now" board for downtown Toronto
   Aesthetic: a TTC departures board at dusk.
============================================================================ */

const API_BASE = "";
const VIBES_GET_PATH = "/api/vibe-checks";
const VIBES_POST_PATH = "/api/vibe-check";
const FETCH_TIMEOUT_MS = 3500;

/* ---------------------------------------------------------------- helpers */

// WMO weather_code -> label, glyph, and a mood color that tints the board glow
function decodeWeather(code) {
  const map = {
    0: ["Clear sky", "sun", "#F5B841"],
    1: ["Mostly clear", "sun", "#F0C069"],
    2: ["Partly cloudy", "cloud-sun", "#C9A24B"],
    3: ["Overcast", "cloud", "#3E5876"],
    45: ["Fog", "fog", "#4A5B6E"],
    48: ["Fog", "fog", "#4A5B6E"],
    51: ["Light drizzle", "rain", "#2E6FA3"],
    53: ["Drizzle", "rain", "#2E6FA3"],
    55: ["Heavy drizzle", "rain", "#2668A0"],
    61: ["Light rain", "rain", "#1F5A93"],
    63: ["Rain", "rain", "#1D4E89"],
    65: ["Heavy rain", "rain", "#184680"],
    66: ["Freezing rain", "rain", "#3A6EA5"],
    67: ["Freezing rain", "rain", "#3A6EA5"],
    71: ["Light snow", "snow", "#6FA8C7"],
    73: ["Snow", "snow", "#7FB4CF"],
    75: ["Heavy snow", "snow", "#8FC0D8"],
    77: ["Snow grains", "snow", "#8FC0D8"],
    80: ["Rain showers", "rain", "#2E6FA3"],
    81: ["Rain showers", "rain", "#276299"],
    82: ["Heavy showers", "rain", "#1F5A93"],
    85: ["Snow showers", "snow", "#7FB4CF"],
    86: ["Snow showers", "snow", "#7FB4CF"],
    95: ["Thunderstorm", "storm", "#2A3C57"],
    96: ["Thunderstorm", "storm", "#24344D"],
    99: ["Thunderstorm", "storm", "#24344D"],
  };
  const [label, glyph, mood] = map[code] || ["Downtown", "cloud", "#3E5876"];
  return { label, glyph, mood, code };
}

function WeatherGlyph({ glyph, size = 26 }) {
  const s = { width: size, height: size, display: "block" };
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (glyph) {
    case "sun":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <circle cx="12" cy="12" r="4.2" {...stroke} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={12 + Math.cos(r) * 7} y1={12 + Math.sin(r) * 7} x2={12 + Math.cos(r) * 9} y2={12 + Math.sin(r) * 9} {...stroke} />;
          })}
        </svg>
      );
    case "cloud-sun":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <circle cx="8" cy="8" r="3" {...stroke} />
          <path d="M7 17h9a3.2 3.2 0 0 0 0-6.4 4.4 4.4 0 0 0-8.3-1A3.4 3.4 0 0 0 7 17z" {...stroke} />
        </svg>
      );
    case "rain":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M6 14h11a3.4 3.4 0 0 0 0-6.8 4.6 4.6 0 0 0-8.7-1A3.6 3.6 0 0 0 6 14z" {...stroke} />
          <line x1="8" y1="18" x2="7" y2="21" {...stroke} />
          <line x1="12" y1="18" x2="11" y2="21" {...stroke} />
          <line x1="16" y1="18" x2="15" y2="21" {...stroke} />
        </svg>
      );
    case "snow":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M6 13h11a3.4 3.4 0 0 0 0-6.8 4.6 4.6 0 0 0-8.7-1A3.6 3.6 0 0 0 6 13z" {...stroke} />
          <g {...stroke}><line x1="8" y1="18" x2="8" y2="18.5" /><line x1="12" y1="20" x2="12" y2="20.5" /><line x1="16" y1="18" x2="16" y2="18.5" /></g>
        </svg>
      );
    case "storm":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M6 13h11a3.4 3.4 0 0 0 0-6.8 4.6 4.6 0 0 0-8.7-1A3.6 3.6 0 0 0 6 13z" {...stroke} />
          <path d="M12 16l-2 3h3l-2 3" {...stroke} />
        </svg>
      );
    case "fog":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M6 11h11a3.4 3.4 0 0 0 0-6.8 4.6 4.6 0 0 0-8.7-1A3.6 3.6 0 0 0 6 11z" {...stroke} />
          <line x1="5" y1="16" x2="19" y2="16" {...stroke} /><line x1="7" y1="19" x2="17" y2="19" {...stroke} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M6 15h11a3.6 3.6 0 0 0 0-7.2 4.8 4.8 0 0 0-9-1A3.8 3.8 0 0 0 6 15z" {...stroke} />
        </svg>
      );
  }
}

const TYPE_STYLES = {
  coffee_shop: { color: "#C98A2B", glyph: "☕" },
  cafe: { color: "#C98A2B", glyph: "☕" },
  restaurant: { color: "#DA291C", glyph: "🍽" },
  vegan_restaurant: { color: "#5B9E4B", glyph: "🌱" },
  vegetarian_restaurant: { color: "#5B9E4B", glyph: "🌱" },
  vegetarian: { color: "#5B9E4B", glyph: "🌱" },
  vegan: { color: "#5B9E4B", glyph: "🌱" },
  bar: { color: "#8B6FB0", glyph: "🍸" },
  pub: { color: "#8B6FB0", glyph: "🍺" },
  bakery: { color: "#D98CA5", glyph: "🥐" },
  ice_cream_shop: { color: "#F0A6CA", glyph: "🍦" },
  juice_shop: { color: "#F5B841", glyph: "🧃" },
  pizza_restaurant: { color: "#DA291C", glyph: "🍕" },
  japanese_restaurant: { color: "#DA291C", glyph: "🍣" },
  chinese_restaurant: { color: "#DA291C", glyph: "🥡" },
  mexican_restaurant: { color: "#DA291C", glyph: "🌮" },
  italian_restaurant: { color: "#DA291C", glyph: "🍝" },
  indian_restaurant: { color: "#DA291C", glyph: "🍛" },
  thai_restaurant: { color: "#DA291C", glyph: "🍜" },
  korean_restaurant: { color: "#DA291C", glyph: "🥢" },
  vietnamese_restaurant: { color: "#DA291C", glyph: "🍜" },
  seafood_restaurant: { color: "#0077B6", glyph: "🦞" },
  steak_house: { color: "#8B0000", glyph: "🥩" },
  hamburger_restaurant: { color: "#D4A373", glyph: "🍔" },
  fast_food_restaurant: { color: "#E07A5F", glyph: "🍟" },
  sandwich_shop: { color: "#F4A261", glyph: "🥪" },
};
function typeStyle(t = "") {
  const type = t.toLowerCase();
  if (TYPE_STYLES[type]) return TYPE_STYLES[type];
  if (type.includes("restaurant") || type.includes("food") || type.includes("meal")) return { color: "#DA291C", glyph: "🍽" };
  if (type.includes("shop") || type.includes("store")) return { color: "#C98A2B", glyph: "🛍" };
  return { color: "#7C8AA0", glyph: "📍" };
}
function titleCase(t = "") {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderReason(text) {
  if (!text) return text;
  const parts = text.split(/(vegan|vegetarian)/i);
  return parts.map((part, i) => {
    if (part.toLowerCase() === "vegan" || part.toLowerCase() === "vegetarian") {
      return (
        <span key={i} style={{ color: "#7ED08A", fontWeight: "600", padding: "0 2px", display: "inline-block" }}>
          🌱 {part}
        </span>
      );
    }
    return part;
  });
}
function timeAgo(ts) {
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "just now";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} d ago`;
}

const VIBE_CHIPS = ["🔥 Busy", "😌 Chill", "🎶 Lively", "🌙 Quiet", "🪑 Seats open", "⏳ Long wait"];

/* ---------------------------------------------------------------- fetch */

async function fetchJSON(path, opts = {}) {
  const ctrl = new AbortController();
  const timeoutMs = opts.timeout || FETCH_TIMEOUT_MS;
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_BASE + path, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------- component */

export default function RightNowTO() {
  const [clock, setClock] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [recs, setRecs] = useState(null);
  const [places, setPlaces] = useState(null);
  const [vibes, setVibes] = useState(null);
  const [throttle, setThrottle] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [activeCity, setActiveCity] = useState({ name: "Toronto", lat: 43.6532, lon: -79.3832 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setActiveCity({ name: "Current Location", lat: latitude, lon: longitude });
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location");
      }
    );
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error("Geocoding failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCitySelect = (city) => {
    setActiveCity({ name: city.name, lat: city.latitude, lon: city.longitude });
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadRecs = useCallback(async () => {
    try {
      // Fetching from Recommendation API with a 60s timeout
      const data = await fetchJSON(`/api/recommendations?lat=${activeCity.lat}&lon=${activeCity.lon}&city=${activeCity.name}`, { timeout: 60000 });
      if (Array.isArray(data) && data.length > 0 && data[0].error) {
        throw new Error(data[0].error);
      }
      setRecs(Array.isArray(data) ? data : []);
      setThrottle("");
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setRecs([]);
      setThrottle("Error loading picks. The board might be catching up.");
    }
  }, [activeCity]);

  useEffect(() => {
    setRecs(null);
    setWeather(null);
    setAqi(null);
    setPlaces(null);
    setVibes(null);
    setRevealed(false);

    (async () => {
      const pWeather = fetchJSON(`/api/weather?lat=${activeCity.lat}&lon=${activeCity.lon}`)
        .then(w => setWeather(w))
        .catch(() => setWeather(null));
        
      const pPlaces = fetchJSON(`/api/places?lat=${activeCity.lat}&lon=${activeCity.lon}`)
        .then(d => {
          if (Array.isArray(d)) setPlaces(d);
          else if (d?.places && Array.isArray(d.places)) setPlaces(d.places);
          else setPlaces([]);
        })
        .catch(() => setPlaces([]));
        
      const pVibes = fetchJSON(VIBES_GET_PATH + `?city=${encodeURIComponent(activeCity.name)}`)
        .then(d => setVibes(Array.isArray(d) ? d : []))
        .catch(() => setVibes([]));
        
      const pAqi = fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeCity.lat}&longitude=${activeCity.lon}&current=us_aqi&domains=cams_global`)
        .then(res => res.json())
        .then(data => setAqi(data?.current?.us_aqi))
        .catch(() => setAqi(null));
        
      // Wait for all base APIs to finish loading
      await Promise.all([pWeather, pPlaces, pVibes, pAqi]);
      
      // AFTER they finish, finally load the recommendations
      // (This guarantees the loader stays on screen until everything is ready)
      await loadRecs();
    })();
    const t = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(t);
  }, [loadRecs, activeCity]);

  async function refreshPicks() {
    if (refreshing) return;
    setRefreshing(true);
    await loadRecs();
    setTimeout(() => setRefreshing(false), 1200);
  }

  async function submitVibe(locationName, vibe) {
    const entry = { locationName, vibe, city: activeCity.name, timestamp: new Date().toISOString() };
    setVibes((v) => [entry, ...(v || [])]); // optimistic
    try {
      await fetchJSON(VIBES_POST_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationName, vibe, city: activeCity.name }),
      });
    } catch {
      // kept locally; backend not reachable
    }
  }

  const w = weather?.current ? decodeWeather(weather.current.weather_code) : decodeWeather(3);
  const temp = weather?.current?.temperature_2m;
  const unit = weather?.current_units?.temperature_2m || "°C";

  const dow = clock.toLocaleDateString("en-CA", { weekday: "short" }).toUpperCase();
  const md = clock.toLocaleDateString("en-CA", { month: "short", day: "numeric" }).toUpperCase();
  const hh = String(clock.getHours()).padStart(2, "0");
  const mm = String(clock.getMinutes()).padStart(2, "0");

  return (
    <div className="rn-root" style={{ ["--mood"]: w.mood }}>
      <style>{CSS}</style>
      <div className="rn-glow" />

      {/* ---- board header ---- */}
      <header className="rn-header">
        <div className="rn-brand" style={{ flex: 1, minWidth: "300px" }}>
          <CNTower />
          <div style={{ flex: 1 }}>
            <div className="rn-word" style={{ userSelect: "none" }}>RIGHTNOW<span className="rn-word-to">·TO</span></div>
            <div className="rn-sub">
              Downtown {activeCity.name} · live picks 
              <button onClick={handleLocateMe} style={{ marginLeft: "10px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px", color: "var(--cream)", cursor: "pointer", verticalAlign: "middle" }}><LocationIcon /> Location now</button>
            </div>
            
            <div className="rn-search-container" ref={searchRef}>
              <div className="rn-search-box">
                 <SearchIcon />
                 <input 
                   className="rn-search-input" 
                   placeholder="Search global cities..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
                 {isSearching && <span className="rn-search-spinner" />}
              </div>
              {searchResults.length > 0 && (
                 <div className="rn-search-dropdown">
                   {searchResults.map(city => (
                      <div className="rn-search-item" key={city.id} onClick={() => handleCitySelect(city)}>
                         <strong>{city.name}</strong>
                         <span className="rn-search-country">{city.admin1 ? city.admin1 + ", " : ""}{city.country}</span>
                      </div>
                   ))}
                 </div>
              )}
            </div>
          </div>
        </div>
        <div className="rn-clock">
          <span className="rn-live"><i /> LIVE</span>
          <div className="rn-time">{hh}<b className="rn-colon">:</b>{mm}</div>
          <div className="rn-date">{dow} {md}</div>
        </div>
      </header>

      {/* ---- weather LED strip ---- */}
      <section className="rn-weather">
        <div className="rn-weather-icon"><WeatherGlyph glyph={w.glyph} /></div>
        <div className="rn-weather-temp">
          {temp == null ? <span className="rn-flick">— —</span> : <>{temp}<span className="rn-unit">{unit}</span></>}
        </div>
        <div className="rn-weather-cond">
          <div className="rn-cond-label">{w.label.toUpperCase()}</div>
          <div className="rn-cond-note">Conditions on the platform right now</div>
        </div>
        {aqi !== null && (
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", borderLeft: "1px solid var(--line)", paddingLeft: "20px" }}>
            <div className="rn-cond-label" style={{ color: aqi <= 50 ? "#4ade80" : aqi <= 100 ? "#facc15" : aqi <= 150 ? "#fb923c" : "#ef4444" }}>AQI {aqi}</div>
            <div className="rn-cond-note">Air Quality Index</div>
          </div>
        )}
      </section>

      {/* ---- departures board: the picks ---- */}
      <section className="rn-section">
        <div className="rn-sec-head">
          <h2>Next Stop: Main Character Energy</h2>
          <button className="rn-refresh" onClick={refreshPicks} disabled={refreshing}>
            <RefreshIcon spin={refreshing} /> {refreshing ? "Reading the board" : "Refresh picks"}
          </button>
        </div>

        {throttle && (
          <div className="rn-throttle">
            <strong>Board's catching up.</strong> {throttle} The picks refresh a couple of times a minute — hang tight.
          </div>
        )}

        <div className="rn-board" role="table" aria-label="Recommended spots">
          <div className="rn-board-head" role="row">
            <span>Scene</span><span>Spot</span><span>Type</span><span>Why now</span>
          </div>
          {recs == null && !throttle && <CNTowerLoader city={activeCity.name} />}
          {recs && recs.length === 0 && !throttle && (
            <div className="rn-empty">No picks on the board yet. Hit refresh to pull the latest.</div>
          )}
          {recs && recs.map((r, i) => {
            const ts = typeStyle(r.Type);
            const matchedPlace = places?.find(p => (p?.placeName || p?.displayName?.text) === r.placeName);
            const phone = matchedPlace?.nationalPhoneNumber;
            const address = matchedPlace?.formattedAddress;
            const open = matchedPlace?.regularOpeningHours ? matchedPlace.regularOpeningHours.openNow : true;

            return (
              <div
                key={`${r.placeName}-${i}`}
                className={`rn-row ${revealed ? "rn-in" : ""}`}
                style={{ animationDelay: `${i * 70}ms` }}
                role="row"
              >
                <span className="rn-gate">{String(i + 1).padStart(2, "0")}</span>
                <span className="rn-spot" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                  {matchedPlace ? (
                    <a 
                      href={matchedPlace.location ? `https://www.google.com/maps/dir/?api=1&destination=${matchedPlace.location.latitude},${matchedPlace.location.longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || r.placeName + " " + activeCity.name)}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="rn-spot-link"
                      style={{ color: "var(--cream)", textDecoration: "none", transition: "color 0.15s", display: "flex", flexDirection: "column", gap: "2px" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--amber)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--cream)"}
                    >
                      <span style={{ fontWeight: "700" }}>{r.placeName}</span>
                      {address && <div style={{ fontSize: "12.5px", color: "var(--slate)", fontWeight: "400", lineHeight: "1.2" }}>{address}</div>}
                    </a>
                  ) : (
                    <>
                      <span>{r.placeName}</span>
                      {address && <div style={{ fontSize: "12.5px", color: "var(--slate)", fontWeight: "400", lineHeight: "1.2" }}>{address}</div>}
                    </>
                  )}
                  {phone ? (
                    <a className="rn-call" href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ marginTop: "2px", fontSize: "12px" }}>
                      <PhoneIcon /> {phone}
                    </a>
                  ) : (
                    <span className="rn-call" style={{ marginTop: "2px", fontSize: "12px", opacity: 0.5, cursor: "default", textDecoration: "none" }}>
                      <PhoneIcon /> They want YOU, not a call
                    </span>
                  )}
                </span>
                <span className="rn-typewrap" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                  <span className="rn-flap" style={{ ["--flap"]: ts.color }}>
                    <em>{ts.glyph}</em>{titleCase(r.Type)}
                  </span>
                  {matchedPlace && (
                    <span className={open ? "rn-tag-open" : "rn-tag-shut"} style={{ border: "none", background: "none", padding: "0" }}>
                       {open ? "Open now" : "Closed"}
                    </span>
                  )}
                </span>
                <span className="rn-why">{renderReason(r.reason)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- open now nearby ---- */}
      <section className="rn-section">
        <div className="rn-sec-head"><h2>Open now, nearby</h2></div>
        <div className="rn-places">
          {places == null && <div className="rn-empty">Checking who's open…</div>}
          {places && places.length === 0 && <div className="rn-empty">Nothing open within 1.5&nbsp;km right now.</div>}
          {places && places.map((p, i) => {
            const open = p?.regularOpeningHours ? p.regularOpeningHours.openNow : true;
            const phone = p?.nationalPhoneNumber;
            const name = p?.placeName || p?.displayName?.text || "Unnamed spot";
            const address = p?.formattedAddress || `Downtown ${activeCity.name}`;
            return (
              <div className="rn-place" key={i}>
                <a 
                  href={p.location ? `https://www.google.com/maps/dir/?api=1&destination=${p.location.latitude},${p.location.longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((p?.formattedAddress || p?.displayName?.text || "") + " " + activeCity.name)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div className="rn-place-top">
                    <span className={`rn-dot ${open ? "rn-dot-open" : "rn-dot-shut"}`} />
                    <span className="rn-place-name" style={{ transition: "color 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--amber)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--cream)"}>{name}</span>
                  </div>
                  <div className="rn-place-addr">{address}</div>
                </a>
                <div className="rn-place-foot">
                  <span className={open ? "rn-tag-open" : "rn-tag-shut"}>{open ? "Open now" : "Closed"}</span>
                  {phone ? <a className="rn-call" href={`tel:${phone.replace(/[^\d+]/g, "")}`}><PhoneIcon /> {phone}</a> : <span className="rn-call" style={{ opacity: 0.5, cursor: "default", textDecoration: "none" }}><PhoneIcon /> They want YOU, not a call</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- vibe checks ---- */}
      <VibeSection vibes={vibes} places={places} onSubmit={submitVibe} />

      <SkylineFooter city={activeCity.name} />
    </div>
  );
}

/* ------------------------------------------------------------ vibe module */

function VibeSection({ vibes, places, onSubmit }) {
  const [loc, setLoc] = useState("");
  const [text, setText] = useState("");
  const suggestions = (places || []).map((p) => p?.placeName || p?.displayName?.text).filter(Boolean).slice(0, 8);

  function send() {
    const location = loc.trim() || "Somewhere downtown";
    const vibe = text.trim();
    if (!vibe) return;
    onSubmit(location, vibe);
    setText("");
  }

  return (
    <section className="rn-section">
      <div className="rn-sec-head"><h2>On the street</h2></div>
      <div className="rn-vibe-grid">
        <div className="rn-vibe-form">
          <label className="rn-field-label">Where are you?</label>
          <input
            className="rn-input"
            list="rn-loc-list"
            placeholder="Spot name"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
          />
          <datalist id="rn-loc-list">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>

          <label className="rn-field-label">What's the vibe?</label>
          <div className="rn-chips">
            {VIBE_CHIPS.map((c) => (
              <button key={c} className="rn-chip" onClick={() => setText(c)}>{c}</button>
            ))}
          </div>
          <div className="rn-vibe-send">
            <input
              className="rn-input"
              placeholder="Say it in your own words"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="rn-post" onClick={send} disabled={!text.trim()}><SendIcon /> Post</button>
          </div>
        </div>

        <div className="rn-vibe-feed">
          {vibes == null && <div className="rn-empty">Loading the street…</div>}
          {vibes && vibes.length === 0 && <div className="rn-empty">Be the first to call the vibe.</div>}
          {vibes && vibes.map((v, i) => (
            <div className="rn-vibe-item" key={i}>
              <div className="rn-vibe-head">
                <span className="rn-vibe-loc">{v.locationName}</span>
                <span className="rn-vibe-time">{timeAgo(v.timestamp)}</span>
              </div>
              <div className="rn-vibe-text">{v.vibe}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- SVG marks */

function CNTower() {
  return (
    <svg className="rn-cn" viewBox="0 0 44 130" width="30" height="88" aria-hidden="true">
      <rect x="21" y="2" width="2" height="26" rx="1" />
      <ellipse cx="22" cy="36" rx="11" ry="6.5" />
      <ellipse cx="22" cy="50" rx="5.5" ry="3" />
      <polygon points="19.4,42 24.6,42 27.5,128 16.5,128" />
    </svg>
  );
}

function SkylineFooter({ city }) {
  return (
    <footer className="rn-footer">
      <svg className="rn-skyline" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <g>
          <rect x="40" y="70" width="46" height="50" />
          <rect x="96" y="52" width="34" height="68" />
          <rect x="140" y="80" width="40" height="40" />
          <rect x="470" y="44" width="30" height="76" />
          <rect x="508" y="60" width="42" height="60" />
          <rect x="560" y="30" width="26" height="90" />
          {/* CN tower centrepiece */}
          <rect x="628" y="8" width="4" height="34" />
          <ellipse cx="630" cy="46" rx="15" ry="7" />
          <polygon points="626,52 634,52 638,120 622,120" />
          <rect x="690" y="56" width="38" height="64" />
          <rect x="736" y="40" width="28" height="80" />
          <rect x="1010" y="66" width="44" height="54" />
          <rect x="1062" y="48" width="32" height="72" />
          <rect x="1102" y="78" width="40" height="42" />
        </g>
      </svg>
      <div className="rn-footer-line">
        <span>RightNowTO</span>
        <span>Live from downtown {city || "Toronto"}</span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------- UI icons */

function RefreshIcon({ spin }) {
  return (
    <svg className={spin ? "rn-spin" : ""} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#5C6E86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BoardSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div className="rn-row rn-row-skel" key={i}>
          <span className="rn-gate">—</span>
          <span className="rn-sk rn-sk-lg" />
          <span className="rn-sk rn-sk-md" />
          <span className="rn-sk rn-sk-xl" />
        </div>
      ))}
    </>
  );
}

function CNTowerLoader({ city }) {
  return (
    <div className="rn-cn-loader">
       <div className="rn-cn-pulse-container">
          <CNTower />
          <div className="rn-cn-beacon" />
          <div className="rn-cn-radar" />
       </div>
       <div className="rn-cn-text">Scanning downtown {city || "Toronto"}...</div>
    </div>
  );
}

/* ------------------------------------------------------------------ CSS */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700;800&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap');

.rn-root{
  --navy:#0C1A2B; --navy-2:#12263D; --panel:#16304C; --panel-2:#1B3958;
  --red:#DA291C; --amber:#F5B841; --cream:#ECE7DC; --ink:#0A121E; --slate:#8394AB;
  --line:rgba(255,255,255,.08);
  position:relative; min-height:100%; overflow:hidden;
  background:var(--navy); color:var(--cream);
  font-family:'Inter',system-ui,sans-serif;
  padding:clamp(16px,3vw,34px);
  border-radius:14px;
}
.rn-glow{
  position:absolute; inset:-30% -10% auto -10%; height:60%;
  background:radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--mood) 42%, transparent), transparent 70%);
  pointer-events:none; z-index:0; transition:background .8s ease;
}
.rn-root > *{ position:relative; z-index:1; }

/* header */
.rn-header{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px;
  padding-bottom:18px; border-bottom:1px solid var(--line); flex-wrap:wrap; z-index: 10; }
.rn-brand{ display:flex; align-items:center; gap:14px; }
.rn-cn{ fill:var(--red); filter:drop-shadow(0 0 10px rgba(218,41,28,.35)); flex:none; }
.rn-word{ font-family:'Barlow Semi Condensed',sans-serif; font-weight:800; font-size:clamp(26px,5vw,40px);
  letter-spacing:.5px; line-height:.9; color:var(--cream); }
.rn-word-to{ color:var(--red); }
.rn-sub{ font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--slate); margin-top:5px; }
.rn-clock{ text-align:right; font-family:'Space Mono',monospace; }

/* search */
.rn-search-container { position:relative; margin-top: 10px; z-index: 10; width: 100%; max-width: 300px; }
.rn-search-box { display:flex; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:6px 10px; gap:8px; transition:border-color 0.2s; }
.rn-search-box:focus-within { border-color:var(--amber); }
.rn-search-input { background:transparent; border:none; outline:none; color:var(--cream); font-family:'Inter',sans-serif; font-size:13px; width:100%; }
.rn-search-input::placeholder { color:#5C6E86; }
.rn-search-spinner { width:12px; height:12px; border:2px solid rgba(255,255,255,0.2); border-top-color:var(--amber); border-radius:50%; animation:rn-spin 1s linear infinite; }
.rn-search-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--panel-2); border:1px solid var(--line); border-radius:8px; overflow:hidden; box-shadow:0 8px 16px rgba(0,0,0,0.3); }
.rn-search-item { padding:10px 12px; cursor:pointer; display:flex; flex-direction:column; gap:2px; border-bottom:1px solid var(--line); }
.rn-search-item:last-child { border-bottom:none; }
.rn-search-item:hover { background:rgba(255,255,255,0.05); }
.rn-search-item strong { font-size:13px; color:var(--cream); }
.rn-search-country { font-size:11px; color:var(--slate); }

.rn-live{ display:inline-flex; align-items:center; gap:6px; font-size:11px; letter-spacing:.16em;
  color:var(--amber); background:rgba(245,184,65,.1); border:1px solid rgba(245,184,65,.3);
  padding:3px 8px; border-radius:4px; }
.rn-live i{ width:7px; height:7px; border-radius:50%; background:var(--amber); box-shadow:0 0 8px var(--amber);
  animation:rn-pulse 1.6s ease-in-out infinite; }
.rn-live-demo{ color:var(--slate); background:rgba(131,148,171,.12); border-color:rgba(131,148,171,.3); }
.rn-live-demo i{ background:var(--slate); box-shadow:none; }
.rn-time{ font-size:clamp(30px,6vw,46px); font-weight:700; line-height:1; margin-top:6px; color:var(--amber);
  text-shadow:0 0 18px rgba(245,184,65,.25); }
.rn-colon{ animation:rn-blink 1s step-end infinite; }
.rn-date{ font-size:12px; letter-spacing:.18em; color:var(--slate); margin-top:2px; }

/* weather strip */
.rn-weather{ display:flex; align-items:center; gap:clamp(14px,3vw,26px); margin-top:20px;
  background:linear-gradient(180deg,var(--panel),var(--navy-2)); border:1px solid var(--line);
  border-radius:12px; padding:clamp(16px,2.4vw,22px) clamp(18px,3vw,26px); }
.rn-weather-icon{ color:var(--amber); flex:none; }
.rn-weather-icon svg{ width:clamp(34px,6vw,46px); height:clamp(34px,6vw,46px); }
.rn-weather-temp{ font-family:'Space Mono',monospace; font-weight:700; font-size:clamp(38px,8vw,60px);
  line-height:1; color:var(--cream); }
.rn-unit{ font-size:.42em; color:var(--slate); margin-left:4px; vertical-align:super; }
.rn-flick{ color:var(--slate); animation:rn-blink 1.4s step-end infinite; }
.rn-weather-cond{ border-left:1px solid var(--line); padding-left:clamp(14px,3vw,26px); }
.rn-cond-label{ font-family:'Barlow Semi Condensed',sans-serif; font-weight:700; font-size:clamp(20px,3.4vw,28px);
  letter-spacing:.03em; color:var(--amber); }
.rn-cond-note{ font-size:12px; color:var(--slate); margin-top:3px; }

/* sections */
.rn-section{ margin-top:34px; }
.rn-sec-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:12px; flex-wrap:wrap; }
.rn-sec-head h2{ font-family:'Barlow Semi Condensed',sans-serif; font-weight:700; font-size:clamp(19px,3vw,26px);
  letter-spacing:.05em; text-transform:uppercase; margin:0; color:var(--cream); }
.rn-sec-head h2::before{ content:""; display:inline-block; width:16px; height:3px; background:var(--red);
  vertical-align:middle; margin-right:10px; border-radius:2px; }

.rn-refresh{ display:inline-flex; align-items:center; gap:7px; font-family:'Space Mono',monospace;
  font-size:12px; letter-spacing:.06em; color:var(--cream); background:var(--panel);
  border:1px solid var(--line); border-radius:7px; padding:8px 12px; cursor:pointer; transition:.18s; }
.rn-refresh:hover:not(:disabled){ background:var(--panel-2); border-color:rgba(245,184,65,.4); color:var(--amber); }
.rn-refresh:disabled{ opacity:.6; cursor:progress; }
.rn-spin{ animation:rn-spin 1s linear infinite; }

.rn-throttle{ background:rgba(245,184,65,.09); border:1px solid rgba(245,184,65,.28);
  border-radius:10px; padding:12px 16px; margin-bottom:14px; font-size:14px; color:#F3D79A; }
.rn-throttle strong{ color:var(--amber); }

/* departures board */
.rn-board{ border:1px solid var(--line); border-radius:12px; overflow:hidden;
  background:linear-gradient(180deg,var(--navy-2),var(--navy)); }
.rn-board-head, .rn-row{ display:grid; grid-template-columns:58px 1.5fr minmax(150px, max-content) 2fr; align-items:center;
  gap:14px; padding:13px clamp(14px,2vw,20px); }
.rn-board-head{ font-family:'Space Mono',monospace; font-weight:700; font-size:13px; letter-spacing:.14em; text-transform:uppercase;
  color:var(--cream); background:rgba(0,0,0,.35); border-bottom:1px solid var(--line); }
.rn-row{ border-bottom:1px solid var(--line); transition:background .18s; }
.rn-row:last-child{ border-bottom:none; }
.rn-row:hover{ background:rgba(245,184,65,.05); }
.rn-in{ animation:rn-flip .5s cubic-bezier(.2,.7,.2,1) both; transform-origin:top center; }
.rn-gate{ font-family:'Space Mono',monospace; font-weight:700; font-size:19px; color:var(--amber); }
.rn-spot{ font-family:'Barlow Semi Condensed',sans-serif; font-weight:700; font-size:clamp(17px,2.2vw,21px);
  letter-spacing:.01em; color:var(--cream); }
.rn-typewrap{ display:flex; }
.rn-flap{ display:inline-flex; align-items:center; gap:6px; font-family:'Space Mono',monospace; font-weight:700;
  font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--cream);
  background:var(--ink); border:1px solid rgba(255,255,255,.1); border-radius:5px; padding:5px 9px;
  position:relative; box-shadow:inset 0 -6px 10px rgba(0,0,0,.3); white-space:nowrap; }
.rn-flap::after{ content:""; position:absolute; left:6px; right:6px; top:50%; height:1px;
  background:rgba(0,0,0,.55); }
.rn-flap em{ font-style:normal; }
.rn-flap{ border-left:3px solid var(--flap); }
.rn-why{ font-size:14px; color:#C4CEDC; line-height:1.4; }

.rn-empty{ padding:26px 20px; text-align:center; color:var(--slate); font-size:14px; }
.rn-row-skel{ animation:none; }
.rn-sk{ display:block; height:14px; border-radius:5px; background:linear-gradient(90deg,rgba(255,255,255,.06),rgba(255,255,255,.12),rgba(255,255,255,.06));
  background-size:200% 100%; animation:rn-shimmer 1.4s infinite; }
.rn-sk-lg{ width:70%; } .rn-sk-md{ width:80%; } .rn-sk-xl{ width:90%; }

/* places */
.rn-places{ display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
.rn-place{ background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:15px 16px; transition:.18s; }
.rn-place:hover{ border-color:rgba(245,184,65,.35); transform:translateY(-2px); }
.rn-place-top{ display:flex; align-items:center; gap:9px; }
.rn-dot{ width:9px; height:9px; border-radius:50%; flex:none; }
.rn-dot-open{ background:#5FBB6B; box-shadow:0 0 8px rgba(95,187,107,.6); }
.rn-dot-shut{ background:var(--slate); }
.rn-place-name{ font-family:'Barlow Semi Condensed',sans-serif; font-weight:700; font-size:17px; color:var(--cream); }
.rn-place-addr{ font-size:12.5px; color:var(--slate); margin:6px 0 12px; }
.rn-place-foot{ display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.rn-tag-open{ font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.05em; color:#7ED08A;
  background:rgba(95,187,107,.12); border:1px solid rgba(95,187,107,.3); padding:3px 8px; border-radius:5px; }
.rn-tag-shut{ font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.05em; color:var(--slate);
  background:rgba(131,148,171,.1); border:1px solid rgba(131,148,171,.25); padding:3px 8px; border-radius:5px; }
.rn-call{ display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace; font-size:12px;
  color:var(--amber); text-decoration:none; }
.rn-call:hover{ text-decoration:underline; }

/* vibes */
.rn-vibe-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.rn-vibe-form{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; }
.rn-field-label{ display:block; font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--slate); margin:0 0 8px; }
.rn-field-label:not(:first-child){ margin-top:16px; }
.rn-input{ width:100%; box-sizing:border-box; background:var(--navy); border:1px solid var(--line);
  border-radius:8px; padding:11px 13px; color:var(--cream); font-family:'Inter',sans-serif; font-size:14px; outline:none; transition:.18s; }
.rn-input:focus{ border-color:var(--amber); box-shadow:0 0 0 3px rgba(245,184,65,.15); }
.rn-input::placeholder{ color:#5C6E86; }
.rn-chips{ display:flex; flex-wrap:wrap; gap:7px; }
.rn-chip{ font-size:13px; color:var(--cream); background:var(--navy); border:1px solid var(--line);
  border-radius:20px; padding:6px 12px; cursor:pointer; transition:.15s; }
.rn-chip:hover{ border-color:var(--amber); color:var(--amber); }
.rn-vibe-send{ display:flex; gap:8px; margin-top:14px; }
.rn-vibe-send .rn-input{ flex:1; }
.rn-post{ display:inline-flex; align-items:center; gap:6px; font-weight:600; font-size:14px; color:#fff;
  background:var(--red); border:none; border-radius:8px; padding:0 16px; cursor:pointer; transition:.15s; white-space:nowrap; }
.rn-post:hover:not(:disabled){ background:#EF3A2D; }
.rn-post:disabled{ opacity:.45; cursor:not-allowed; }
.rn-vibe-feed{ display:flex; flex-direction:column; gap:10px; max-height:340px; overflow:auto; padding-right:4px; }
.rn-vibe-item{ background:var(--panel); border:1px solid var(--line); border-left:3px solid var(--red);
  border-radius:9px; padding:12px 14px; }
.rn-vibe-head{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
.rn-vibe-loc{ font-family:'Barlow Semi Condensed',sans-serif; font-weight:700; font-size:15px; color:var(--cream); }
.rn-vibe-time{ font-family:'Space Mono',monospace; font-size:11px; color:var(--slate); white-space:nowrap; }
.rn-vibe-text{ font-size:14px; color:#C4CEDC; margin-top:5px; }

/* footer */
.rn-footer{ margin-top:40px; }
.rn-skyline{ display:block; width:100%; height:70px; fill:rgba(255,255,255,.07); }
.rn-footer-line{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
  border-top:1px solid var(--line); padding-top:14px; font-family:'Space Mono',monospace; font-size:11px;
  letter-spacing:.08em; color:var(--slate); text-transform:uppercase; }

/* animations */
@keyframes rn-pulse{ 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:.35; transform:scale(.8);} }
@keyframes rn-blink{ 50%{ opacity:.25; } }
@keyframes rn-spin{ to{ transform:rotate(360deg); } }
@keyframes rn-flip{ from{ transform:rotateX(-88deg); opacity:0; } to{ transform:rotateX(0); opacity:1; } }
@keyframes rn-shimmer{ to{ background-position:-200% 0; } }
@keyframes rn-beacon {
  0%, 100% { opacity: 0.2; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.5); }
}
@keyframes rn-radar {
  0% { transform: translateX(-50%) translateY(-50%) scale(0); opacity: 1; border-color: rgba(245, 184, 65, 0.8); }
  100% { transform: translateX(-50%) translateY(-50%) scale(1.2); opacity: 0; border-color: rgba(245, 184, 65, 0); }
}

.rn-cn-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 20px; color: var(--slate); }
.rn-cn-pulse-container { position: relative; width: 30px; height: 88px; }
.rn-cn-beacon { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background: var(--red); box-shadow: 0 0 12px 3px var(--red); animation: rn-beacon 1s ease-in-out infinite; }
.rn-cn-radar { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(245, 184, 65, 0.5); animation: rn-radar 2s cubic-bezier(0.1, 0.7, 0.1, 1) infinite; }
.rn-cn-text { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; animation: rn-blink 1.5s step-end infinite; }

/* responsive */
@media (max-width:760px){
  .rn-vibe-grid{ grid-template-columns:1fr; }
  .rn-board-head{ display:none; }
  .rn-row{ grid-template-columns:auto 1fr; grid-template-areas:"gate spot" "type type" "why why";
    gap:8px 12px; padding:14px 16px; }
  .rn-gate{ grid-area:gate; } .rn-spot{ grid-area:spot; }
  .rn-typewrap{ grid-area:type; } .rn-why{ grid-area:why; }
  .rn-weather{ flex-wrap:wrap; }
  .rn-weather-cond{ border-left:none; padding-left:0; border-top:1px solid var(--line); padding-top:12px; width:100%; }
}
@media (prefers-reduced-motion:reduce){
  .rn-in, .rn-spin, .rn-live i, .rn-colon, .rn-flick, .rn-sk{ animation:none !important; }
}
`;
