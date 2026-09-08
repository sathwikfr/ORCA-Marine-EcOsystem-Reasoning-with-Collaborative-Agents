-- infra/postgres/init.sql
-- Run once on first container startup.
-- Enables PostGIS and TimescaleDB extensions.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TimescaleDB and pgvector are optional — install if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'
  ) THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'vector'
  ) THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';
  END IF;
END
$$;

-- Grant privileges to app user
GRANT ALL PRIVILEGES ON DATABASE orca_db TO orca_user;
