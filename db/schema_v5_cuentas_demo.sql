-- Quinielapp — v5: cuentas de demostración guardadas en Neon (ya no en el código).
-- Contraseña de ambas: Demo1234!  (guardada cifrada con bcrypt)
insert into users (name, email, password_hash, birthdate) values
  ('Demo Rodrigo', 'demo@quinielapp.com',  '$2a$10$b6dzOUR.GoLkdU2/Wygx8.lpS2z40mql6UvcsxXNemNixVYQFH0zW', '1995-01-01'),
  ('Demo Admin',   'admin@quinielapp.com', '$2a$10$b6dzOUR.GoLkdU2/Wygx8.lpS2z40mql6UvcsxXNemNixVYQFH0zW', '1995-01-01')
on conflict (email) do update set password_hash = excluded.password_hash;
