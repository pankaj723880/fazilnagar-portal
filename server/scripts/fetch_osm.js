import https from 'node:https';

const query = `[out:json][timeout:25];(
  node["amenity"~"school|college|hospital|clinic|fuel"](26.65,84.02,26.72,84.08);
  way["amenity"~"school|college|hospital|clinic|fuel"](26.65,84.02,26.72,84.08);
);out center;`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
https.get(url, { headers: { 'User-Agent': 'FazilnagarPortal/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total elements found:', json.elements.length);
      json.elements.forEach(e => {
        const lat = e.lat || e.center?.lat;
        const lon = e.lon || e.center?.lon;
        console.log({
          id: e.id,
          name: e.tags?.name || e.tags?.['name:en'] || '(no name)',
          amenity: e.tags?.amenity,
          brand: e.tags?.brand,
          operator: e.tags?.operator,
          lat,
          lon
        });
      });
    } catch(err) {
      console.error('Parse err:', err, data.slice(0, 200));
    }
  });
}).on('error', err => console.error(err));
