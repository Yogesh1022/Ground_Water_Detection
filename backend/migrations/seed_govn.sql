-- Seed data for Gov Officer dashboard smoke/demo
-- Run after schema.sql

-- NOTE: Password hashes must be bcrypt, because /api/v1/auth/login uses bcrypt.CompareHashAndPassword.
-- Demo passwords below are only for local/dev.

-- Users
INSERT INTO users (email, password_hash, name, role, district, phone) VALUES
('gov.amravati@example.com', crypt('Gov@12345', gen_salt('bf', 12)), 'Officer Amravati', 'gov', 'Amravati', '9000000001'),
('gov.yavatmal@example.com', crypt('Gov@12345', gen_salt('bf', 12)), 'Officer Yavatmal', 'gov', 'Yavatmal', '9000000002')
ON CONFLICT (email) DO NOTHING;

-- Complaints (subset)
INSERT INTO complaints (tracking_number, user_id, type, district, taluka, village, severity, description, status, assigned_officer_id)
VALUES
('R-1042', NULL, 'water_shortage', 'Amravati', 'Warud', 'Warud', 'high', 'Well dried up', 'open', NULL),
('R-1041', NULL, 'tanker_delay', 'Amravati', 'Morshi', 'Morshi', 'critical', 'No tanker 7 days', 'escalated', NULL),
('R-1040', NULL, 'infrastructure', 'Amravati', 'Chandur', 'Chandur', 'medium', 'Hand pump broken', 'in_progress', NULL),
('R-1039', NULL, 'pipeline', 'Amravati', 'Daryapur', 'Daryapur', 'medium', 'Pipeline burst', 'in_review', NULL)
ON CONFLICT (tracking_number) DO NOTHING;

-- Tanker routes
INSERT INTO tanker_routes (route_name, district, villages, schedule, capacity_liters, status, assigned_driver, contact_number)
VALUES
('Amravati → Warud', 'Amravati', '["Warud","Nandgaon","Pusad"]', 'Mon/Thu', 10000, 'active', 'Driver A', '9001001001'),
('Yavatmal → Morshi', 'Yavatmal', '["Morshi","Kalamb","Arni"]', 'Daily', 12000, 'active', 'Driver B', '9001001002')
ON CONFLICT DO NOTHING;

-- Tasks
INSERT INTO task_assignments (complaint_id, assignee_officer_id, assigned_by_id, due_date, priority, status, notes)
SELECT c.id, (SELECT id FROM users WHERE email = 'gov.amravati@example.com'), (SELECT id FROM users WHERE email = 'gov.amravati@example.com'), CURRENT_DATE + INTERVAL '3 days', 'high', 'pending', 'Initial inspection'
FROM complaints c WHERE c.tracking_number = 'R-1042'
ON CONFLICT DO NOTHING;

-- District stats (sample)
INSERT INTO district_stats (district, well_count, avg_depth_mbgl, max_depth_mbgl, min_depth_mbgl, risk_status, crisis_index, depth_change_qoq)
VALUES
('Amravati', 72, 63.4, 78.0, 42.1, 'CRITICAL', 7.2, -2.1),
('Yavatmal', 85, 72.1, 83.5, 51.0, 'CRITICAL', 8.4, -3.2),
('Akola', 61, 58.7, 69.0, 38.2, 'HIGH', 6.1, -0.5)
ON CONFLICT (district) DO NOTHING;
