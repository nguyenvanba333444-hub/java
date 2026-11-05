const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pool, initializeDatabase, ensureAppSessionTable } = require('./db');
const { roomInput, validRoomInput, validBookingDates } = require('./lib/validation');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET phải được cấu hình với ít nhất 32 ký tự khi chạy production.');
}
class MySQLSessionStore extends session.Store {
  constructor() { super(); this.writes = 0; }
  async ensureTable() {
    try { await ensureAppSessionTable(); }
    catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
    }
  }
  get(id, callback) {
    this.ensureTable().then(() => pool.query('SELECT session_data,expires_at FROM app_session WHERE session_id=?', [id])).then(async ([rows]) => {
      const record = rows[0];
      if (!record) return null;
      if (Number(record.expires_at) <= Date.now()) {
        await pool.query('DELETE FROM app_session WHERE session_id=?', [id]);
        return null;
      }
      return JSON.parse(record.session_data);
    }).then(value => callback(null, value)).catch(callback);
  }
  set(id, value, callback = () => {}) {
    const expiresAt = value.cookie?.expires ? Date.parse(value.cookie.expires) : Date.now() + 8 * 60 * 60 * 1000;
    this.ensureTable().then(() => pool.query('INSERT INTO app_session(session_id,session_data,expires_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE session_data=VALUES(session_data),expires_at=VALUES(expires_at)', [id, JSON.stringify(value), expiresAt]))
      .then(async () => { if (++this.writes % 100 === 0) await pool.query('DELETE FROM app_session WHERE expires_at<=?', [Date.now()]); })
      .then(() => callback()).catch(callback);
  }
  touch(id, value, callback = () => {}) {
    const expiresAt = value.cookie?.expires ? Date.parse(value.cookie.expires) : Date.now() + 8 * 60 * 60 * 1000;
    this.ensureTable().then(() => pool.query('UPDATE app_session SET expires_at=? WHERE session_id=?', [expiresAt, id])).then(() => callback()).catch(callback);
  }
  destroy(id, callback = () => {}) {
    this.ensureTable().then(() => pool.query('DELETE FROM app_session WHERE session_id=?', [id])).then(() => callback()).catch(callback);
  }
}
const uploadDir = path.join(__dirname, 'uploads', 'rooms');
fs.mkdirSync(uploadDir, { recursive: true });
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  name: 'trotot.sid',
  secret: process.env.SESSION_SECRET || 'local-development-change-this-secret',
  store: new MySQLSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 8 * 60 * 60 * 1000 }
}));
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const source = req.get('origin') || req.get('referer');
    if (source) {
      try {
        if (new URL(source).host !== req.get('host')) return res.status(403).json({ message: 'Yêu cầu từ nguồn không hợp lệ.' });
      } catch { return res.status(403).json({ message: 'Nguồn yêu cầu không hợp lệ.' }); }
    }
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ message: 'Yêu cầu từ nguồn không hợp lệ.' });
  }
  next();
});
const authAttempts = new Map();
function limitAuthAttempts(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip}`;
    const now = Date.now();
    let bucket = authAttempts.get(key);
    if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    authAttempts.set(key, bucket);
    if (authAttempts.size > 5000) for (const [id, value] of authAttempts) if (now >= value.resetAt) authAttempts.delete(id);
    if (bucket.count > max) return res.status(429).send('Bạn thử quá nhiều lần. Vui lòng đợi rồi thử lại.');
    next();
  };
}
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.oauthAvailable = { google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) };
  res.locals.tawkEnabled = Boolean(process.env.TAWKTO_PROPERTY_ID && process.env.TAWKTO_WIDGET_ID);
  res.locals.googleMapsEmbedApiKey = process.env.GOOGLE_MAPS_EMBED_API_KEY || '';
  res.locals.tawkProperty = (process.env.TAWKTO_PROPERTY_ID || '').replace(/[^a-zA-Z0-9]/g, '');
  res.locals.tawkWidget = (process.env.TAWKTO_WIDGET_ID || '').replace(/[^a-zA-Z0-9]/g, '');
  res.locals.bankTransferEnabled = Boolean(process.env.PAYMENT_BANK_ID && process.env.PAYMENT_ACCOUNT_NO && process.env.PAYMENT_ACCOUNT_NAME);
  next();
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
    const extension = extensions[file.mimetype] || (file.originalname.toLowerCase().endsWith('.avif') ? '.avif' : '.bin');
    cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${extension}`);
  }
});
const roomUpload = multer({
  storage,
  limits: { files: 10, fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.avif')) file.mimetype = 'image/avif';
    cb(null, ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype));
  }
});
const roomUploadFields = [{ name: 'imageFiles', maxCount: 8 }, { name: 'videoFiles', maxCount: 2 }];
const apiRoomUpload = (req, res, next) => roomUpload.fields(roomUploadFields)(req, res, error => {
  if (!error) return next();
  const message = error.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 5 MB và video tối đa 60 MB.' : error.code === 'LIMIT_FILE_COUNT' ? 'Mỗi tin tối đa 8 ảnh và 2 video.' : 'Tệp tải lên không đúng định dạng được hỗ trợ.';
  res.status(400).json({ message });
});
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const requireLogin = (req, res, next) => req.session.user ? next() : res.redirect('/login');
const requireApiLogin = (req, res, next) => req.session.user ? next() : res.status(401).json({ message: 'Vui lòng đăng nhập để dùng danh sách yêu thích.' });
const requireAdmin = (req, res, next) => req.session.user?.role === 'ADMIN' ? next() : res.status(403).render('message', { title: 'Không có quyền truy cập', message: 'Trang này chỉ dành cho quản trị viên.' });
const clean = value => String(value || '').trim();
const cleanRoom = row => ({ ...row, available: Boolean(row.available), imageUrls: row.imageUrls || (row.image_url ? [row.image_url] : []) });
const hasRequiredRoomImages = room => Array.isArray(room.imageUrls) && room.imageUrls.filter(Boolean).length >= 3;

