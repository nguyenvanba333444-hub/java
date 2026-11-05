const mysql = require('mysql2/promise');
require('dotenv').config();
const pool = mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'roomdb',waitForConnections:true,connectionLimit:10,charset:'utf8mb4'});
async function ensureForeignKey(table, constraint, column, parent, onDelete) {
 const [[found]] = await pool.query('SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?', [table,constraint]);
 if (Number(found.total)) return;
 const [[orphans]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\` AS c LEFT JOIN \`${parent}\` AS p ON c.\`${column}\`=p.id WHERE p.id IS NULL`);
 if (Number(orphans.total)) {
  console.warn(`Bỏ qua khóa ngoại ${constraint}: ${orphans.total} dòng mồ côi cần được xử lý thủ công.`);
  return;
 }
 await pool.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${parent}\`(id) ON DELETE ${onDelete}`);
}
async function ensureAppSessionTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS app_session(session_id VARCHAR(128) NOT NULL PRIMARY KEY,session_data MEDIUMTEXT NOT NULL,expires_at BIGINT NOT NULL,INDEX idx_app_session_expiry(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
async function initializeDatabase(){
 const setup = await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
 const dbName = (process.env.DB_NAME || 'roomdb').replace(/[^a-zA-Z0-9_]/g, '');
 await setup.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 await setup.end();
 await pool.query(`CREATE TABLE IF NOT EXISTS tenant(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,full_name VARCHAR(120) NOT NULL,phone VARCHAR(30) NOT NULL,email VARCHAR(190) NOT NULL UNIQUE,role ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',account_type ENUM('TENANT','OWNER') DEFAULT 'TENANT',password_hash VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await ensureAppSessionTable();
 await pool.query("ALTER TABLE tenant MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'");
 await pool.query("UPDATE tenant SET role=UPPER(TRIM(role))");
 await pool.query("UPDATE tenant SET role='USER' WHERE UPPER(role) IN ('OWNER','TENANT')");
 await pool.query("UPDATE tenant SET role='USER' WHERE role NOT IN ('ADMIN','USER')");
 await pool.query("ALTER TABLE tenant MODIFY COLUMN role ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER'");
 await pool.query(`CREATE TABLE IF NOT EXISTS room(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL,address VARCHAR(255) NOT NULL,district VARCHAR(120) NOT NULL,city VARCHAR(120) NOT NULL,price DECIMAL(15,2) NOT NULL,area DECIMAL(9,2) NOT NULL,description TEXT,image_url VARCHAR(500),available BOOLEAN NOT NULL DEFAULT TRUE,owner_id INT NOT NULL,INDEX idx_room_owner(owner_id),INDEX idx_room_city(city)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query('ALTER TABLE room MODIFY COLUMN price DECIMAL(15,2) NOT NULL, MODIFY COLUMN area DECIMAL(9,2) NOT NULL');
 await pool.query("ALTER TABLE room ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL, ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL");
 await pool.query(`CREATE TABLE IF NOT EXISTS landlord(tenant_id INT NOT NULL PRIMARY KEY,id INT NOT NULL AUTO_INCREMENT UNIQUE,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query("ALTER TABLE landlord ADD COLUMN IF NOT EXISTS id INT NOT NULL AUTO_INCREMENT UNIQUE FIRST");
 await pool.query("INSERT IGNORE INTO landlord(tenant_id) SELECT t.id FROM tenant t LEFT JOIN room r ON r.owner_id=t.id WHERE t.role='USER' AND (t.account_type='OWNER' OR r.id IS NOT NULL) ORDER BY t.id");
 await pool.query("UPDATE tenant SET account_type='OWNER' WHERE id IN (SELECT tenant_id FROM landlord)");
 await pool.query(`CREATE TABLE IF NOT EXISTS room_images(room_id INT NOT NULL,image_order INT NOT NULL,image_url VARCHAR(500) NOT NULL,PRIMARY KEY(room_id,image_order),INDEX idx_room_images_room(room_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query("ALTER TABLE room_images ADD COLUMN IF NOT EXISTS media_type ENUM('IMAGE','VIDEO') NOT NULL DEFAULT 'IMAGE'");
 await pool.query("ALTER TABLE room_images ADD COLUMN IF NOT EXISTS public_id VARCHAR(255) NULL");
 await pool.query(`CREATE TABLE IF NOT EXISTS booking(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,room_id INT NOT NULL,tenant_id INT NOT NULL,start_date VARCHAR(10) NOT NULL,end_date VARCHAR(10) NOT NULL,status VARCHAR(30) NOT NULL DEFAULT 'PENDING',INDEX idx_booking_tenant(tenant_id),INDEX idx_booking_room(room_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query("ALTER TABLE booking ADD COLUMN IF NOT EXISTS deposit_amount BIGINT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS payment_code VARCHAR(40) NULL, ADD COLUMN IF NOT EXISTS payment_status ENUM('NOT_CONFIGURED','PENDING','PAID') NOT NULL DEFAULT 'NOT_CONFIGURED'");
 await pool.query("ALTER TABLE booking ADD COLUMN IF NOT EXISTS payment_method ENUM('BANK_TRANSFER','CASH') NOT NULL DEFAULT 'BANK_TRANSFER'");
 await pool.query(`CREATE TABLE IF NOT EXISTS user_favorite(user_id INT NOT NULL,room_id INT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,room_id),INDEX idx_favorite_room(room_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS room_review(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,room_id INT NOT NULL,user_id INT NOT NULL,rating TINYINT NOT NULL,comment VARCHAR(1000) NOT NULL DEFAULT '',created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_room_review_user(room_id,user_id),INDEX idx_room_review_created(created_at),INDEX idx_room_review_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await ensureForeignKey('room','fk_room_owner','owner_id','tenant','RESTRICT');
 await ensureForeignKey('landlord','fk_landlord_tenant','tenant_id','tenant','CASCADE');
 await ensureForeignKey('room_images','fk_room_images_room','room_id','room','CASCADE');
 await ensureForeignKey('booking','fk_booking_room','room_id','room','CASCADE');
 await ensureForeignKey('booking','fk_booking_tenant','tenant_id','tenant','RESTRICT');
 await ensureForeignKey('user_favorite','fk_favorite_user','user_id','tenant','CASCADE');
 await ensureForeignKey('user_favorite','fk_favorite_room','room_id','room','CASCADE');
 await ensureForeignKey('room_review','fk_review_room','room_id','room','CASCADE');
 await ensureForeignKey('room_review','fk_review_user','user_id','tenant','CASCADE');
}
module.exports={pool,initializeDatabase,ensureAppSessionTable};
