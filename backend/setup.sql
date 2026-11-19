-- Run this once with an admin account (or paste it into DBeaver as root).
-- It creates the database and the application user used by backend/.env.

CREATE DATABASE IF NOT EXISTS paisa_ledger
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'paisa'@'%' IDENTIFIED BY 'paisa_dev_2026';
ALTER USER 'paisa'@'%' IDENTIFIED BY 'paisa_dev_2026';
GRANT ALL PRIVILEGES ON paisa_ledger.* TO 'paisa'@'%';
FLUSH PRIVILEGES;

-- Tables are created automatically by the backend on first start.
-- After starting the server you can inspect them in DBeaver:
--   host 127.0.0.1 · port 3306 · database paisa_ledger
--   user paisa · password paisa_dev_2026
