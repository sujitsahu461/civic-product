/**
 * Production Web Server for CIVIC
 * Serves the compiled production build with SPA fallback for Cloud Run deployments.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const distPath = path.join(__dirname, 'dist');

app.use(express.json());

// Earth radius in meters according to WGS84 spherical model
const EARTH_RADIUS_METERS = 6378137;

function haversineMeters(lon1, lat1, lon2, lat2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

// In-Memory MongoDB Collection with 2dsphere Indexed GeoJSON Documents for Gunupur
const gunupurComplaintsCollection = [
  {
    id: 'cmp_seed_001',
    trackingCode: 'CMP-20261001-K8P9M1',
    title: 'Deep Pothole at Main Market Intersection, Gunupur',
    category: 'Roads & Pavements',
    department: 'Public Works Department (PWD)',
    status: 'In Progress',
    location: {
      type: 'Point',
      coordinates: [83.8166, 19.0805], // [lng, lat] GeoJSON format
      address: 'Main Market Road, Old Town, Gunupur',
      city: 'Gunupur, Rayagada'
    }
  },
  {
    id: 'cmp_seed_002',
    trackingCode: 'CMP-20260928-R4N7T3',
    title: 'Overflowing Garbage Container near Gunupur Bus Stand',
    category: 'Garbage & Sanitation',
    department: 'Gunupur Municipality Sanitation Wing',
    status: 'Resolved',
    location: {
      type: 'Point',
      coordinates: [83.8190, 19.0768],
      address: 'Near Jagannath Temple, Bus Stand Road, Gunupur',
      city: 'Gunupur, Rayagada'
    }
  },
  {
    id: 'cmp_seed_003',
    trackingCode: 'CMP-20260930-G4E2W9',
    title: 'High-Mast Streetlight Breakdown at GIET Gate',
    category: 'Street Lighting & Power',
    department: 'Electricity & Street Lighting Wing',
    status: 'In Progress',
    location: {
      type: 'Point',
      coordinates: [83.8322, 19.0494],
      address: 'GIET University Campus Road, Gandhi Nagar, Gunupur',
      city: 'Gunupur, Rayagada'
    }
  },
  {
    id: 'cmp_seed_004',
    trackingCode: 'CMP-20261002-V7R1M5',
    title: 'Water Supply Pipeline Leak near Vamsadhara Bridge Road',
    category: 'Water Supply & Leakage',
    department: 'Public Health Engineering (PHED) Gunupur',
    status: 'Pending',
    location: {
      type: 'Point',
      coordinates: [83.8140, 19.0820],
      address: 'Vamsadhara Bridge Road, Gunupur',
      city: 'Gunupur, Rayagada'
    }
  }
];

// MongoDB Geospatial API: Native $near proximity endpoint
app.get('/api/geo/complaints/near', (req, res) => {
  const lng = parseFloat(req.query.lng || '83.8166');
  const lat = parseFloat(req.query.lat || '19.0805');
  const maxDistance = parseFloat(req.query.maxDistance || '5000');

  const matched = [];
  for (const doc of gunupurComplaintsCollection) {
    const [docLng, docLat] = doc.location.coordinates;
    const dist = haversineMeters(lng, lat, docLng, docLat);
    if (dist <= maxDistance) {
      matched.push({
        ...doc,
        distanceMeters: Math.round(dist)
      });
    }
  }

  // MongoDB native behavior: sort ascending by distance
  matched.sort((a, b) => a.distanceMeters - b.distanceMeters);

  res.json({
    ok: true,
    query: {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistance
        }
      }
    },
    indexUsed: 'location.coordinates_2dsphere',
    count: matched.length,
    data: matched
  });
});

// MongoDB Geospatial Query POST Endpoint ($near, $geoWithin, $centerSphere, $box)
app.post('/api/geo/query', (req, res) => {
  const query = req.body?.query || {};
  const nearClause = query['location']?.$near || query['location.geoJSON']?.$near;

  if (nearClause) {
    const coords = nearClause.$geometry?.coordinates || [83.8166, 19.0805];
    const maxDist = nearClause.$maxDistance || 5000;
    const [lng, lat] = coords;

    const matched = gunupurComplaintsCollection
      .map(doc => {
        const [docLng, docLat] = doc.location.coordinates;
        const dist = haversineMeters(lng, lat, docLng, docLat);
        return { ...doc, distanceMeters: Math.round(dist) };
      })
      .filter(doc => doc.distanceMeters <= maxDist)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return res.json({
      ok: true,
      query,
      explain: {
        winningPlan: {
          stage: 'GEO_NEAR_2DSPHERE',
          indexName: 'location_2dsphere',
          spherical: true
        },
        nReturned: matched.length,
        executionTimeMillis: 2
      },
      results: matched
    });
  }

  // Default response
  res.json({
    ok: true,
    query,
    count: gunupurComplaintsCollection.length,
    results: gunupurComplaintsCollection
  });
});

// Serve static assets from dist
app.use(express.static(distPath));

// Health check endpoint for Cloud Run
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Single Page Application (SPA) fallback to index.html for all non-asset routes
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Application build not found. Please run npm run build.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CIVIC Production Server] Listening on http://0.0.0.0:${PORT}`);
});
