-- PROMO GEST PostgreSQL 18 Initialization Script (Least-Privilege Separation of Owner vs Runtime App)
-- Run as PostgreSQL superuser (postgres) during initial server provisioning.

CREATE ROLE promogest_owner WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    PASSWORD 'CHANGE_STRONG_OWNER_PASSWORD';

CREATE ROLE promogest_app WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    PASSWORD 'CHANGE_STRONG_APP_PASSWORD';

CREATE DATABASE promogest
    WITH
    OWNER = promogest_owner
    ENCODING = 'UTF8'
    LC_COLLATE = 'C.UTF-8'
    LC_CTYPE = 'C.UTF-8'
    TEMPLATE = template0;

REVOKE ALL ON DATABASE promogest FROM PUBLIC;
GRANT CONNECT ON DATABASE promogest TO promogest_app;
GRANT ALL PRIVILEGES ON DATABASE promogest TO promogest_owner;

\connect promogest
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO promogest_app;
GRANT CREATE ON SCHEMA public TO promogest_owner;

-- Runtime least privilege DML grants on tables (SELECT, INSERT, UPDATE, DELETE; no TRUNCATE, no DDL, no trigger management)
ALTER DEFAULT PRIVILEGES FOR ROLE promogest_owner IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO promogest_app;
ALTER DEFAULT PRIVILEGES FOR ROLE promogest_owner IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO promogest_app;
