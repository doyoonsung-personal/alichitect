-- Widen the role constraint in place. Keep users, their IDs and all dependent rows intact.
ALTER TABLE users RENAME COLUMN role TO previous_role;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'verified', 'admin'));
UPDATE users SET role = previous_role WHERE previous_role <> 'user';
ALTER TABLE users DROP COLUMN previous_role;
