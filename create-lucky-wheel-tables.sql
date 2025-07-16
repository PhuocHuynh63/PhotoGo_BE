
-- 1. Lucky Wheel Table
CREATE TABLE IF NOT EXISTS lucky_wheel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (type IN ('free', 'points', 'campaign')),
    cost_points INTEGER DEFAULT 0 CHECK (cost_points >= 0),
    daily_spin_limit INTEGER DEFAULT 1 CHECK (daily_spin_limit >= 1),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled')),
    start_date DATE,
    end_date DATE,
    campaign_id UUID REFERENCES campaign(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date)
);

-- 2. Lucky Wheel Prize Table
CREATE TABLE IF NOT EXISTS lucky_wheel_prize (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wheel_id UUID NOT NULL REFERENCES lucky_wheel(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('points', 'voucher', 'empty')),
    points_value INTEGER CHECK (points_value IS NULL OR points_value >= 0),
    voucher_id UUID REFERENCES voucher(id) ON DELETE SET NULL,
    probability DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (probability >= 0 AND probability <= 100),
    max_quantity INTEGER DEFAULT -1 CHECK (max_quantity >= -1),
    used_quantity INTEGER DEFAULT 0 CHECK (used_quantity >= 0),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    color VARCHAR(10),
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lucky Wheel Spin Table
CREATE TABLE IF NOT EXISTS lucky_wheel_spin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    wheel_id UUID NOT NULL REFERENCES lucky_wheel(id) ON DELETE CASCADE,
    prize_id UUID REFERENCES lucky_wheel_prize(id) ON DELETE SET NULL,
    cost_points INTEGER DEFAULT 0 CHECK (cost_points >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    result_description TEXT,
    spin_angle DECIMAL(5,2) CHECK (spin_angle IS NULL OR (spin_angle >= 0 AND spin_angle <= 360)),
    error_message TEXT,
    
    -- Transaction tracking
    point_transaction_id UUID REFERENCES point_transaction(id) ON DELETE SET NULL,
    reward_point_transaction_id UUID REFERENCES point_transaction(id) ON DELETE SET NULL,
    voucher_user_id VARCHAR(100), -- Composite key reference to voucher_user table
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_status ON lucky_wheel(status);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_campaign ON lucky_wheel(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_dates ON lucky_wheel(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_lucky_wheel_prize_wheel ON lucky_wheel_prize(wheel_id);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_prize_active ON lucky_wheel_prize(is_active);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_prize_type ON lucky_wheel_prize(type);

CREATE INDEX IF NOT EXISTS idx_lucky_wheel_spin_user ON lucky_wheel_spin(user_id);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_spin_wheel ON lucky_wheel_spin(wheel_id);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_spin_status ON lucky_wheel_spin(status);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_spin_created ON lucky_wheel_spin(created_at);
CREATE INDEX IF NOT EXISTS idx_lucky_wheel_spin_user_wheel_date ON lucky_wheel_spin(user_id, wheel_id, created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lucky_wheel_updated_at 
    BEFORE UPDATE ON lucky_wheel 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lucky_wheel_prize_updated_at 
    BEFORE UPDATE ON lucky_wheel_prize 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO lucky_wheel (name, description, type, cost_points, daily_spin_limit, status) VALUES
('Vòng quay may mắn hàng ngày', 'Vòng quay miễn phí mỗi ngày với nhiều phần thưởng hấp dẫn', 'free', 0, 1, 'active'),
('Vòng quay VIP', 'Vòng quay cao cấp với phần thưởng giá trị lớn', 'points', 100, 3, 'active');

-- Sample prizes for the first wheel
INSERT INTO lucky_wheel_prize (wheel_id, name, type, points_value, probability, color, description) 
SELECT 
    id,
    '50 điểm',
    'points',
    50,
    30.0,
    '#4CAF50',
    'Phần thưởng 50 điểm thưởng'
FROM lucky_wheel WHERE name = 'Vòng quay may mắn hàng ngày' LIMIT 1;

INSERT INTO lucky_wheel_prize (wheel_id, name, type, points_value, probability, color, description) 
SELECT 
    id,
    '100 điểm',
    'points',
    100,
    20.0,
    '#2196F3',
    'Phần thưởng 100 điểm thưởng'
FROM lucky_wheel WHERE name = 'Vòng quay may mắn hàng ngày' LIMIT 1;

INSERT INTO lucky_wheel_prize (wheel_id, name, type, probability, color, description) 
SELECT 
    id,
    'Chúc bạn may mắn lần sau',
    'empty',
    35.0,
    '#9E9E9E',
    'Không trúng phần thưởng nào'
FROM lucky_wheel WHERE name = 'Vòng quay may mắn hàng ngày' LIMIT 1;
