-- Expense Voucher Management System: MySQL 8 schema
CREATE DATABASE IF NOT EXISTS expense_voucher_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE expense_voucher_db;

CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('EMPLOYEE','DIRECTOR','ACCOUNTS') NOT NULL,
  employee_code  VARCHAR(30) NULL,
  department     VARCHAR(100) NULL,
  signature_path VARCHAR(255) NULL,          -- saved signature, reused on later vouchers
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- One counter row per year; keeps voucher numbers unique and gap-free under concurrency
CREATE TABLE IF NOT EXISTS voucher_sequences (
  year    INT PRIMARY KEY,
  last_no INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vouchers (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  voucher_number     VARCHAR(20) NOT NULL UNIQUE,      -- e.g. EV-2026-00001
  user_id            INT NOT NULL,                     -- employee who created it
  voucher_date       DATE NOT NULL,
  expense_date       DATE NOT NULL,
  department         VARCHAR(100) NOT NULL,
  title              VARCHAR(200) NOT NULL,
  category           VARCHAR(100) NULL,
  description        TEXT NULL,
  amount             DECIMAL(12,2) NOT NULL,
  status             ENUM('DRAFT','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  employee_signature VARCHAR(255) NULL,
  director_signature VARCHAR(255) NULL,
  director_id        INT NULL,
  approval_date      DATETIME NULL,
  rejection_reason   TEXT NULL,
  decided_at         DATETIME NULL,                    -- approve or reject time (dashboard "today" counts)
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_v_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_v_director FOREIGN KEY (director_id) REFERENCES users(id),
  CONSTRAINT chk_amount CHECK (amount > 0),
  INDEX idx_v_user (user_id),
  INDEX idx_v_status (status),
  INDEX idx_v_expense_date (expense_date)
) ENGINE=InnoDB;
