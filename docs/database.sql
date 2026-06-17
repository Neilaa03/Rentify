-- =========================================================
-- EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE user_role AS ENUM (
    'client',
    'companyManager',
    'owner',
    'admin'
);

CREATE TYPE agency_verification_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'INCOMPLETE'
);

CREATE TYPE reservation_status AS ENUM (
    'confirmed',
    'cancelled',
    'reserved',
    'refunded',
    'refund_pending',
    'pickup_pending',
    'return_pending',
    'finished'
);

CREATE TYPE pickup_status AS ENUM (
    'pending',
    'confirmed',
    'expired'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'completed',
    'pending_cash'
);

CREATE TYPE refund_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);

CREATE TYPE report_status AS ENUM (
    'pending',
    'reviewed',
    'resolved',
    'rejected'
);

CREATE TYPE document_status AS ENUM (
    'pending',
    'manual_review',
    'approved',
    'rejected'
);

CREATE TYPE document_type AS ENUM (
    -- USER DOCUMENTS
    'identity_card',
    'passport',
    'driver_license',

    -- CAR DOCUMENTS
    'carte_grise',
    'insurance',
    'technical_control',

    -- COMPANY DOCUMENTS
    'business_registration',
    'nif',
    'professional_insurance'
);

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name character varying,
  last_name character varying,
  phone character varying,
  profile_picture text,
  bio text,
  role USER-DEFINED NOT NULL DEFAULT 'client'::user_role,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  stripe_account_id text,
  email_verified_at timestamp with time zone,
  email_verification_token_hash text,
  email_verification_expires_at timestamp with time zone,
  password_reset_token_hash text,
  password_reset_expires_at timestamp with time zone,
  google_sub text,
  auth_provider text DEFAULT 'password'::text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- =========================================================
-- USER BALANCES
-- =========================================================

CREATE TABLE user_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    pending_balance NUMERIC(10,2) DEFAULT 0,
    available_balance NUMERIC(10,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- COMPANY
-- =========================================================

CREATE TABLE company (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    company_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    commercial_name VARCHAR(255),
    corporate_name VARCHAR(255),
    nif VARCHAR(32),
    manager_name VARCHAR(255),
    manager_phone VARCHAR(50),
    verification_status agency_verification_status DEFAULT 'INCOMPLETE',
    completion_percentage INTEGER DEFAULT 0,

    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),

    registration_number VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- CARS
-- =========================================================

CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,

    year INTEGER,
    color VARCHAR(50),

    fuel_type VARCHAR(50),
    transmission VARCHAR(50),

    mileage INTEGER,
    seats INTEGER,

    registration_number VARCHAR(100),
    visible_by_tenants BOOLEAN DEFAULT TRUE,

    description TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- DOCUMENTS
-- =========================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    car_id UUID REFERENCES cars(id) ON DELETE CASCADE,

    company_id UUID REFERENCES company(id) ON DELETE CASCADE,

    document_type document_type NOT NULL,

    document_url TEXT NOT NULL,

    status document_status DEFAULT 'pending',

    reviewed_by UUID REFERENCES users(id),

    reviewed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    CHECK (
        (user_id IS NOT NULL)::int +
        (car_id IS NOT NULL)::int +
        (company_id IS NOT NULL)::int = 1
    )
);

CREATE TABLE IF NOT EXISTS document_ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    document_id UUID NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    ocr_text TEXT,
    extracted_full_name TEXT,
    extracted_document_number TEXT,
    extracted_expiration_date DATE,
    confidence_score NUMERIC(5,2),
    verification_status document_status NOT NULL DEFAULT 'manual_review',
    verification_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =========================================================
-- CAR IMAGES
-- =========================================================

CREATE TABLE car_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

    image_url TEXT NOT NULL,

    is_primary BOOLEAN DEFAULT FALSE,

    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- LISTINGS
-- =========================================================

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

    title VARCHAR(255),
    description TEXT,

    city VARCHAR(100),
    country VARCHAR(100),

    price_per_day NUMERIC(10,2),
    price_per_week NUMERIC(10,2),
    price_per_month NUMERIC(10,2),

    available_from DATE,
    available_to DATE,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- FAVORITES
-- =========================================================

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (user_id, listing_id)
);

-- =========================================================
-- RESERVATIONS
-- =========================================================

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

    renter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    total_price NUMERIC(10,2) NOT NULL,

    status reservation_status DEFAULT 'reserved',

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- PICKUP
-- =========================================================

CREATE TABLE pickup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,

    status pickup_status DEFAULT 'pending',

    confirmed_at TIMESTAMP
);

-- =========================================================
-- PICKUP CODE
-- =========================================================

CREATE TABLE code (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    pickup_id UUID NOT NULL REFERENCES pickup(id) ON DELETE CASCADE,

    flow TEXT NOT NULL DEFAULT 'pickup' CHECK (flow IN ('pickup', 'return')),

    code TEXT NOT NULL,

    qr_token_hash TEXT,

    expires_at TIMESTAMP,

    verified_at TIMESTAMP,

    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,

    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX code_pickup_id_flow_idx ON code (pickup_id, flow);

-- =========================================================
-- FEEDBACK
-- =========================================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,

    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    rating INTEGER CHECK (rating >= 1 AND rating <= 5),

    comment TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- PAYMENTS
-- =========================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,

    amount NUMERIC(10,2) NOT NULL,

    payment_method VARCHAR(50) DEFAULT 'card', -- 'card' or 'cash'

    transaction_reference TEXT,

    transaction_reference TEXT,

    status payment_status DEFAULT 'pending',

    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- REFUNDS
-- =========================================================

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

    amount NUMERIC(10,2) NOT NULL,

    reason TEXT,

    status refund_status DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- FACTURES / INVOICES
-- =========================================================

CREATE TABLE facture (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,

    invoice_number VARCHAR(100) UNIQUE,

    total_amount NUMERIC(10,2),

    issued_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- REPORTS
-- =========================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    reason TEXT,
    description TEXT,

    status report_status DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    -- reservation_created | payment_success | message | etc

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    data JSONB, 
    -- store ids like reservationId, messageId

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- MESSAGES
-- =========================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    message TEXT NOT NULL,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_cars_owner_id ON cars(owner_id);

CREATE INDEX idx_documents_user_id ON documents(user_id);

CREATE INDEX idx_documents_car_id ON documents(car_id);

CREATE INDEX idx_documents_company_id ON documents(company_id);

CREATE INDEX idx_listings_car_id ON listings(car_id);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);

CREATE INDEX idx_favorites_listing_id ON favorites(listing_id);

CREATE INDEX idx_reservations_listing_id ON reservations(listing_id);

CREATE INDEX idx_reservations_renter_id ON reservations(renter_id);

CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);

CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_document_ocr_results_document_id ON document_ocr_results(document_id);



-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_ocr_results_updated_at ON document_ocr_results;

CREATE TRIGGER trg_document_ocr_results_updated_at
BEFORE UPDATE ON document_ocr_results
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
