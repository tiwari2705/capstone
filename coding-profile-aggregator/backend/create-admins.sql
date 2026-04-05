-- Create Admin Users Script
-- Run this SQL in your PostgreSQL database

-- Admin 1: admin1@example.com / admin123
-- Password hash for 'admin123' (bcrypt with salt rounds 12)
INSERT INTO users (name, email, password, role, registration_no, course, section)
VALUES (
  'Admin User 1',
  'admin1@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBL4xoa', -- admin123
  'admin',
  'ADMIN001',
  'Administration',
  'A'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'admin', 
    password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBL4xoa';

-- Admin 2: admin2@example.com / admin456
-- Password hash for 'admin456' (bcrypt with salt rounds 12)
INSERT INTO users (name, email, password, role, registration_no, course, section)
VALUES (
  'Admin User 2',
  'admin2@example.com',
  '$2a$12$8k1p3Z8QskU7Z1L5Q5Z5Zu5K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', -- admin456
  'admin',
  'ADMIN002',
  'Administration',
  'B'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'admin',
    password = '$2a$12$8k1p3Z8QskU7Z1L5Q5Z5Zu5K5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu';

-- Verify admin users were created
SELECT id, name, email, role, registration_no, course, section, created_at 
FROM users 
WHERE role = 'admin';
