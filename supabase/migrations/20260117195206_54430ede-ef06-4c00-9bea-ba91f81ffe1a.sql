-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'receptionist', 'financial', 'professional');

-- Enum para status de agendamento
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled');

-- Enum para tipo de transação financeira
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Enum para método de pagamento
CREATE TYPE public.payment_method AS ENUM ('cash', 'pix', 'credit_card', 'debit_card', 'other');

-- Enum para movimento de estoque
CREATE TYPE public.stock_movement_type AS ENUM ('entry', 'exit', 'adjustment');

-- Tabela de Salões (multi-tenant)
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Perfis de Usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, salon_id, role)
);

-- Tabela de Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Serviços
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Profissionais
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Agendamentos
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Comandas
CREATE TABLE public.comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Itens da Comanda
CREATE TABLE public.comanda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  product_id UUID,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'service',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Pagamentos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Produtos (Estoque)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  cost_price DECIMAL(10,2) DEFAULT 0,
  sale_price DECIMAL(10,2) DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Movimentações de Estoque
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Transações Financeiras
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para obter salon_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_salon_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salon_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Políticas RLS para Salons
CREATE POLICY "Users can view their salon"
  ON public.salons FOR SELECT
  TO authenticated
  USING (id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Admins can update their salon"
  ON public.salons FOR UPDATE
  TO authenticated
  USING (id = public.get_user_salon_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para Profiles
CREATE POLICY "Users can view profiles in their salon"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para User Roles
CREATE POLICY "Users can view roles in their salon"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Clients
CREATE POLICY "Users can view clients in their salon"
  ON public.clients FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert clients in their salon"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update clients in their salon"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete clients in their salon"
  ON public.clients FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Services
CREATE POLICY "Users can view services in their salon"
  ON public.services FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert services in their salon"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update services in their salon"
  ON public.services FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete services in their salon"
  ON public.services FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Professionals
CREATE POLICY "Users can view professionals in their salon"
  ON public.professionals FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert professionals in their salon"
  ON public.professionals FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update professionals in their salon"
  ON public.professionals FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete professionals in their salon"
  ON public.professionals FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Appointments
CREATE POLICY "Users can view appointments in their salon"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert appointments in their salon"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update appointments in their salon"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete appointments in their salon"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Comandas
CREATE POLICY "Users can view comandas in their salon"
  ON public.comandas FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert comandas in their salon"
  ON public.comandas FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update comandas in their salon"
  ON public.comandas FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Comanda Items
CREATE POLICY "Users can view comanda items"
  ON public.comanda_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id AND c.salon_id = public.get_user_salon_id(auth.uid())
  ));

CREATE POLICY "Users can insert comanda items"
  ON public.comanda_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id AND c.salon_id = public.get_user_salon_id(auth.uid())
  ));

CREATE POLICY "Users can update comanda items"
  ON public.comanda_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id AND c.salon_id = public.get_user_salon_id(auth.uid())
  ));

CREATE POLICY "Users can delete comanda items"
  ON public.comanda_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.comandas c 
    WHERE c.id = comanda_id AND c.salon_id = public.get_user_salon_id(auth.uid())
  ));

-- Políticas RLS para Payments
CREATE POLICY "Users can view payments in their salon"
  ON public.payments FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert payments in their salon"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Products
CREATE POLICY "Users can view products in their salon"
  ON public.products FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert products in their salon"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update products in their salon"
  ON public.products FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete products in their salon"
  ON public.products FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Stock Movements
CREATE POLICY "Users can view stock movements in their salon"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert stock movements in their salon"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

-- Políticas RLS para Financial Transactions
CREATE POLICY "Users can view transactions in their salon"
  ON public.financial_transactions FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert transactions in their salon"
  ON public.financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update transactions in their salon"
  ON public.financial_transactions FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete transactions in their salon"
  ON public.financial_transactions FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON public.comandas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_profiles_salon_id ON public.profiles(salon_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_clients_salon_id ON public.clients(salon_id);
CREATE INDEX idx_clients_name ON public.clients(name);
CREATE INDEX idx_services_salon_id ON public.services(salon_id);
CREATE INDEX idx_professionals_salon_id ON public.professionals(salon_id);
CREATE INDEX idx_appointments_salon_id ON public.appointments(salon_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX idx_comandas_salon_id ON public.comandas(salon_id);
CREATE INDEX idx_products_salon_id ON public.products(salon_id);
CREATE INDEX idx_financial_transactions_salon_id ON public.financial_transactions(salon_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);