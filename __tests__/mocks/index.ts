/**
 * Mock Data
 *
 * Shared mock data used across unit and integration tests.
 * Add mock laws, penalties, zones, chat messages, etc. here.
 */

export const mockLocation = {
  latitude: 11.0168,
  longitude: 76.9558,
  altitude: 411,
  accuracy: 10,
  speed: 0,
  heading: 42,
};

export const mockGeoInfo = {
  city: 'Coimbatore',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  stateCode: 'TN',
  country: 'India',
};

export const mockChatMessage = {
  id: 'test-msg-1',
  text: 'What is the speed limit in Tamil Nadu?',
  sender: 'user' as const,
  timestamp: Date.now(),
};
