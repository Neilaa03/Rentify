-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.car_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  car_id uuid NOT NULL,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  uploaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT car_images_pkey PRIMARY KEY (id),
  CONSTRAINT car_images_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.cars (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  brand character varying NOT NULL,
  model character varying NOT NULL,
  year integer,
  color character varying,
  fuel_type character varying,
  transmission character varying,
  mileage integer,
  seats integer,
  registration_number character varying,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  approval_status character varying DEFAULT 'pending'::character varying,
  is_hidden boolean DEFAULT false,
  CONSTRAINT cars_pkey PRIMARY KEY (id),
  CONSTRAINT cars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.code (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pickup_id uuid NOT NULL,
  code character varying NOT NULL,
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT code_pkey PRIMARY KEY (id),
  CONSTRAINT code_pickup_id_fkey FOREIGN KEY (pickup_id) REFERENCES public.pickup(id)
);
CREATE TABLE public.company (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  manager_id uuid NOT NULL,
  company_name character varying NOT NULL,
  company_email character varying,
  company_phone character varying,
  address text,
  city character varying,
  country character varying,
  registration_number character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT company_pkey PRIMARY KEY (id),
  CONSTRAINT company_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  car_id uuid,
  company_id uuid,
  document_type USER-DEFINED NOT NULL,
  document_url text NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::document_status,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT documents_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id),
  CONSTRAINT documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.escrow_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL UNIQUE,
  payment_intent_id text NOT NULL,
  stripe_transfer_id text,
  client_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  amount numeric NOT NULL,
  status USER-DEFINED DEFAULT 'held_in_escrow'::payment_status,
  held_at timestamp without time zone DEFAULT now(),
  released_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT escrow_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT escrow_transactions_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT escrow_transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT escrow_transactions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.facture (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  invoice_number character varying UNIQUE,
  total_amount numeric,
  issued_at timestamp without time zone DEFAULT now(),
  CONSTRAINT facture_pkey PRIMARY KEY (id),
  CONSTRAINT facture_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT favorites_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT feedback_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id)
);
CREATE TABLE public.listings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  car_id uuid NOT NULL,
  title character varying,
  description text,
  city character varying,
  country character varying,
  price_per_day numeric,
  price_per_week numeric,
  price_per_month numeric,
  available_from date,
  available_to date,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  pickup_address text,
  delivery_fee numeric DEFAULT 0 CHECK (delivery_fee IS NULL OR delivery_fee >= 0::numeric),
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method character varying DEFAULT 'card'::character varying CHECK (payment_method::text = ANY (ARRAY['card'::character varying, 'cash'::character varying]::text[])),
  transaction_reference text,
  status USER-DEFINED DEFAULT 'pending'::payment_status,
  paid_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  currency character varying NOT NULL DEFAULT 'EUR'::character varying,
  provider character varying,
  updated_at timestamp without time zone DEFAULT now(),
  payment_intent_id text,
  stripe_transfer_id text,
  escrow_status USER-DEFINED DEFAULT 'pending'::payment_status,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.pickup (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::pickup_status,
  confirmed_at timestamp without time zone,
  pickup_method text CHECK (pickup_method IS NULL OR (pickup_method = ANY (ARRAY['owner_place'::text, 'company_place'::text, 'renter_delivery'::text]))),
  pickup_address text,
  delivery_fee numeric DEFAULT 0 CHECK (delivery_fee IS NULL OR delivery_fee >= 0::numeric),
  pickup_code_hash text,
  pickup_code_expires_at timestamp without time zone,
  pickup_verified_at timestamp without time zone,
  pickup_verified_by uuid,
  pickup_attempts integer DEFAULT 0 CHECK (pickup_attempts IS NULL OR pickup_attempts >= 0),
  pickup_qr_token_hash text,
  return_code_hash text,
  return_qr_token_hash text,
  return_code_expires_at timestamp without time zone,
  return_verified_at timestamp without time zone,
  return_verified_by uuid,
  return_attempts integer DEFAULT 0,
  CONSTRAINT pickup_pkey PRIMARY KEY (id),
  CONSTRAINT pickup_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT pickup_pickup_verified_by_fkey FOREIGN KEY (pickup_verified_by) REFERENCES public.users(id)
);
CREATE TABLE public.refunds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  payment_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text,
  status USER-DEFINED DEFAULT 'pending'::refund_status,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT refunds_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reason text,
  description text,
  status USER-DEFINED DEFAULT 'pending'::report_status,
  created_at timestamp without time zone DEFAULT now(),
  target_type character varying DEFAULT 'user'::character varying,
  reported_car_id uuid,
  reported_review_id uuid,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id),
  CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id),
  CONSTRAINT reports_reported_car_id_fkey FOREIGN KEY (reported_car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL,
  renter_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_price numeric NOT NULL,
  status USER-DEFINED DEFAULT 'reserved'::reservation_status,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT reservations_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_balances (
  user_id uuid NOT NULL,
  pending_balance numeric DEFAULT 0,
  available_balance numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_balances_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
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