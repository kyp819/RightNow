const BASE_URL = '/api';

/**
 * Custom fetch wrapper to handle errors consistently
 */
async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export const api = {
  /**
   * Fetch current weather in Toronto
   */
  async getWeather() {
    try {
      return await fetchJson('/weather');
    } catch (e) {
      return null;
    }
  },

  /**
   * Fetch nearby cafe places
   */
  async getPlaces() {
    try {
      const data = await fetchJson('/places');
      return data.places || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetch current recommendations from Gemini AI
   */
  async getRecommendations() {
    return await fetchJson('/recommendations');
  },

  /**
   * Fetch recent vibe checks
   */
  async getVibeChecks() {
    try {
      return await fetchJson('/vibe-checks');
    } catch (e) {
      return [];
    }
  },

  /**
   * Submit a new vibe check.
   * Sends both isVeganFriendly and veganFriendly to guarantee backend mapping.
   */
  async submitVibeCheck(placeName, status, isVeganFriendly) {
    return await fetchJson('/vibe-check', {
      method: 'POST',
      body: JSON.stringify({
        placeId: placeName, // Backend uses placeId for matching placeName
        status: status,     // "Busy" | "Chill" | "Empty"
        veganFriendly: isVeganFriendly,
        isVeganFriendly: isVeganFriendly
      }),
    });
  }
};