async function seedDemoRoomsIfNeeded() {
  const shouldSeed = !isProduction && process.env.AUTO_SEED_DEMO !== '0';
  if (!shouldSeed) return;
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM room');
  if (Number(total) > 0) return;
  const demoRooms = [
    { title: 'Phòng mẫu gần trung tâm', address: '12 Đường Mẫu', district: 'Phường Bến Thành', city: 'Hồ Chí Minh', price: 4500000, area: 24, description: 'Tin mẫu để thử tìm kiếm, xem chi tiết, lưu yêu thích và gửi yêu cầu thuê.' },
    { title: 'Phòng mẫu có gác', address: '25 Đường Thực Hành', district: 'Phường Cầu Giấy', city: 'Hà Nội', price: 3800000, area: 28, description: 'Dữ liệu minh họa cho các thao tác CRUD và lọc theo khu vực, giá thuê.' },
    { title: 'Phòng mẫu gần biển', address: '8 Đường Trình Diễn', district: 'Phường Hải Châu', city: 'Đà Nẵng', price: 3200000, area: 22, description: 'Tin mẫu có ảnh để kiểm tra giao diện danh sách và trang chi tiết.' },
    { title: 'Căn hộ mini full nội thất', address: '46 Đường Số 3', district: 'Phường Thảo Điền', city: 'Hồ Chí Minh', price: 6500000, area: 35, description: 'Căn hộ mini sáng thoáng, có máy lạnh, tủ lạnh và khu bếp riêng.' }
  ];
  const files = fs.readdirSync(uploadDir).filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name)).sort();
  if (files.length < 3) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@trotot.local').toLowerCase();
  let [[owner]] = await pool.query('SELECT id FROM tenant WHERE LOWER(email)=?', [email]);
  if (!owner) {
    const [result] = await pool.query("INSERT INTO tenant(full_name,phone,email,role,account_type,password_hash) VALUES('Quản trị viên','0000000000',?, 'ADMIN','OWNER',?)", [email, await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 10)]);
    owner = { id: result.insertId };
  }
  await pool.query('INSERT IGNORE INTO landlord(tenant_id) VALUES(?)', [owner.id]);
  await pool.query("UPDATE tenant SET account_type='OWNER' WHERE id=?", [owner.id]);
  for (let index = 0; index < demoRooms.length; index++) {
    const room = demoRooms[index];
    const selected = [0, 1, 2].map(offset => `/uploads/rooms/${files[(index * 3 + offset) % files.length]}`);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query('INSERT INTO room(title,address,district,city,price,area,description,image_url,available,owner_id,latitude,longitude) VALUES(?,?,?,?,?,?,?,?,TRUE,?,?,?)', [room.title, room.address, room.district, room.city, room.price, room.area, room.description, selected[0], owner.id, null, null]);
      for (let order = 0; order < selected.length; order++) {
        await connection.query("INSERT INTO room_images(room_id,image_order,image_url,media_type) VALUES(?,?,?,'IMAGE')", [result.insertId, order, selected[order]]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

async function getRoom(id) {
  const [[room]] = await pool.query('SELECT * FROM room WHERE id=?', [id]);
  if (!room) return null;
  const [images] = await pool.query('SELECT image_url,media_type,public_id FROM room_images WHERE room_id=? ORDER BY image_order', [id]).catch(() => [[]]);
  room.mediaUrls = images.map(row => ({ url: row.image_url, type: row.media_type || 'IMAGE', publicId: row.public_id }));
  room.imageUrls = images.filter(row => (row.media_type || 'IMAGE') === 'IMAGE').map(row => row.image_url);
  if (!room.mediaUrls.length && room.image_url) { room.mediaUrls = [{ url: room.image_url, type: 'IMAGE', publicId: null }]; room.imageUrls = [room.image_url]; }
  return cleanRoom(room);
}
async function getRooms(where = '', params = [], limit = '') {
  const [rows] = await pool.query(`SELECT * FROM room ${where} ORDER BY id DESC ${limit}`, params);
  if (!rows.length) return [];
  const ids = rows.map(room => room.id);
  const [images] = await pool.query(`SELECT room_id,image_url,media_type,public_id FROM room_images WHERE room_id IN (${ids.map(() => '?').join(',')}) ORDER BY image_order`, ids).catch(() => [[]]);
  const grouped = new Map();
  images.forEach(media => grouped.set(media.room_id, [...(grouped.get(media.room_id) || []), media]));
  return rows.map(row => {
    const media = grouped.get(row.id) || (row.image_url ? [{ image_url: row.image_url, media_type: 'IMAGE', public_id: null }] : []);
    return cleanRoom({ ...row, mediaUrls: media.map(item => ({ url: item.image_url, type: item.media_type || 'IMAGE', publicId: item.public_id })), imageUrls: media.filter(item => (item.media_type || 'IMAGE') === 'IMAGE').map(item => item.image_url) });
  });
}
const cloudConfigured = () => Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
function cloudSignature(values) { return crypto.createHash('sha1').update(Object.keys(values).sort().map(key => `${key}=${values[key]}`).join('&') + process.env.CLOUDINARY_API_SECRET).digest('hex'); }
async function cloudRequest(resourceType, action, fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => value instanceof Blob ? form.append(key, value, 'upload') : form.append(key, String(value)));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/${resourceType}/${action}`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'Không tải được tệp lên Cloudinary.');
  return result;
}
async function persistUploadedFiles(files) {
  const stored = [];
  try {
    for (const file of files) {
      const type = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      if (!cloudConfigured()) { stored.push({ url: `/uploads/rooms/${file.filename}`, type, publicId: null, localPath: file.path }); continue; }
      const timestamp = Math.floor(Date.now() / 1000), folder = process.env.CLOUDINARY_FOLDER || 'trotot/rooms';
      const signature = cloudSignature({ folder, timestamp });
      const content = await fs.promises.readFile(file.path);
      const blob = new Blob([content], { type: file.mimetype });
      const resource = type === 'VIDEO' ? 'video' : 'image';
      const result = await cloudRequest(resource, 'upload', { file: blob, api_key: process.env.CLOUDINARY_API_KEY, timestamp, folder, signature });
      const url = result.secure_url.replace('/upload/', `/upload/${type === 'IMAGE' ? 'f_auto,q_auto' : 'q_auto'}/`);
      stored.push({ url, type, publicId: result.public_id, localPath: file.path });
      await fs.promises.rm(file.path, { force: true });
    }
    return stored;
  } catch (error) { await removeStoredMedia(stored); await removeUploaded(files); throw error; }
}
async function removeStoredMedia(items = []) {
  await Promise.all(items.map(async item => {
    if (item.publicId && cloudConfigured()) {
      const timestamp = Math.floor(Date.now() / 1000), resource = item.type === 'VIDEO' ? 'video' : 'image';
      const signature = cloudSignature({ public_id: item.publicId, timestamp });
      await cloudRequest(resource, 'destroy', { public_id: item.publicId, api_key: process.env.CLOUDINARY_API_KEY, timestamp, signature }).catch(error => console.error('Cloudinary cleanup failed:', error.message));
    } else if (item.url?.startsWith('/uploads/rooms/')) await fs.promises.rm(path.join(uploadDir, path.basename(item.url)), { force: true });
  }));
}
async function createRoomWithImages(data, ownerId, files) {
  const media = await persistUploadedFiles(files);
  let connection;
  try { connection = await pool.getConnection(); } catch (error) { await removeStoredMedia(media); throw error; }
  try {
    await connection.beginTransaction();
    const imageUrls = media.filter(item => item.type === 'IMAGE').map(item => item.url);
    const [result] = await connection.query('INSERT INTO room(title,address,district,city,price,area,description,image_url,available,owner_id,latitude,longitude) VALUES(?,?,?,?,?,?,?,?,TRUE,?,?,?)', [data.title,data.address,data.district,data.city,data.price,data.area,data.description,imageUrls[0],ownerId,data.latitude,data.longitude]);
    await connection.query('INSERT IGNORE INTO landlord(tenant_id) VALUES(?)', [ownerId]);
    await connection.query("UPDATE tenant SET account_type='OWNER' WHERE id=?", [ownerId]);
    for (let i = 0; i < media.length; i++) await connection.query('INSERT INTO room_images(room_id,image_order,image_url,media_type,public_id) VALUES(?,?,?,?,?)', [result.insertId,i,media[i].url,media[i].type,media[i].publicId]);
    await connection.commit();
    return result.insertId;
  } catch (error) { await connection.rollback(); await removeStoredMedia(media); throw error; }
  finally { connection.release(); }
}
async function updateRoomWithImages(roomId, data, ownerId, available, files, replaceMedia = false) {
  const media = files.length ? await persistUploadedFiles(files) : [];
  let connection;
  try { connection = await pool.getConnection(); } catch (error) { await removeStoredMedia(media); throw error; }
  try {
    await connection.beginTransaction();
    if (files.length) {
      const imageUrls = media.filter(item => item.type === 'IMAGE').map(item => item.url);
      if (replaceMedia) await connection.query('DELETE FROM room_images WHERE room_id=?', [roomId]);
      const [[current]] = await connection.query('SELECT image_url FROM room WHERE id=?', [roomId]);
      const [[order]] = replaceMedia ? [[{ nextOrder: 0 }]] : await connection.query('SELECT COALESCE(MAX(image_order)+1,0) AS nextOrder FROM room_images WHERE room_id=?', [roomId]);
      let nextOrder = Number(order.nextOrder);
      if (!replaceMedia && nextOrder === 0 && current?.image_url) {
        await connection.query('INSERT INTO room_images(room_id,image_order,image_url,media_type,public_id) VALUES(?,?,?,?,NULL)', [roomId,nextOrder++,current.image_url,'IMAGE']);
      }
      await connection.query('UPDATE room SET title=?,address=?,district=?,city=?,price=?,area=?,description=?,available=?,owner_id=?,image_url=?,latitude=?,longitude=? WHERE id=?', [data.title,data.address,data.district,data.city,data.price,data.area,data.description,available,ownerId,replaceMedia ? (imageUrls[0] || null) : (current?.image_url || imageUrls[0] || null),data.latitude,data.longitude,roomId]);
      for (let i = 0; i < media.length; i++) await connection.query('INSERT INTO room_images(room_id,image_order,image_url,media_type,public_id) VALUES(?,?,?,?,?)', [roomId,nextOrder+i,media[i].url,media[i].type,media[i].publicId]);
    } else {
      await connection.query('UPDATE room SET title=?,address=?,district=?,city=?,price=?,area=?,description=?,available=?,owner_id=?,latitude=?,longitude=? WHERE id=?', [data.title,data.address,data.district,data.city,data.price,data.area,data.description,available,ownerId,data.latitude,data.longitude,roomId]);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); await removeStoredMedia(media); throw error; }
  finally { connection.release(); }
}
function removeUploaded(files = []) { return Promise.all(files.map(file => fs.promises.rm(file.path, { force: true }))); }
function ownsRoom(req, room) { return req.session.user?.role === 'ADMIN' || room.owner_id === req.session.user?.id; }
app.get('/', (req, res) => res.render('home', { city: req.query.city, minPrice: req.query.minPrice, maxPrice: req.query.maxPrice }));
const locationCache = new Map();
let geocodeQueue = Promise.resolve(), nextGeocodeAt = 0;
async function cachedJson(key, url, ttl = 24 * 60 * 60 * 1000) {
  const cached = locationCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const response = await fetch(url, { headers: { 'User-Agent': 'TroTotStudentProject/1.0 (room rental listing)' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Dịch vụ bản đồ hiện không phản hồi. Vui lòng thử lại sau.');
  const value = await response.json();
  locationCache.set(key, { value, expires: Date.now() + ttl });
  return value;
}
function geocodeAddress(query) {
  const key = `geo-${query.toLocaleLowerCase('vi')}`;
  const task = geocodeQueue.then(async () => {
    const wait = Math.max(0, nextGeocodeAt - Date.now());
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    nextGeocodeAt = Date.now() + 1100;
    return cachedJson(key, `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`, 7 * 24 * 60 * 60 * 1000);
  });
  geocodeQueue = task.catch(() => {});
  return task;
}
app.get('/api/locations/provinces', asyncRoute(async (_req, res) => {
  try { const data = await cachedJson('provinces-v2', 'https://provinces.open-api.vn/api/v2/p/'); res.set('Cache-Control', 'public, max-age=3600').json(data); }
  catch { res.status(503).json({ message: 'Không kết nối được danh mục địa chỉ ngoài. Trình duyệt có thể thử kết nối trực tiếp.' }); }
}));
app.get('/api/locations/provinces/:code/wards', asyncRoute(async (req, res) => {
  if (!/^\d{1,5}$/.test(req.params.code)) return res.status(400).json({ message: 'Mã tỉnh không hợp lệ.' });
  try { const data = await cachedJson(`wards-${req.params.code}`, `https://provinces.open-api.vn/api/v2/w/?province=${req.params.code}`); res.set('Cache-Control', 'public, max-age=3600').json(data); }
  catch { res.status(503).json({ message: 'Không kết nối được danh mục địa chỉ ngoài.' }); }
}));
app.get('/api/geocode', limitAuthAttempts(30, 5 * 60 * 1000), asyncRoute(async (req, res) => {
  const query = clean(req.query.q).slice(0, 240);
  if (query.length < 8) return res.status(400).json({ message: 'Địa chỉ cần cụ thể hơn để tìm vị trí.' });
  try {
    const data = await geocodeAddress(query);
    if (!data.length) return res.status(404).json({ message: 'Không tìm thấy vị trí. Hãy bổ sung số nhà, đường và phường/xã.' });
    res.json({ latitude: Number(data[0].lat), longitude: Number(data[0].lon), label: data[0].display_name });
  } catch { res.status(503).json({ message: 'Không kết nối được dịch vụ bản đồ ngoài.' }); }
}));
app.get('/api/rooms', asyncRoute(async (req, res) => {
  const terms = [], values = [];
  if (clean(req.query.city)) { terms.push('city LIKE ?'); values.push(`%${clean(req.query.city)}%`); }
  for (const key of ['minPrice', 'maxPrice']) {
    if (req.query[key] !== undefined && req.query[key] !== '') {
      const value = Number(req.query[key]);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ message: 'Mức giá tìm kiếm không hợp lệ.' });
    }
  }
  if (req.query.minPrice !== undefined && req.query.minPrice !== '') { terms.push('price >= ?'); values.push(Number(req.query.minPrice)); }
  if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') { terms.push('price <= ?'); values.push(Number(req.query.maxPrice)); }
  if (req.query.minPrice && req.query.maxPrice && Number(req.query.minPrice) > Number(req.query.maxPrice)) return res.status(400).json({ message: 'Giá tối thiểu không được lớn hơn giá tối đa.' });
  const rooms = await getRooms(terms.length ? `WHERE ${terms.join(' AND ')}` : '', values);
  const filtered = rooms.filter(hasRequiredRoomImages).filter(room => !req.query.district || room.district.toLocaleLowerCase('vi').includes(clean(req.query.district).toLocaleLowerCase('vi')));
  res.json(filtered);
}));
app.get('/api/rooms/:id([0-9]+)', asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  if (!room || !hasRequiredRoomImages(room)) return res.status(404).json({ message: 'Không tìm thấy phòng có đủ ít nhất 3 ảnh.' });
  const [[owner]] = await pool.query('SELECT full_name,phone FROM tenant WHERE id=?', [room.owner_id]);
  res.json({ ...room, owner: owner ? { fullName: owner.full_name, phone: req.session.user ? owner.phone : null, contactRequiresLogin: !req.session.user } : null });
}));
app.post('/api/rooms', requireApiLogin, apiRoomUpload, asyncRoute(async (req, res) => {
  const files = [...(req.files?.imageFiles || []), ...(req.files?.videoFiles || [])];
  const data = roomInput(req.body);
  const imageFiles = req.files?.imageFiles || [];
  const fail = async (status, message) => { await removeUploaded(files); return res.status(status).json({ message }); };
  if (!validRoomInput(data)) return fail(400, 'Thông tin phòng không hợp lệ. Hãy kiểm tra tiêu đề, địa chỉ, giá, diện tích và tọa độ.');
  if (imageFiles.length < 3) return fail(400, 'Tin phòng cần có ít nhất 3 ảnh.');
  if (files.some(file => file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024)) return fail(400, 'Mỗi ảnh không được vượt quá 5 MB.');
  const ownerId = req.session.user.role === 'ADMIN' ? Number(req.body.ownerId) : req.session.user.id;
  const [[owner]] = await pool.query("SELECT id FROM tenant WHERE id=? AND role='USER'", [ownerId]);
  if (!owner) return fail(400, 'Tài khoản chủ trọ không hợp lệ. Admin cần gửi ownerId hợp lệ.');
  try {
    const id = await createRoomWithImages(data, ownerId, files);
    return res.status(201).json({ message: 'Đã tạo tin phòng.', room: await getRoom(id) });
  } catch (error) { await removeUploaded(files); throw error; }
}));
app.put('/api/rooms/:id([0-9]+)', requireApiLogin, apiRoomUpload, asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  const files = [...(req.files?.imageFiles || []), ...(req.files?.videoFiles || [])];
  const data = roomInput(req.body);
  const imageFiles = req.files?.imageFiles || [];
  const fail = async (status, message) => { await removeUploaded(files); return res.status(status).json({ message }); };
  if (!room) return fail(404, 'Không tìm thấy phòng.');
  if (!ownsRoom(req, room)) return fail(403, 'Bạn không có quyền sửa tin phòng này.');
  if (!validRoomInput(data)) return fail(400, 'Thông tin phòng không hợp lệ. PUT cần gửi đầy đủ các trường bắt buộc.');
  if (files.some(file => file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024)) return fail(400, 'Mỗi ảnh không được vượt quá 5 MB.');
  const replaceMedia = req.body.replaceMedia === 'true';
  const finalImageCount = replaceMedia ? imageFiles.length : room.imageUrls.length + imageFiles.length;
  const finalVideoCount = replaceMedia ? (req.files?.videoFiles || []).length : (room.mediaUrls || []).filter(item => item.type === 'VIDEO').length + (req.files?.videoFiles || []).length;
  if (finalImageCount < 3 || finalImageCount > 8 || finalVideoCount > 2) return fail(400, 'Sau khi cập nhật, tin cần có 3–8 ảnh và tối đa 2 video.');
  const ownerId = req.session.user.role === 'ADMIN' && req.body.ownerId ? Number(req.body.ownerId) : room.owner_id;
  if (req.session.user.role === 'ADMIN') {
    const [[owner]] = await pool.query("SELECT id FROM tenant WHERE id=? AND role='USER'", [ownerId]);
    if (!owner) return fail(400, 'Tài khoản chủ trọ không hợp lệ.');
  }
  try {
    const available = req.body.available === undefined ? room.available : !(req.body.available === false || req.body.available === 'false');
    await updateRoomWithImages(room.id, data, ownerId, available, files, replaceMedia);
    if (replaceMedia && files.length) await removeStoredMedia(room.mediaUrls || []);
    return res.json({ message: 'Đã cập nhật tin phòng.', room: await getRoom(room.id) });
  } catch (error) { await removeUploaded(files); throw error; }
}));
app.delete('/api/rooms/:id([0-9]+)', requireApiLogin, asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
  if (!ownsRoom(req, room)) return res.status(403).json({ message: 'Bạn không có quyền xóa tin phòng này.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM booking WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM user_favorite WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM room_review WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM room_images WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM room WHERE id=?', [room.id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  await removeStoredMedia(room.mediaUrls || []);
  res.json({ deleted: true, id: room.id });
}));
app.get('/api/favorites', requireApiLogin, asyncRoute(async (req, res) => {
  const [saved] = await pool.query('SELECT room_id FROM user_favorite WHERE user_id=? ORDER BY created_at DESC', [req.session.user.id]);
  if (!saved.length) return res.json([]);
  const ids = saved.map(row => row.room_id);
  const rooms = await getRooms(`WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  const byId = new Map(rooms.filter(hasRequiredRoomImages).map(room => [room.id, room]));
  res.json(ids.map(id => byId.get(id)).filter(Boolean));
}));
app.post('/api/favorites/:id([0-9]+)', requireApiLogin, asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  if (!room || !hasRequiredRoomImages(room)) return res.status(404).json({ message: 'Phòng không tồn tại hoặc chưa đủ 3 ảnh.' });
  await pool.query('INSERT IGNORE INTO user_favorite(user_id,room_id) VALUES(?,?)', [req.session.user.id, room.id]);
  res.status(201).json({ saved: true, roomId: room.id });
}));
app.delete('/api/favorites/:id([0-9]+)', requireApiLogin, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM user_favorite WHERE user_id=? AND room_id=?', [req.session.user.id, Number(req.params.id)]);
  res.json({ saved: false, roomId: Number(req.params.id) });
}));
app.get('/api/rooms/:id([0-9]+)/reviews', asyncRoute(async (req, res) => {
  const roomId = Number(req.params.id);
  const [[room]] = await pool.query('SELECT id FROM room WHERE id=?', [roomId]);
  if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
  const [reviews] = await pool.query('SELECT r.id,r.user_id,r.rating,r.comment,r.created_at,r.updated_at,t.full_name FROM room_review r JOIN tenant t ON t.id=r.user_id WHERE r.room_id=? ORDER BY r.created_at DESC,r.id DESC', [roomId]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0;
  res.json({ count: reviews.length, average, mine: req.session.user ? reviews.find(review => review.user_id === req.session.user.id) || null : null, reviews: reviews.map(({ user_id, ...review }) => review) });
}));
app.post('/api/rooms/:id([0-9]+)/reviews', requireApiLogin, asyncRoute(async (req, res) => {
  if (req.session.user.role !== 'USER') return res.status(403).json({ message: 'Chỉ tài khoản người dùng mới có thể đánh giá.' });
  const roomId = Number(req.params.id), rating = Number(req.body.rating), comment = clean(req.body.comment);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1000) return res.status(400).json({ message: 'Chọn từ 1 đến 5 sao và viết tối đa 1000 ký tự.' });
  const [[room]] = await pool.query('SELECT id FROM room WHERE id=?', [roomId]);
  if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
  await pool.query('INSERT INTO room_review(room_id,user_id,rating,comment) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating),comment=VALUES(comment),updated_at=CURRENT_TIMESTAMP', [roomId,req.session.user.id,rating,comment]);
  res.status(201).json({ saved: true });
}));
app.post('/admin/reviews/:id([0-9]+)/delete', requireLogin, requireAdmin, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM room_review WHERE id=?', [Number(req.params.id)]);
  res.redirect('/admin/reviews?deleted=1');
}));
app.get('/api/rooms/search', asyncRoute(async (req, res) => {
  req.url = `/api/rooms?${new URLSearchParams(req.query)}`;
  res.redirect(307, req.url);
}));
app.get('/room/:id([0-9]+)', asyncRoute(async (req, res) => {
  res.render('room-detail', { roomId: Number(req.params.id) });
}));
app.get('/login', (req, res) => res.render('login', { error: '', registered: req.query.registered === '1', oauthError: req.query.oauth === 'unavailable' }));
function sessionLogin(req, account) {
  return new Promise((resolve, reject) => req.session.regenerate(error => {
    if (error) return reject(error);
    req.session.user = { id: account.id, fullName: account.full_name, email: account.email, phone: account.phone, role: account.role };
    req.session.save(saveError => saveError ? reject(saveError) : resolve());
  }));
}
async function socialAccount(profile) {
  const email = clean(profile.email).toLowerCase();
  if (!email || email.length > 190) throw new Error('Nhà cung cấp không trả email hợp lệ.');
  let [[account]] = await pool.query('SELECT * FROM tenant WHERE LOWER(email)=?', [email]);
  if (!account) {
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    try {
      const [result] = await pool.query("INSERT INTO tenant(full_name,phone,email,role,account_type,password_hash) VALUES(?,? ,?,'USER','TENANT',?)", [clean(profile.name).slice(0,120) || 'Người dùng', '', email, hash]);
      [[account]] = await pool.query('SELECT * FROM tenant WHERE id=?', [result.insertId]);
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      [[account]] = await pool.query('SELECT * FROM tenant WHERE LOWER(email)=?', [email]);
    }
  }
  return account;
}
function oauthRedirectUri(provider) { return process.env[`${provider.toUpperCase()}_REDIRECT_URI`] || `${process.env.BASE_URL || `http://localhost:${PORT}`}/auth/${provider}/callback`; }
function checkOAuthState(expected, actual) { return typeof expected === 'string' && typeof actual === 'string' && expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual)); }
app.get('/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return res.redirect('/login?oauth=unavailable');
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthGoogleState = state;
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: oauthRedirectUri('google'), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  req.session.save(() => res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`));
});
app.get('/auth/google/callback', asyncRoute(async (req, res) => {
  if (!checkOAuthState(req.session.oauthGoogleState, req.query.state) || req.query.error || !req.query.code) { delete req.session.oauthGoogleState; return res.redirect('/login?oauth=unavailable'); }
  delete req.session.oauthGoogleState;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: oauthRedirectUri('google'), grant_type: 'authorization_code' }), signal: AbortSignal.timeout(10000) });
  if (!tokenResponse.ok) return res.redirect('/login?oauth=unavailable');
  const tokens = await tokenResponse.json();
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10000) });
  if (!profileResponse.ok) return res.redirect('/login?oauth=unavailable');
  const profile = await profileResponse.json();
  if (profile.email_verified !== true) return res.redirect('/login?oauth=unavailable');
  const account = await socialAccount(profile);
  await sessionLogin(req, account);
  res.redirect(account.role === 'ADMIN' ? '/admin' : account.phone ? '/' : '/profile?complete=1');
}));
app.get('/auth/facebook', (req, res) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) return res.redirect('/login?oauth=unavailable');
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthFacebookState = state;
  const version = process.env.FACEBOOK_GRAPH_VERSION || 'v26.0';
  const params = new URLSearchParams({ client_id: process.env.FACEBOOK_APP_ID, redirect_uri: oauthRedirectUri('facebook'), state, scope: 'email,public_profile', response_type: 'code' });
  req.session.save(() => res.redirect(`https://www.facebook.com/${version}/dialog/oauth?${params}`));
});
app.get('/auth/facebook/callback', asyncRoute(async (req, res) => {
  if (!checkOAuthState(req.session.oauthFacebookState, req.query.state) || req.query.error || !req.query.code) { delete req.session.oauthFacebookState; return res.redirect('/login?oauth=unavailable'); }
  delete req.session.oauthFacebookState;
  const version = process.env.FACEBOOK_GRAPH_VERSION || 'v26.0';
  const tokenParams = new URLSearchParams({ client_id: process.env.FACEBOOK_APP_ID, client_secret: process.env.FACEBOOK_APP_SECRET, redirect_uri: oauthRedirectUri('facebook'), code: req.query.code });
  const tokenResponse = await fetch(`https://graph.facebook.com/${version}/oauth/access_token?${tokenParams}`, { signal: AbortSignal.timeout(10000) });
  if (!tokenResponse.ok) return res.redirect('/login?oauth=unavailable');
  const tokens = await tokenResponse.json();
  const profileResponse = await fetch(`https://graph.facebook.com/${version}/me?${new URLSearchParams({ fields: 'id,name,email', access_token: tokens.access_token })}`, { signal: AbortSignal.timeout(10000) });
  if (!profileResponse.ok) return res.redirect('/login?oauth=unavailable');
  const profile = await profileResponse.json();
  if (!profile.email) return res.redirect('/login?oauth=unavailable');
  const account = await socialAccount(profile);
  await sessionLogin(req, account);
  res.redirect(account.role === 'ADMIN' ? '/admin' : account.phone ? '/' : '/profile?complete=1');
}));
app.post('/login', limitAuthAttempts(10, 15 * 60 * 1000), asyncRoute(async (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  const [accounts] = await pool.query('SELECT * FROM tenant WHERE LOWER(email)=? ORDER BY id', [email]);
  let account = null;
  for (const candidate of accounts) {
    if (candidate.password_hash && await bcrypt.compare(req.body.password || '', candidate.password_hash)) { account = candidate; break; }
  }
  if (!account) return res.status(401).render('login', { error: 'Email hoặc mật khẩu chưa chính xác.', registered: false, oauthError: false });
  await sessionLogin(req, account);
  res.redirect(account.role === 'ADMIN' ? '/admin' : '/');
}));
app.get('/register', (_req, res) => res.render('register', { error: '', values: {} }));
app.post('/register', limitAuthAttempts(5, 60 * 60 * 1000), asyncRoute(async (req, res) => {
  const values = { fullName: clean(req.body.fullName), phone: clean(req.body.phone), email: clean(req.body.email).toLowerCase() };
  const password = req.body.password || '';
  if (!values.fullName || values.fullName.length > 120 || !/^[+0-9 .()\-]{8,20}$/.test(values.phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 190 || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).render('register', { error: 'Vui lòng kiểm tra thông tin; email tối đa 190 ký tự, họ tên tối đa 120 ký tự và mật khẩu từ 8 đến 72 byte.', values });
  try { await pool.query('INSERT INTO tenant(full_name,phone,email,role,account_type,password_hash) VALUES(?,?,?,\'USER\',\'TENANT\',?)', [values.fullName, values.phone, values.email, await bcrypt.hash(password, 10)]); }
  catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(400).render('register', { error: 'Email này đã được đăng ký.', values }); throw error; }
  res.redirect('/login?registered=1');
}));
app.get('/profile', requireLogin, asyncRoute(async (req, res) => {
  const [[account]] = await pool.query('SELECT full_name,phone,email FROM tenant WHERE id=?', [req.session.user.id]);
  res.render('profile', { account, error: '', complete: req.query.complete === '1', querySaved: req.query.saved === '1' });
}));
app.post('/profile', requireLogin, asyncRoute(async (req, res) => {
  const account = { full_name: clean(req.body.fullName), phone: clean(req.body.phone), email: req.session.user.email };
  if (!account.full_name || account.full_name.length > 120 || !/^[+0-9 .()\-]{8,20}$/.test(account.phone)) return res.status(400).render('profile', { account, error: 'Nhập họ tên (tối đa 120 ký tự) và số điện thoại hợp lệ.', complete: false, querySaved: false });
  await pool.query('UPDATE tenant SET full_name=?,phone=? WHERE id=?', [account.full_name, account.phone, req.session.user.id]);
  req.session.user.fullName = account.full_name; req.session.user.phone = account.phone;
  res.redirect('/profile?saved=1');
}));
app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));
app.get('/room/new', requireLogin, asyncRoute(async (req, res) => {
  const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
  res.render('room-form', { room: null, owners, error: '', selected: {} });
}));
app.post('/room/new', requireLogin, roomUpload.fields([{ name: 'imageFiles', maxCount: 8 }, { name: 'videoFiles', maxCount: 2 }]), asyncRoute(async (req, res) => {
  const files = [...(req.files?.imageFiles || []), ...(req.files?.videoFiles || [])];
  const data = roomInput(req.body);
  if (!validRoomInput(data)) {
    await removeUploaded(files);
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    return res.status(400).render('room-form', { room: null, owners, error: 'Vui lòng điền đầy đủ thông tin phòng.', selected: req.body });
  }
  const imageFiles = req.files?.imageFiles || [];
  if (imageFiles.length < 3 || files.some(file => file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024)) {
    await removeUploaded(files);
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    return res.status(400).render('room-form', { room: null, owners, error: imageFiles.length < 3 ? 'Tin phòng cần có ít nhất 3 ảnh.' : 'Mỗi ảnh không được vượt quá 5 MB.', selected: req.body });
  }
  const ownerId = req.session.user.role === 'ADMIN' ? Number(req.body.ownerId) : req.session.user.id;
  const [[owner]] = await pool.query("SELECT id FROM tenant WHERE id=? AND role='USER'", [ownerId]);
  if (!owner) {
    await removeUploaded(files);
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    return res.status(400).render('room-form', { room: null, owners, error: 'Vui lòng chọn tài khoản chủ trọ hợp lệ.', selected: req.body });
  }
  try { await createRoomWithImages(data, ownerId, files); }
  catch (error) { await removeUploaded(files); throw error; }
  res.redirect('/manage?created=1');
}));
app.get('/room/:id/edit', requireLogin, asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  if (!room || !ownsRoom(req, room)) return res.status(403).render('message', { title: 'Không có quyền sửa', message: 'Bạn không thể sửa tin phòng này.' });
  const [owners] = await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name");
  res.render('room-form', { room, owners, error: '', selected: {} });
}));
app.post('/room/:id/edit', requireLogin, roomUpload.fields([{ name: 'imageFiles', maxCount: 8 }, { name: 'videoFiles', maxCount: 2 }]), asyncRoute(async (req, res) => {
  const files = [...(req.files?.imageFiles || []), ...(req.files?.videoFiles || [])];
  const imageFiles = req.files?.imageFiles || [];
  const room = await getRoom(Number(req.params.id));
  if (!room || !ownsRoom(req, room)) return res.status(403).render('message', { title: 'Không có quyền sửa', message: 'Bạn không thể sửa tin phòng này.' });
  const data = roomInput(req.body);
  if (!validRoomInput(data)) {
    await removeUploaded(files);
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    return res.status(400).render('room-form', { room, owners, error: 'Vui lòng điền đầy đủ thông tin phòng.', selected: req.body });
  }
  if (files.some(file => file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024)) {
    await removeUploaded(files);
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    return res.status(400).render('room-form', { room, owners, error: 'Mỗi ảnh không được vượt quá 5 MB.', selected: req.body });
  }
  const replaceMedia = req.body.replaceMedia === 'true';
  const currentVideoCount = (room.mediaUrls || []).filter(item => item.type === 'VIDEO').length;
  const finalImageCount = replaceMedia ? imageFiles.length : room.imageUrls.length + imageFiles.length;
  const finalVideoCount = replaceMedia ? (req.files?.videoFiles || []).length : currentVideoCount + (req.files?.videoFiles || []).length;
  if (finalImageCount < 3 || finalImageCount > 8 || finalVideoCount > 2) {
    await removeUploaded(files);
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    const error = finalImageCount < 3 ? 'Tin phòng cần có ít nhất 3 ảnh.' : finalImageCount > 8 ? 'Mỗi tin tối đa 8 ảnh.' : 'Mỗi tin tối đa 2 video.';
    return res.status(400).render('room-form', { room, owners, error, selected: req.body });
  }
  if (!files.length && !hasRequiredRoomImages(room)) {
    const owners = req.session.user.role === 'ADMIN' ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
    return res.status(400).render('room-form', { room, owners, error: 'Tin này đang thiếu ảnh. Hãy chọn bổ sung ít nhất 3 ảnh để lưu.', selected: req.body });
  }
  const ownerId = req.session.user.role === 'ADMIN' && req.body.ownerId ? Number(req.body.ownerId) : room.owner_id;
  if (req.session.user.role === 'ADMIN') {
    const [[owner]] = await pool.query("SELECT id FROM tenant WHERE id=? AND role='USER'", [ownerId]);
    if (!owner) {
      await removeUploaded(files);
      const owners = (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0];
      return res.status(400).render('room-form', { room, owners, error: 'Vui lòng chọn tài khoản chủ trọ hợp lệ.', selected: req.body });
    }
  }
  try { await updateRoomWithImages(room.id,data,ownerId,req.body.available !== 'false',files,replaceMedia); }
  catch (error) { await removeUploaded(files); throw error; }
  if (replaceMedia && files.length) await removeStoredMedia(room.mediaUrls || []);
  res.redirect(req.session.user.role === 'ADMIN' ? '/admin/rooms?updated=1' : '/manage?updated=1');
}));
app.post('/room/:id/delete', requireLogin, asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  if (!room || !ownsRoom(req, room)) return res.status(403).render('message', { title: 'Không có quyền xóa', message: 'Bạn không thể xóa tin phòng này.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM booking WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM user_favorite WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM room_review WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM room_images WHERE room_id=?', [room.id]);
    await connection.query('DELETE FROM room WHERE id=?', [room.id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  await removeStoredMedia(room.mediaUrls || []);
  res.redirect(req.session.user.role === 'ADMIN' ? '/admin/rooms?deleted=1' : '/manage?deleted=1');
}));
app.get('/admin', requireLogin, requireAdmin, asyncRoute(async (_req, res) => {
  const [[counts]] = await pool.query(`SELECT (SELECT COUNT(*) FROM room) roomCount,(SELECT COUNT(*) FROM room WHERE available=TRUE) availableCount,(SELECT COUNT(*) FROM tenant) userCount,(SELECT COUNT(*) FROM booking) bookingCount,(SELECT COUNT(*) FROM booking WHERE status='PENDING') pendingCount,(SELECT COUNT(*) FROM room_review) reviewCount`);
  const recentRooms = await getRooms('', [], 'LIMIT 5');
  const [recentAccounts] = await pool.query('SELECT id,full_name,email,role FROM tenant ORDER BY id DESC LIMIT 5');
  const [recentBookings] = await pool.query('SELECT * FROM booking ORDER BY id DESC LIMIT 5');
  res.render('admin', { counts, recentRooms, recentAccounts, recentBookings });
}));
app.get('/admin/owners', requireLogin, requireAdmin, asyncRoute(async (_req, res) => {
  const [owners] = await pool.query(`SELECT l.id AS landlord_id,t.id,t.full_name,t.phone,t.email,t.account_type,COUNT(DISTINCT r.id) AS room_count,COALESCE(SUM(r.available=TRUE),0) AS available_count FROM landlord l JOIN tenant t ON t.id=l.tenant_id LEFT JOIN room r ON r.owner_id=t.id WHERE t.role='USER' GROUP BY l.id,t.id,t.full_name,t.phone,t.email,t.account_type ORDER BY l.id ASC`);
  res.render('admin-owners', { owners });
}));
app.get('/admin/:section(users|rooms|bookings|reviews)', requireLogin, requireAdmin, asyncRoute(async (req, res) => {
  const section = req.params.section, page = Math.max(0, Number(req.query.page) || 0), size = 10, offset = page * size;
  const tables = { users: ['tenant', 'id,full_name,phone,email,role', 'id DESC'], rooms: ['room', '*', 'id DESC'], bookings: ['booking', '*', 'id DESC'], reviews: ['room_review', '*', 'created_at DESC,id DESC'] };
  const [table, fields, order] = tables[section];
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM ${table}`);
  const totalPages = Math.ceil(total / size), safePage = totalPages && page >= totalPages ? totalPages - 1 : page;
  const [items] = await pool.query(`SELECT ${fields} FROM ${table} ORDER BY ${order} LIMIT ? OFFSET ?`, [size, safePage * size]);
  const pageItems = section === 'rooms' ? await Promise.all(items.map(room => getRoom(room.id))) : items;
  const enriched = section === 'rooms' ? await Promise.all(pageItems.map(async room => { const [[owner]] = await pool.query('SELECT full_name FROM tenant WHERE id=?', [room.owner_id]); return { ...room, owner_name: owner?.full_name || 'Tài khoản đã xóa' }; })) : section === 'bookings' ? await Promise.all(items.map(async booking => { const room = await getRoom(booking.room_id); const [[tenant]] = await pool.query('SELECT full_name,phone FROM tenant WHERE id=?', [booking.tenant_id]); return { ...booking, room_title: room?.title || 'Phòng đã xóa', tenant_name: tenant?.full_name || 'Tài khoản đã xóa', phone: tenant?.phone || '' }; })) : section === 'reviews' ? await Promise.all(items.map(async review => { const [[room]] = await pool.query('SELECT title FROM room WHERE id=?', [review.room_id]); const [[user]] = await pool.query('SELECT full_name,email FROM tenant WHERE id=?', [review.user_id]); return { ...review, room_title: room?.title || 'Phòng đã xóa', user_name: user?.full_name || 'Tài khoản đã xóa', email: user?.email || '' }; })) : items;
  res.render('admin-list', { section, items: enriched, page: safePage, totalPages, total, start: total ? safePage*size+1 : 0, end: Math.min(total,(safePage+1)*size), notice: req.query.deleted ? (section==='reviews'?'Đã xóa đánh giá.':'Đã xóa tin phòng.') : req.query.updated ? 'Đã cập nhật tin phòng.' : req.query.paymentUpdated ? 'Đã cập nhật tình trạng nhận cọc.' : '' });
}));
app.post('/room/:id/book', requireLogin, asyncRoute(async (req, res) => {
  const room = await getRoom(Number(req.params.id));
  if (!room || !room.available || room.owner_id === req.session.user.id) return res.redirect(`/room/${req.params.id}?error=room`);
  const start = clean(req.body.startDate), end = clean(req.body.endDate), today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10);
  if (!validBookingDates(start, end, today)) return res.redirect(`/room/${room.id}?error=dates`);
  const paymentMethod = clean(req.body.paymentMethod);
  if (!['BANK_TRANSFER', 'CASH'].includes(paymentMethod)) return res.redirect(`/room/${room.id}?error=payment`);
  const bankConfigured = Boolean(process.env.PAYMENT_BANK_ID && process.env.PAYMENT_ACCOUNT_NO && process.env.PAYMENT_ACCOUNT_NAME);
  if (paymentMethod === 'BANK_TRANSFER' && !bankConfigured) return res.redirect(`/room/${room.id}?error=payment`);
  const [[existing]] = await pool.query("SELECT id FROM booking WHERE room_id=? AND status IN ('PENDING','CONFIRMED') AND (status='CONFIRMED' OR tenant_id=?) AND NOT (end_date < ? OR start_date > ?) LIMIT 1", [room.id, req.session.user.id, start, end]);
  if (existing) return res.redirect(`/room/${room.id}?error=duplicate`);
  const depositRate = Math.min(3, Math.max(0.1, Number(process.env.DEPOSIT_RATE || 1)));
  const deposit = Math.round(Number(room.price) * depositRate);
  const [inserted] = await pool.query("INSERT INTO booking(room_id,tenant_id,start_date,end_date,status,deposit_amount,payment_code,payment_status,payment_method) VALUES(?,?,?,?, 'PENDING',?,'','PENDING',?)", [room.id, req.session.user.id, start, end, deposit, paymentMethod]);
  const paymentCode = `TROTOT${inserted.insertId}`;
  await pool.query('UPDATE booking SET payment_code=? WHERE id=?', [paymentCode, inserted.insertId]);
  res.redirect(`/room/${room.id}?success=1`);
}));
app.get('/my-requests', requireLogin, asyncRoute(async (req, res) => {
  const [requests] = await pool.query('SELECT b.*,r.title room_title,t.full_name owner_name,t.phone owner_phone FROM booking b LEFT JOIN room r ON r.id=b.room_id LEFT JOIN tenant t ON t.id=r.owner_id WHERE b.tenant_id=? ORDER BY b.id DESC', [req.session.user.id]);
  const bank = clean(process.env.PAYMENT_BANK_ID), accountNo = clean(process.env.PAYMENT_ACCOUNT_NO), accountName = clean(process.env.PAYMENT_ACCOUNT_NAME);
  for (const request of requests) request.qrUrl = request.payment_method !== 'CASH' && bank && accountNo && accountName && request.payment_code ? `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(accountNo)}-compact2.png?amount=${request.deposit_amount}&addInfo=${encodeURIComponent(request.payment_code)}&accountName=${encodeURIComponent(accountName)}` : '';
  res.render('my-requests', { requests });
}));
app.get('/favorites', requireLogin, (_req, res) => res.render('favorites'));
app.get('/manage', requireLogin, asyncRoute(async (req, res) => {
  const admin = req.session.user.role === 'ADMIN';
  const owners = admin ? (await pool.query("SELECT id,full_name,phone FROM tenant WHERE role='USER' ORDER BY full_name"))[0] : [];
  const ownerId = admin ? Number(req.query.ownerId || 0) : req.session.user.id;
  const rooms = ownerId ? await getRooms('WHERE owner_id=?', [ownerId]) : [];
  const [requests] = ownerId ? await pool.query('SELECT b.*,r.title room_title,t.full_name tenant_name,t.phone FROM booking b JOIN room r ON r.id=b.room_id LEFT JOIN tenant t ON t.id=b.tenant_id WHERE r.owner_id=? ORDER BY b.id DESC', [ownerId]) : [[]];
  res.render('manage', { rooms, requests, owners, ownerId, notice: req.query.created ? 'Đã đăng tin thành công.' : req.query.updated ? 'Đã cập nhật thông tin phòng.' : req.query.deleted ? 'Đã xóa tin phòng.' : req.query.requestUpdated ? 'Đã cập nhật trạng thái yêu cầu thuê.' : '' });
}));
app.post('/booking/:id/status', requireLogin, asyncRoute(async (req, res) => {
  const [[booking]] = await pool.query('SELECT b.*,r.owner_id FROM booking b JOIN room r ON r.id=b.room_id WHERE b.id=?', [req.params.id]);
  if (!booking || (req.session.user.role !== 'ADMIN' && booking.owner_id !== req.session.user.id)) return res.sendStatus(403);
  if (booking.status === 'PENDING' && ['CONFIRMED','REJECTED'].includes(req.body.status)) await pool.query('UPDATE booking SET status=? WHERE id=?', [req.body.status, booking.id]);
  res.redirect(req.session.user.role === 'ADMIN' ? '/admin/bookings' : '/manage?requestUpdated=1');
}));
app.post('/booking/:id/payment', requireLogin, requireAdmin, asyncRoute(async (req, res) => {
  if (!/^\d+$/.test(req.params.id) || !['PAID','PENDING'].includes(req.body.paymentStatus)) return res.sendStatus(400);
  await pool.query("UPDATE booking SET payment_status=? WHERE id=?", [req.body.paymentStatus, req.params.id]);
  res.redirect('/admin/bookings?paymentUpdated=1');
}));
app.use((err, _req, res, _next) => {
  console.error(err);
  const uploadError = err instanceof multer.MulterError || err.message === 'Unexpected field';
  const status = uploadError ? 400 : 500;
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 5 MB và video tối đa 60 MB.' : err.code === 'LIMIT_FILE_COUNT' ? 'Mỗi tin tối đa 8 ảnh và 2 video.' : err.message === 'Unexpected field' ? 'Tệp tải lên không phải định dạng ảnh hoặc video được hỗ trợ.' : uploadError ? 'Không thể nhận tệp. Hãy chọn ảnh JPG, PNG, GIF, WebP, AVIF hoặc video MP4, WebM, MOV.' : 'Ứng dụng gặp lỗi. Vui lòng thử lại.';
  res.status(status).render('message', { title: status === 400 ? 'Thông tin chưa hợp lệ' : 'Có lỗi xảy ra', message });
});
(async () => {
  await initializeDatabase();
  const email = (process.env.ADMIN_EMAIL || 'admin@trotot.local').toLowerCase();
  const [[admin]] = await pool.query('SELECT id,password_hash FROM tenant WHERE LOWER(email)=?', [email]);
  if (!admin) await pool.query("INSERT INTO tenant(full_name,phone,email,role,account_type,password_hash) VALUES('Quản trị viên','0000000000',?,'ADMIN','OWNER',?)", [email, await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 10)]);
  else {
    const passwordHash = admin.password_hash || await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
    await pool.query("UPDATE tenant SET role='ADMIN',password_hash=? WHERE id=?", [passwordHash, admin.id]);
  }
  await seedDemoRoomsIfNeeded();
  app.listen(PORT, '0.0.0.0', () => console.log(`Trọ Tốt đang chạy tại http://localhost:${PORT}`));
})().catch(error => { console.error('Không thể khởi động ứng dụng:', error.code || '', error.message || error); process.exit(1); });

