require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('./db');

const demoRooms = [
  { title: 'Phòng mẫu gần trung tâm', address: '12 Đường Mẫu', district: 'Phường Bến Thành', city: 'Hồ Chí Minh', price: 4500000, area: 24, description: 'Tin mẫu để thử tìm kiếm, xem chi tiết, lưu yêu thích và gửi yêu cầu thuê.' },
  { title: 'Phòng mẫu có gác', address: '25 Đường Thực Hành', district: 'Phường Cầu Giấy', city: 'Hà Nội', price: 3800000, area: 28, description: 'Dữ liệu minh họa cho các thao tác CRUD và lọc theo khu vực, giá thuê.' },
  { title: 'Phòng mẫu gần biển', address: '8 Đường Trình Diễn', district: 'Phường Hải Châu', city: 'Đà Nẵng', price: 3200000, area: 22, description: 'Tin mẫu có ảnh để kiểm tra giao diện danh sách và trang chi tiết.' },
  { title: 'Căn hộ mini full nội thất', address: '46 Đường Số 3', district: 'Phường Thảo Điền', city: 'Hồ Chí Minh', price: 6500000, area: 35, description: 'Căn hộ mini sáng thoáng, có máy lạnh, tủ lạnh và khu bếp riêng.' },
  { title: 'Phòng trọ yên tĩnh gần trường', address: '19 Ngõ 82', district: 'Phường Dịch Vọng', city: 'Hà Nội', price: 2800000, area: 20, description: 'Phòng sạch sẽ trong khu dân cư yên tĩnh, thuận tiện đi học và đi làm.' },
  { title: 'Phòng rộng có ban công', address: '73 Đường Nguyễn Văn Linh', district: 'Phường Hòa Thuận Tây', city: 'Đà Nẵng', price: 4100000, area: 30, description: 'Phòng có ban công đón nắng, chỗ để xe và giờ giấc tự do.' }
];

async function main() {
  if (process.env.DEMO_SEED !== '1') throw new Error('Để tránh tạo dữ liệu ngoài ý muốn, hãy đặt DEMO_SEED=1 khi chạy lệnh seed.');
  await initializeDatabase();
  const imageDir = path.join(__dirname, 'uploads', 'rooms');
  const images = fs.readdirSync(imageDir).filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name)).sort();
  if (images.length < 3) throw new Error('Cần ít nhất 3 ảnh trong uploads/rooms để tạo tin mẫu có đủ 3 ảnh.');

  const email = 'demo@trotot.local';
  let [[owner]] = await pool.query('SELECT id FROM tenant WHERE email=?', [email]);
  if (!owner) {
    const hash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'Demo@12345', 10);
    const [result] = await pool.query("INSERT INTO tenant(full_name,phone,email,role,account_type,password_hash) VALUES('Tài khoản demo','0900000000',?,'USER','OWNER',?)", [email, hash]);
    owner = { id: result.insertId };
  }
  await pool.query('INSERT IGNORE INTO landlord(tenant_id) VALUES(?)', [owner.id]);

  await pool.query("UPDATE room SET title=TRIM(SUBSTRING(title, 8)) WHERE owner_id=? AND title LIKE '[DEMO] %'", [owner.id]);

  let created = 0;
  for (let index = 0; index < demoRooms.length; index++) {
    const room = demoRooms[index];
    const [[existing]] = await pool.query('SELECT id FROM room WHERE title=? AND owner_id=?', [room.title, owner.id]);
    if (existing) continue;
    const selected = [0, 1, 2].map(offset => `/uploads/rooms/${images[(index * 3 + offset) % images.length]}`);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query('INSERT INTO room(title,address,district,city,price,area,description,image_url,available,owner_id) VALUES(?,?,?,?,?,?,?,?,TRUE,?)', [room.title,room.address,room.district,room.city,room.price,room.area,room.description,selected[0],owner.id]);
      for (let order = 0; order < selected.length; order++) {
        await connection.query("INSERT INTO room_images(room_id,image_order,image_url,media_type) VALUES(?,?,?,'IMAGE')", [result.insertId,order,selected[order]]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
    created++;
  }
  console.log(`Đã tạo ${created} tin mẫu (tổng cộng ${demoRooms.length} tin trong danh sách demo). Tài khoản demo: ${email} / ${process.env.DEMO_PASSWORD || 'Demo@12345'}`);
}

main().catch(error => { console.error('Không thể tạo dữ liệu demo:', error.message); process.exitCode = 1; }).finally(() => pool.end());
