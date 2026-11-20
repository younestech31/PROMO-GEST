\set ON_ERROR_STOP on
-- P1-11 read-only preflight. Run against the organization's authorized,
-- local/on-premises PostgreSQL 18 database before applying the migration.
-- Example: psql -X --set ON_ERROR_STOP=1 --file scripts/p1-11-phone-normalization-preflight.sql
-- This script never updates rows and deliberately does not print phone numbers,
-- party names, emails, or other customer contact data. It reports opaque UUIDs only.

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

WITH digitized AS (
    SELECT
        customer.id,
        customer.project_id,
        customer.party_id,
        customer.normalized_phone AS current_normalized_phone,
        regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS digits
    FROM project_customers AS customer
),
canonical AS (
    SELECT
        id,
        project_id,
        party_id,
        current_normalized_phone,
        digits,
        CASE
            WHEN length(digits) = 10 AND left(digits, 1) = '0'
                THEN '213' || substr(digits, 2)
            ELSE digits
        END AS canonical_phone
    FROM digitized
)
SELECT
    COUNT(*) AS customer_rows,
    COUNT(*) FILTER (WHERE current_normalized_phone IS DISTINCT FROM canonical_phone) AS rows_to_rewrite,
    COUNT(*) FILTER (WHERE current_normalized_phone IS DISTINCT FROM digits) AS legacy_key_drift_rows,
    COUNT(*) FILTER (WHERE length(canonical_phone) NOT BETWEEN 7 AND 15) AS invalid_phone_rows
FROM canonical;

WITH digitized AS (
    SELECT
        customer.id AS customer_id,
        customer.project_id,
        customer.party_id,
        party.normalized_display_name,
        regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS digits
    FROM project_customers AS customer
    INNER JOIN parties AS party ON party.id = customer.party_id
),
canonical AS (
    SELECT
        customer_id,
        project_id,
        party_id,
        normalized_display_name,
        CASE
            WHEN length(digits) = 10 AND left(digits, 1) = '0'
                THEN '213' || substr(digits, 2)
            ELSE digits
        END AS canonical_phone
    FROM digitized
),
collisions AS (
    SELECT
        project_id,
        normalized_display_name,
        canonical_phone,
        COUNT(*) AS customer_count,
        ARRAY_AGG(customer_id::text ORDER BY customer_id) AS customer_ids,
        ARRAY_AGG(party_id::text ORDER BY customer_id) AS party_ids
    FROM canonical
    GROUP BY project_id, normalized_display_name, canonical_phone
    HAVING COUNT(*) > 1
)
SELECT
    project_id,
    customer_count,
    customer_ids,
    party_ids
FROM collisions
ORDER BY project_id, customer_ids;

COMMIT;
