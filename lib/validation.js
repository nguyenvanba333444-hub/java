function clean(value) {
  return String(value ?? '').trim();
}

function roomInput(body = {}) {
  const coordinate = key => body[key] === undefined || body[key] === null || clean(body[key]) === '' ? null : Number(body[key]);
  return {
    title: clean(body.title),
    address: clean(body.address),
    district: clean(body.district),
    city: clean(body.city),
    price: Number(body.price),
    area: Number(body.area),
    description: clean(body.description),
    latitude: coordinate('latitude'),
    longitude: coordinate('longitude')
  };
}

function validRoomInput(data) {
  if (!data || typeof data !== 'object') return false;
  return Boolean(data.title && data.title.length <= 255 && data.city && data.city.length <= 120 && data.district && data.district.length <= 120 && data.address && data.address.length <= 255 &&
    Number.isFinite(data.price) && data.price > 0 && data.price <= 1_000_000_000_000 && Number.isFinite(data.area) && data.area > 0 && data.area <= 1_000_000 && Buffer.byteLength(data.description || '', 'utf8') <= 65535 &&
    ((data.latitude === null && data.longitude === null) || (Number.isFinite(data.latitude) && Number.isFinite(data.longitude) && Math.abs(data.latitude) <= 90 && Math.abs(data.longitude) <= 180)));
}

function validBookingDates(start, end, today = new Date().toISOString().slice(0, 10)) {
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  return validDate(start) && validDate(end) && validDate(today) && start >= today && end >= start;
}

module.exports = { roomInput, validRoomInput, validBookingDates };
