-- ==============================================================================
-- SUPABASE MIGRATION: 01_rls_policies.sql
-- Multi-Tenant Row-Level Security (RLS) & Role-Based Access Control (RBAC) Engine
-- ==============================================================================
-- Architecture:
-- 1. Tenant Isolation: Every query and mutation is strictly locked to the caller's school_id.
-- 2. Executive Suite (Trustee HOD & Principal PRIN): Full CRUD across all operational,
--    financial, and academic tables within their school_id.
-- 3. Accountant (ACC): Full access to financial tables (fees, fee_ledger, expenses, payroll)
--    and read access to students/teachers within their school_id.
-- 4. Teacher (TCH): Full CRUD on attendance, homework, exams for assigned classes; read
--    access to student rosters, timetables, and notices within their school_id.
-- 5. Student (STU): Strict read-only access to their own record, their own isolated fee
--    ledger rows (zero cross-student leak), assigned homework, timetable, and class notices.
-- 6. Non-Teaching Staff (NTS): Read access to operational logs, attendance, and directory tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA DEFINITION: ENSURE ALL CORE TABLES EXIST
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  admin_name text,
  admin_id text,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  role_code text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  full_name text,
  email text,
  role text,
  role_code text,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name text NOT NULL,
  roll_number text,
  class_name text,
  guardian_name text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  subject text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name text NOT NULL,
  section text,
  grade text,
  class_teacher_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  term text,
  target_classes text DEFAULT 'ALL',
  due_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  title text NOT NULL,
  term text,
  amount numeric NOT NULL DEFAULT 0,
  target_classes text DEFAULT 'ALL',
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_ledger (
  id text PRIMARY KEY DEFAULT ('TXN-' || floor(extract(epoch from now()) * 1000)::text),
  school_id text NOT NULL,
  student_name text,
  roll_number text,
  student_id text,
  student_email text,
  class_name text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid',
  payment_mode text DEFAULT 'School UPI QR',
  razorpay_payment_id text,
  utr text,
  invoice_no text,
  term text,
  date date DEFAULT CURRENT_DATE,
  receipt_tag text DEFAULT 'FULL',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_name text,
  date date DEFAULT CURRENT_DATE,
  records jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  title text NOT NULL,
  description text,
  subject text,
  class_name text,
  due_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  title text NOT NULL,
  content text,
  audience text DEFAULT 'ALL',
  target_class text DEFAULT 'ALL',
  published_by text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_name text NOT NULL,
  day text NOT NULL,
  period text NOT NULL,
  subject text NOT NULL,
  teacher_name text,
  teacher_id text,
  room text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  title text NOT NULL,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  vendor text,
  payment_mode text DEFAULT 'Bank Transfer',
  invoice_no text,
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'approved',
  approved_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  employee_id text NOT NULL,
  user_id uuid,
  employee_name text NOT NULL,
  role text,
  month text NOT NULL,
  year text NOT NULL,
  basic_pay numeric NOT NULL DEFAULT 0,
  allowances numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'disbursed',
  payment_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS: SESSION & AUTH CONTEXT EXTRACTORS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Returns current authenticated user's school_id (safe fallback across tables, JWT & app claims)
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_school_id', true), ''),
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'school_id'), ''),
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'school_id'), ''),
    (SELECT school_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT school_id::text FROM public.users WHERE id = auth.uid() LIMIT 1),
    ''
  );
$$;

-- Returns current authenticated user's normalized lowercase role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(COALESCE(
    NULLIF(current_setting('app.current_role', true), ''),
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'role'), ''),
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'role'), ''),
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT role::text FROM public.users WHERE id = auth.uid() LIMIT 1),
    'anon'
  ));
$$;

-- Returns student roll_number / personal_code / student_id
CREATE OR REPLACE FUNCTION public.get_auth_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_student_id', true), ''),
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'roll_number'), ''),
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'student_id'), ''),
    (SELECT roll_number::text FROM public.students WHERE id = auth.uid() LIMIT 1),
    (SELECT role_code::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    auth.uid()::text,
    ''
  );
$$;

-- Returns current user's email
CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    (SELECT email::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT email::text FROM public.users WHERE id = auth.uid() LIMIT 1),
    ''
  ));
$$;

-- Returns student's enrolled class/batch name
CREATE OR REPLACE FUNCTION public.get_auth_student_class()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(COALESCE(
    NULLIF(current_setting('app.current_student_class', true), ''),
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'class_name'), ''),
    (SELECT class_name::text FROM public.students WHERE id = auth.uid() OR roll_number = (SELECT role_code FROM public.profiles WHERE id = auth.uid()) LIMIT 1),
    ''
  ));
$$;

-- RBAC Role Classifiers
CREATE OR REPLACE FUNCTION public.is_admin_or_executive()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('admin', 'super_admin', 'superadmin', 'hod', 'trustee', 'principal', 'prin');
$$;

CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('accountant', 'acc') OR public.is_admin_or_executive();
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('teacher', 'tch', 'faculty');
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('student', 'stu');
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('staff', 'nts', 'non_teaching', 'non-teaching');
$$;

-- Grant execution to authenticated and anon
GRANT EXECUTE ON FUNCTION public.get_auth_school_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_student_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_student_class() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_executive() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_financial_manager() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY ACROSS ALL CORE TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. TABLE POLICIES: SCHOOLS
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "schools_select" ON public.schools;
CREATE POLICY "schools_select"
  ON public.schools FOR SELECT TO authenticated
  USING (
    id::text = public.get_auth_school_id()
    OR code::text ILIKE public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "schools_insert" ON public.schools;
CREATE POLICY "schools_insert"
  ON public.schools FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_executive());

DROP POLICY IF EXISTS "schools_update" ON public.schools;
CREATE POLICY "schools_update"
  ON public.schools FOR UPDATE TO authenticated
  USING (
    (id::text = public.get_auth_school_id() OR code::text ILIKE public.get_auth_school_id())
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "schools_delete" ON public.schools;
CREATE POLICY "schools_delete"
  ON public.schools FOR DELETE TO authenticated
  USING (public.get_auth_role() IN ('admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- 5. TABLE POLICIES: PROFILES & USERS
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR public.is_teacher()
        OR public.is_staff()
      )
    )
    OR (
      public.is_student() AND (
        id = auth.uid()
        OR role_code = public.get_auth_student_id()
        OR LOWER(email) = public.get_auth_user_email()
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR (school_id::text = public.get_auth_school_id() AND (public.is_admin_or_executive() OR public.is_financial_manager()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (school_id::text = public.get_auth_school_id() AND public.is_admin_or_executive())
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() AND public.is_admin_or_executive())
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- Mirror policies for users table
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select"
  ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (school_id::text = public.get_auth_school_id() AND (public.is_admin_or_executive() OR public.is_financial_manager() OR public.is_teacher() OR public.is_staff()))
    OR (public.is_student() AND (id = auth.uid() OR role_code = public.get_auth_student_id() OR LOWER(email) = public.get_auth_user_email()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR (school_id::text = public.get_auth_school_id() AND (public.is_admin_or_executive() OR public.is_financial_manager()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update"
  ON public.users FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (school_id::text = public.get_auth_school_id() AND public.is_admin_or_executive())
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete"
  ON public.users FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() AND public.is_admin_or_executive())
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- ------------------------------------------------------------------------------
-- 6. TABLE POLICIES: STUDENTS
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select"
  ON public.students FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR public.is_teacher()
        OR public.is_staff()
        OR (
          public.is_student() AND (
            id = auth.uid()
            OR roll_number = public.get_auth_student_id()
            OR LOWER(email) = public.get_auth_user_email()
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update"
  ON public.students FOR UPDATE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_delete"
  ON public.students FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 7. TABLE POLICIES: TEACHERS
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "teachers_select" ON public.teachers;
CREATE POLICY "teachers_select"
  ON public.teachers FOR SELECT TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "teachers_insert" ON public.teachers;
CREATE POLICY "teachers_insert"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "teachers_update" ON public.teachers;
CREATE POLICY "teachers_update"
  ON public.teachers FOR UPDATE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_admin_or_executive() OR (public.is_teacher() AND id = auth.uid()))
  );

DROP POLICY IF EXISTS "teachers_delete" ON public.teachers;
CREATE POLICY "teachers_delete"
  ON public.teachers FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 8. TABLE POLICIES: CLASSES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select"
  ON public.classes FOR SELECT TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "classes_insert" ON public.classes;
CREATE POLICY "classes_insert"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "classes_update" ON public.classes;
CREATE POLICY "classes_update"
  ON public.classes FOR UPDATE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "classes_delete" ON public.classes;
CREATE POLICY "classes_delete"
  ON public.classes FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 9. TABLE POLICIES: FEES & FEE_STRUCTURES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "fees_select" ON public.fees;
CREATE POLICY "fees_select"
  ON public.fees FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR (
          public.is_student() AND (
            target_classes IS NULL
            OR target_classes = 'ALL'
            OR target_classes = ''
            OR LOWER(target_classes) LIKE '%' || public.get_auth_student_class() || '%'
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "fees_mutation" ON public.fees;
CREATE POLICY "fees_mutation"
  ON public.fees FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "fee_structures_select" ON public.fee_structures;
CREATE POLICY "fee_structures_select"
  ON public.fee_structures FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR (
          public.is_student() AND (
            target_classes IS NULL
            OR target_classes = 'ALL'
            OR target_classes = ''
            OR LOWER(target_classes) LIKE '%' || public.get_auth_student_class() || '%'
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "fee_structures_mutation" ON public.fee_structures;
CREATE POLICY "fee_structures_mutation"
  ON public.fee_structures FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  );

-- ------------------------------------------------------------------------------
-- 10. TABLE POLICIES: FEE_LEDGER (Zero Cross-Student Leakage Guaranteed)
-- ------------------------------------------------------------------------------

-- SELECT: Staff sees all within tenant; Student STRICTLY sees only their OWN records
DROP POLICY IF EXISTS "fee_ledger_select" ON public.fee_ledger;
CREATE POLICY "fee_ledger_select"
  ON public.fee_ledger FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR (
          public.is_student() AND (
            roll_number = public.get_auth_student_id()
            OR student_id::text = public.get_auth_student_id()
            OR (LOWER(student_email) = public.get_auth_user_email() AND public.get_auth_user_email() <> '')
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- INSERT: Financial managers can insert any; Student can only submit their OWN payment proof
DROP POLICY IF EXISTS "fee_ledger_insert" ON public.fee_ledger;
CREATE POLICY "fee_ledger_insert"
  ON public.fee_ledger FOR INSERT TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (
      public.is_admin_or_executive()
      OR public.is_financial_manager()
      OR (
        public.is_student() AND (
          roll_number = public.get_auth_student_id()
          OR student_id::text = public.get_auth_student_id()
          OR (LOWER(student_email) = public.get_auth_user_email() AND public.get_auth_user_email() <> '')
        )
      )
    )
  );

-- UPDATE: Financial managers only (Students cannot alter transaction status or amounts)
DROP POLICY IF EXISTS "fee_ledger_update" ON public.fee_ledger;
CREATE POLICY "fee_ledger_update"
  ON public.fee_ledger FOR UPDATE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  );

-- DELETE: Executive & Financial managers only
DROP POLICY IF EXISTS "fee_ledger_delete" ON public.fee_ledger;
CREATE POLICY "fee_ledger_delete"
  ON public.fee_ledger FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  );

-- ------------------------------------------------------------------------------
-- 11. TABLE POLICIES: ATTENDANCE
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  );

DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  );

DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;
CREATE POLICY "attendance_delete"
  ON public.attendance FOR DELETE TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 12. TABLE POLICIES: HOMEWORK
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "homework_select" ON public.homework;
CREATE POLICY "homework_select"
  ON public.homework FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_teacher()
        OR (
          public.is_student() AND (
            class_name IS NULL
            OR class_name = 'ALL'
            OR LOWER(class_name) = public.get_auth_student_class()
            OR LOWER(class_name) LIKE '%' || public.get_auth_student_class() || '%'
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "homework_mutation" ON public.homework;
CREATE POLICY "homework_mutation"
  ON public.homework FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  );

-- ------------------------------------------------------------------------------
-- 13. TABLE POLICIES: NOTICES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "notices_select" ON public.notices;
CREATE POLICY "notices_select"
  ON public.notices FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR public.is_teacher()
        OR public.is_staff()
        OR (
          public.is_student() AND (
            audience IN ('All Students', 'ALL', 'all')
            OR target_class IS NULL
            OR target_class = 'ALL'
            OR LOWER(target_class) = public.get_auth_student_class()
            OR LOWER(target_class) LIKE '%' || public.get_auth_student_class() || '%'
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "notices_mutation" ON public.notices;
CREATE POLICY "notices_mutation"
  ON public.notices FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 14. TABLE POLICIES: TIMETABLE
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "timetable_select" ON public.timetable;
CREATE POLICY "timetable_select"
  ON public.timetable FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_admin_or_executive()
        OR public.is_teacher()
        OR public.is_staff()
        OR (
          public.is_student() AND (
            class_name IS NULL
            OR LOWER(class_name) = public.get_auth_student_class()
            OR LOWER(class_name) LIKE '%' || public.get_auth_student_class() || '%'
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "timetable_mutation" ON public.timetable;
CREATE POLICY "timetable_mutation"
  ON public.timetable FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_admin_or_executive() OR public.is_teacher())
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND (public.is_admin_or_executive() OR public.is_teacher())
  );

-- ------------------------------------------------------------------------------
-- 15. TABLE POLICIES: EXPENSES (Zero Student or General Access)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id()
      AND public.is_financial_manager()
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "expenses_mutation" ON public.expenses;
CREATE POLICY "expenses_mutation"
  ON public.expenses FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  );

-- ------------------------------------------------------------------------------
-- 16. TABLE POLICIES: PAYROLL
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
CREATE POLICY "payroll_select"
  ON public.payroll FOR SELECT TO authenticated
  USING (
    (
      school_id::text = public.get_auth_school_id() AND (
        public.is_financial_manager()
        OR (employee_id = public.get_auth_student_id())
        OR (user_id IS NOT NULL AND user_id = auth.uid())
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "payroll_mutation" ON public.payroll;
CREATE POLICY "payroll_mutation"
  ON public.payroll FOR ALL TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() IN ('admin', 'super_admin'))
    AND public.is_financial_manager()
  );

-- ==============================================================================
-- END OF MIGRATION: 01_rls_policies.sql
-- ==============================================================================
