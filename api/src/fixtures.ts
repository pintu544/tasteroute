import type { QlooEntity, QlooPlace } from './qloo.js';

/**
 * Realistic canned taste-graph data for building before the Qloo API key arrives.
 * Shapes mirror the documented Qloo responses (hackathon.api.qloo.com).
 */

export const FIXTURE_ENTITIES: QlooEntity[] = [
  // Music
  { id: 'ent-artist-miles', name: 'Miles Davis', type: 'urn:entity:artist' },
  { id: 'ent-artist-coltrane', name: 'John Coltrane', type: 'urn:entity:artist' },
  { id: 'ent-genre-bossa', name: 'Bossa Nova', type: 'urn:entity:genre' },
  { id: 'ent-artist-ella', name: 'Ella Fitzgerald', type: 'urn:entity:artist' },
  // Film
  { id: 'ent-director-wes', name: 'Wes Anderson', type: 'urn:entity:director' },
  { id: 'ent-movie-darjeeling', name: 'The Darjeeling Limited', type: 'urn:entity:movie' },
  // Food
  { id: 'ent-cuisine-sushi', name: 'Sushi', type: 'urn:entity:cuisine' },
  { id: 'ent-cuisine-italian', name: 'Italian', type: 'urn:entity:cuisine' },
  { id: 'ent-cuisine-mexican', name: 'Mexican', type: 'urn:entity:cuisine' },
  // Drink / lifestyle
  { id: 'ent-drink-cocktail', name: 'Craft Cocktails', type: 'urn:entity:interest' },
  { id: 'ent-brand-vinyl', name: 'Vinyl Records', type: 'urn:entity:interest' },
];

export const FIXTURE_PLACES: QlooPlace[] = [
  {
    id: 'plc-jazz-den',
    name: 'The Jazz Den',
    lat: 19.0596,
    lng: 72.8295,
    affinity: 0.94,
    tags: ['jazz', 'live music', 'cocktails', 'date night'],
    address: 'Waterfield Road, Bandra West, Mumbai',
  },
  {
    id: 'plc-blue-note',
    name: 'Blue Note Supper Club',
    lat: 19.0612,
    lng: 72.8277,
    affinity: 0.9,
    tags: ['jazz', 'supper club', 'live music'],
    address: 'Linking Road, Bandra West, Mumbai',
  },
  {
    id: 'plc-omakase',
    name: 'Omakase Room',
    lat: 19.0589,
    lng: 72.8288,
    affinity: 0.91,
    tags: ['sushi', 'omakase', 'date night', 'quiet'],
    address: 'Pali Hill, Bandra West, Mumbai',
  },
  {
    id: 'plc-quirky-cafe',
    name: 'The Grand Budapest Café',
    lat: 19.0601,
    lng: 72.8301,
    affinity: 0.88,
    tags: ['quirky', 'desserts', 'film posters', 'instagrammable'],
    address: 'Carter Road, Bandra West, Mumbai',
  },
  {
    id: 'plc-rooftop',
    name: 'Aer Rooftop Bar',
    lat: 19.0625,
    lng: 72.8268,
    affinity: 0.85,
    tags: ['rooftop', 'cocktails', 'sunset', 'groups'],
    address: 'Linking Road, Bandra West, Mumbai',
  },
  {
    id: 'plc-trattoria',
    name: 'Trattoria Nonna',
    lat: 19.0578,
    lng: 72.8312,
    affinity: 0.83,
    tags: ['italian', 'pasta', 'cozy', 'date night'],
    address: 'Waroda Road, Bandra West, Mumbai',
  },
  {
    id: 'plc-vinyl-bar',
    name: 'Spin & Sip Vinyl Bar',
    lat: 19.0608,
    lng: 72.829,
    affinity: 0.87,
    tags: ['vinyl', 'craft cocktails', 'listening bar'],
    address: 'Pali Naka, Bandra West, Mumbai',
  },
  {
    id: 'plc-taqueria',
    name: 'La Taqueria Bandra',
    lat: 19.059,
    lng: 72.8305,
    affinity: 0.78,
    tags: ['mexican', 'tacos', 'casual', 'groups'],
    address: 'Chapel Road, Bandra West, Mumbai',
  },
];

/** Documented Qloo /search response shape (for contract tests). */
export const DOCUMENTED_SEARCH_RESPONSE = {
  results: [
    { id: 'e1', name: 'Miles Davis', type: 'urn:entity:artist' },
    { id: 'e2', name: 'Kind of Blue', type: 'urn:entity:album' },
  ],
};

/** Documented Qloo /v2/insights response shape (for contract tests). */
export const DOCUMENTED_INSIGHTS_RESPONSE = {
  results: [
    {
      id: 'p1',
      name: 'The Jazz Den',
      location: { lat: 19.0596, lng: 72.8295, address: 'Bandra West, Mumbai' },
      affinity: 0.94,
      tags: [{ name: 'jazz' }, { name: 'live music' }],
    },
    {
      entity_id: 'p2',
      name: 'Omakase Room',
      geocode: { lat: 19.0589, lng: 72.8288 },
      affinity: 0.91,
      tags: ['sushi', 'omakase'],
    },
  ],
};
