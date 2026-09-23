-- Empire Cab Ecosystem - Hostinger Remote MySQL Central Database Schema
-- Database Name: u889282535_taxi
-- Host: srv1671.hstgr.io
-- Last Updated: August 14, 2026

CREATE DATABASE IF NOT EXISTS `u889282535_taxi` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `u889282535_taxi`;

-- --------------------------------------------------------
-- 1. Table structure for `inquiries` (Ride Bookings & Inquiries)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'Unique Inquiry ID (e.g. INQ-9855)',
  `customerName` VARCHAR(255) NOT NULL COMMENT 'Customer Full Name',
  `customerPhone` VARCHAR(64) NOT NULL COMMENT 'Customer Phone Number',
  `customerEmail` VARCHAR(255) DEFAULT NULL COMMENT 'Customer Email Address',
  `pickup` TEXT NOT NULL COMMENT 'Pick-up Location Address',
  `dropoff` TEXT NOT NULL COMMENT 'Drop-off Destination Address',
  `vehicle` VARCHAR(100) DEFAULT 'Standard' COMMENT 'Selected Vehicle Class (SWIFT, ERTIGA, INNOVA CRYSTA)',
  `fare` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Final Payable Fare Amount (₹)',
  `originalFare` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Base Fare before discounts (₹)',
  `walletDiscountUsed` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Wallet reward discount applied (₹)',
  `tripType` VARCHAR(100) DEFAULT 'One-Way' COMMENT 'Trip Type (One-Way, Round Trip, Outstation, Local Rental)',
  `scheduledDate` VARCHAR(100) DEFAULT 'Today' COMMENT 'Scheduled Departure Date',
  `scheduledTime` VARCHAR(100) DEFAULT '' COMMENT 'Scheduled Departure Time',
  `driver` VARCHAR(255) DEFAULT 'Unassigned' COMMENT 'Assigned Fleet Driver Name',
  `status` VARCHAR(64) DEFAULT 'Pending' COMMENT 'Booking Status (Pending, Confirmed, Completed, Cancelled)',
  `rewardIssued` INT DEFAULT 0 COMMENT 'Flag indicating if Admin reward was issued (1 = Issued, 0 = Pending)',
  `rewardAmount` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Issued Reward Amount (₹)',
  `paymentMethod` VARCHAR(100) DEFAULT 'Cash' COMMENT 'Payment Option (Cash, UPI, Wallet, Credit Card)',
  `notes` TEXT DEFAULT NULL COMMENT 'Additional Trip Instructions / Flight Numbers',
  `timestamp` VARCHAR(100) DEFAULT NULL COMMENT 'ISO Timestamp of creation',
  `date` VARCHAR(100) DEFAULT NULL COMMENT 'Formated Creation Date',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inq_phone` (`customerPhone`),
  INDEX `idx_inq_status` (`status`),
  INDEX `idx_inq_reward` (`rewardIssued`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 2. Table structure for `customers` (Rider & Client Directory)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'Unique Customer ID (e.g. CUST-9876543210)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Full Name',
  `phone` VARCHAR(64) NOT NULL COMMENT 'Primary Contact Number',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'Email Address',
  `photoURL` TEXT DEFAULT NULL COMMENT 'Avatar / Profile Picture URL',
  `profession` VARCHAR(100) DEFAULT 'Rider' COMMENT 'Occupation / Profession',
  `area` VARCHAR(255) DEFAULT 'Gujarat, India' COMMENT 'City / District / Area',
  `totalRides` INT DEFAULT 0 COMMENT 'Total Completed Rides Count',
  `totalSpent` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Cumulative Total Spent Amount (₹)',
  `registeredAt` VARCHAR(64) DEFAULT NULL COMMENT 'Date Registered',
  `lastLogin` VARCHAR(100) DEFAULT NULL COMMENT 'ISO Timestamp of last login/activity',
  `status` VARCHAR(64) DEFAULT 'Active' COMMENT 'Account Status (Active, VIP, Suspended)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cust_phone` (`phone`),
  INDEX `idx_cust_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 3. Table structure for `customer_wallets` (Digital Reward Wallet)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_wallets` (
  `phone` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'Sanitized 10-Digit Customer Phone Number',
  `balance` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Current Available Wallet Balance (₹)',
  `transactions` LONGTEXT DEFAULT NULL COMMENT 'JSON array of transaction logs (credits, debits, trip rewards)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wallet_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 4. Table structure for `drivers` (Active Fleet Roster)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'Driver ID',
  `name` VARCHAR(255) NOT NULL COMMENT 'Driver Name',
  `phone` VARCHAR(64) NOT NULL COMMENT 'Driver Phone Number',
  `vehicleNo` VARCHAR(64) DEFAULT NULL COMMENT 'Assigned Vehicle Number',
  `vehicleModel` VARCHAR(100) DEFAULT NULL COMMENT 'Vehicle Make & Model',
  `status` VARCHAR(64) DEFAULT 'Available' COMMENT 'Driver Status (Available, On-Ride, Off-Duty)',
  `rating` DECIMAL(3,2) DEFAULT 5.00 COMMENT 'Driver Rating',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 5. Table structure for `places` (Available Gujarat Cities / Locations)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `places` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique Place ID',
  `name` VARCHAR(150) NOT NULL UNIQUE COMMENT 'City / Place Name',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed / Insert 30 Gujarat Cities into `places`
INSERT INTO `places` (`name`) VALUES
('Ahmedabad'),
('Surat'),
('Vadodara (Baroda)'),
('Rajkot'),
('Bhavnagar'),
('Jamnagar'),
('Junagadh'),
('Gandhinagar'),
('Anand'),
('Bharuch'),
('Navsari'),
('Morbi'),
('Surendranagar'),
('Gandhidham'),
('Nadiad'),
('Porbandar'),
('Mehsana'),
('Bhuj'),
('Veraval'),
('Vapi'),
('Valsad'),
('Godhra'),
('Palanpur'),
('Patan'),
('Botad'),
('Amreli'),
('Gondal'),
('Dahod'),
('Himmatnagar'),
('Ankleshwar')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- --------------------------------------------------------
-- 6. Table structure for `routes` (Fixed Route Pricing & Travel Duration)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `routes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'Unique Route ID',
  `pickup` VARCHAR(150) NOT NULL COMMENT 'Origin Place',
  `dropoff` VARCHAR(150) NOT NULL COMMENT 'Destination Place',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Fixed Fare in Rupees (₹)',
  `duration` VARCHAR(100) DEFAULT '' COMMENT 'Travel Duration (e.g. 2 Hr 30 MIN)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_route_pair` (`pickup`, `dropoff`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

