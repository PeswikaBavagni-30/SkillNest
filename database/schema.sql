-- ============================================================
-- SKILLNEST DATABASE SCHEMA
-- Includes Member 1 (Auth), Member 2 (Services),
-- Member 3 (Bookings), and Member 4 (Payments & Notifications)
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'customer',
    'provider',
    'admin'
);

CREATE TYPE booking_status AS ENUM (
    'pending',
    'accepted',
    'completed',
    'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'success',
    'failed',
    'refunded'
);

-- ============================================================
-- 1. USERS TABLE (Member 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    address TEXT,
    profile_image TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. SERVICE CATEGORIES TABLE (Member 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS service_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. SERVICES TABLE (Member 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    category_id UUID NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    location VARCHAR(255),
    availability BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_services_provider
        FOREIGN KEY (provider_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_services_category
        FOREIGN KEY (category_id)
        REFERENCES service_categories(category_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 4. BOOKINGS TABLE (Member 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    service_id UUID NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    address TEXT NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_bookings_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_bookings_service
        FOREIGN KEY (service_id)
        REFERENCES services(service_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 5. PAYMENTS TABLE (Member 4)
-- Supported statuses: 'pending', 'success', 'failed', 'refunded'
-- Designed with mock gateway architecture, extensible for real gateways
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'mock_payment',
    transaction_id VARCHAR(255),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 6. NOTIFICATIONS TABLE (Member 4)
-- Tracks in-app notifications for bookings, payments, and account events
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 7. REVIEWS TABLE (Member 3 / Future)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reviews_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reviews_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
