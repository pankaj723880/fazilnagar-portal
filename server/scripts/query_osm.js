import https from 'node:https';

const query = `[out:json][timeout:30];
(
  node(26.65,84.02,26.72,84.08)["amenity"];
  way(26.65,84.02,26.72,84.08)["amenity"];
);
out center tags;`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

https.get(url, { headers: { 'User-Agent': 'FazilnagarPortalVerifier/1.0' } }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Total amenities found:', data.elements.length);
      data.elements.forEach(el => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        console.log(`[${el.tags.amenity}] ${el.tags.name || 'unnamed'} -> lat: ${lat}, lng: ${lon}`);
      });
    } catch (e) {
      console.error('Failed to parse:', body.slice(0, 300));
    }
  });
}).on('error', err => console.error('Request error:', err.message));
