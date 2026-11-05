const test = require('node:test');
const assert = require('node:assert/strict');
const { roomInput, validRoomInput, validBookingDates } = require('../lib/validation');

const validRoom = () => roomInput({
  title: 'Phòng có gác', address: '12 Đường Mẫu', district: 'Phường 1', city: 'Hồ Chí Minh',
  price: '4500000', area: '24', description: 'Có cửa sổ', latitude: '10.77', longitude: '106.69'
});

test('accepts a complete room and parses coordinates', () => {
  const room = validRoom();
  assert.equal(validRoomInput(room), true);
  assert.equal(room.price, 4500000);
  assert.equal(room.latitude, 10.77);
});

test('rejects invalid price, location pair, and out-of-range coordinates', () => {
  assert.equal(validRoomInput({ ...validRoom(), price: 0 }), false);
  assert.equal(validRoomInput({ ...validRoom(), longitude: null }), false);
  assert.equal(validRoomInput({ ...validRoom(), latitude: 91 }), false);
});

test('accepts valid booking dates and rejects impossible or reversed dates', () => {
  assert.equal(validBookingDates('2026-12-01', '2026-12-03', '2026-11-01'), true);
  assert.equal(validBookingDates('2026-02-30', '2026-03-03', '2026-01-01'), false);
  assert.equal(validBookingDates('2026-12-03', '2026-12-01', '2026-11-01'), false);
  assert.equal(validBookingDates('2026-10-31', '2026-11-02', '2026-11-01'), false);
});
