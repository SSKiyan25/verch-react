-- Explicitly enable pgcrypto in the extensions schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

DO $$ 
DECLARE 
  admin_id UUID := '00000000-0000-0000-0000-000000000001'; 
  admin_email TEXT := 'admin@verch.com';
  admin_password TEXT := 'password123';
BEGIN
  -- 1. Insert the user into the hidden auth schema
-- 1. Insert the user into the hidden auth schema
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    admin_email,
    extensions.crypt(admin_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}', 
    NOW(),
    NOW(),
    '', -- confirmation_token
    '', -- recovery_token
    '', -- email_change_token_new
    ''  -- email_change
  ) ON CONFLICT (id) DO NOTHING;
  
  -- 2. Link an identity so the user can log in with email/password
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    admin_id,
    admin_id,
    format('{"sub": "%s", "email": "%s"}', admin_id, admin_email)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;

  -- 3. Insert into your public.users table as the Verch Admin
  INSERT INTO public.users (
    id,
    full_name,
    role,
    is_verified,
    has_agreed_to_terms,
    organization_id,
    avatar_url
  ) VALUES (
    admin_id,
    'Verch System Admin',
    'admin', 
    true,    
    true,    
    NULL,    
    NULL     
  ) ON CONFLICT (id) DO NOTHING;

END $$;

-- Seed public product_categories
INSERT INTO public.product_categories (
  id,
  organization_id,
  name,
  slug,
  description,
  parent_id,
  sort_order,
  is_active,
  is_custom,
  icon
) VALUES
  ('16319384-f04a-420f-b307-da0ff326097f', NULL, 'T-Shirt', 't-shirt', 'Cotton and custom printed t-shirts', NULL, 1, true, false, NULL),
  ('c5715bf0-7b15-46d9-92af-7278d0d74a91', NULL, 'Polo T-Shirt', 'polo-t-shirt', 'Collared polo shirts', NULL, 2, true, false, NULL),
  ('c2e4ceee-8d37-4334-93fd-835b702caf51', NULL, 'Dry-Fit T-Shirt', 'dry-fit-t-shirt', 'Moisture-wicking athletic shirts', NULL, 3, true, false, NULL),
  ('39b2e1ff-0310-48a2-8f3f-ab6287ff27d0', NULL, 'Umbrella', 'umbrella', 'Folding and straight umbrellas', NULL, 4, true, false, NULL),
  ('b81041e6-0a08-4959-a079-800d60c5d656', NULL, 'Cup', 'cup', 'Tumblers, mugs, and drinking vessels', NULL, 5, true, false, NULL),
  ('8540c756-56f9-4a39-b8eb-d6c796cb55dd', NULL, 'Lace/Lanyard', 'lace-lanyard', 'ID lanyards and shoe laces', NULL, 6, true, false, NULL),
  ('8ba12434-92e8-4ca5-bab9-bf48e5b40151', NULL, 'Hoodies & Jackets', 'hoodies-jackets', 'Hooded sweatshirts and jackets', NULL, 7, true, false, NULL),
  ('8b99c794-97ea-4b69-ae25-45bbe3d23b99', NULL, 'Accessories', 'accessories', 'Keychains, pins, and other accessories', NULL, 8, true, false, NULL),
  ('17f3798c-f097-4b75-80c6-31aa36cd05a2', NULL, 'Bags', 'bags', 'Tote bags, backpacks, and pouches', NULL, 9, true, false, NULL),
  ('7973dbdf-a99b-4ea2-b5f6-52a70262b942', NULL, 'Stationery', 'stationery', 'Notebooks, pens, and school supplies', NULL, 10, true, false, NULL),
  ('37322413-5109-4c4b-99be-b7fdba90b9e8', NULL, 'Others', 'others', 'Other merchandise categories', NULL, 99, true, false, NULL)
ON CONFLICT (id) DO NOTHING;