using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class CanonicalizeAlgerianProjectCustomerPhones : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    v_invalid_phone_count bigint;
                    v_collision_group_count bigint;
                BEGIN
                    WITH digitized AS (
                        SELECT
                            customer.id,
                            regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS digits
                        FROM project_customers AS customer
                    ),
                    canonical AS (
                        SELECT
                            id,
                            CASE
                                WHEN length(digits) = 10 AND left(digits, 1) = '0'
                                    THEN '213' || substr(digits, 2)
                                ELSE digits
                            END AS canonical_phone
                        FROM digitized
                    )
                    SELECT COUNT(*)
                    INTO v_invalid_phone_count
                    FROM canonical
                    WHERE length(canonical_phone) NOT BETWEEN 7 AND 15;

                    IF v_invalid_phone_count > 0 THEN
                        RAISE EXCEPTION
                            'Cannot canonicalize customer phones: % rows have an invalid digit length. Run scripts/p1-11-phone-normalization-preflight.sql and reconcile source data before retrying.',
                            v_invalid_phone_count;
                    END IF;

                    WITH digitized AS (
                        SELECT
                            customer.id,
                            customer.project_id,
                            party.normalized_display_name,
                            regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS digits
                        FROM project_customers AS customer
                        INNER JOIN parties AS party ON party.id = customer.party_id
                    ),
                    canonical AS (
                        SELECT
                            id,
                            project_id,
                            normalized_display_name,
                            CASE
                                WHEN length(digits) = 10 AND left(digits, 1) = '0'
                                    THEN '213' || substr(digits, 2)
                                ELSE digits
                            END AS canonical_phone
                        FROM digitized
                    ),
                    duplicate_groups AS (
                        SELECT project_id, normalized_display_name, canonical_phone
                        FROM canonical
                        GROUP BY project_id, normalized_display_name, canonical_phone
                        HAVING COUNT(*) > 1
                    )
                    SELECT COUNT(*)
                    INTO v_collision_group_count
                    FROM duplicate_groups;

                    IF v_collision_group_count > 0 THEN
                        RAISE EXCEPTION
                            'Cannot canonicalize customer phones: % project/name/phone collision group(s) would be created. No customer rows were changed. Run scripts/p1-11-phone-normalization-preflight.sql and reconcile each group manually before retrying.',
                            v_collision_group_count;
                    END IF;
                END
                $$;

                WITH digitized AS (
                    SELECT
                        customer.id,
                        regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS digits
                    FROM project_customers AS customer
                ),
                canonical AS (
                    SELECT
                        id,
                        CASE
                            WHEN length(digits) = 10 AND left(digits, 1) = '0'
                                THEN '213' || substr(digits, 2)
                            ELSE digits
                        END AS canonical_phone
                    FROM digitized
                )
                UPDATE project_customers AS customer
                SET normalized_phone = canonical.canonical_phone
                FROM canonical
                WHERE customer.id = canonical.id
                  AND customer.normalized_phone IS DISTINCT FROM canonical.canonical_phone;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    v_invalid_phone_count bigint;
                    v_collision_group_count bigint;
                BEGIN
                    WITH digitized AS (
                        SELECT
                            customer.id,
                            regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS digits
                        FROM project_customers AS customer
                    )
                    SELECT COUNT(*)
                    INTO v_invalid_phone_count
                    FROM digitized
                    WHERE length(digits) NOT BETWEEN 7 AND 15;

                    IF v_invalid_phone_count > 0 THEN
                        RAISE EXCEPTION
                            'Cannot restore legacy customer phone keys: % rows have an invalid digit length. Reconcile source phone values before retrying rollback.',
                            v_invalid_phone_count;
                    END IF;

                    WITH digitized AS (
                        SELECT
                            customer.id,
                            customer.project_id,
                            party.normalized_display_name,
                            regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS legacy_phone
                        FROM project_customers AS customer
                        INNER JOIN parties AS party ON party.id = customer.party_id
                    ),
                    duplicate_groups AS (
                        SELECT project_id, normalized_display_name, legacy_phone
                        FROM digitized
                        GROUP BY project_id, normalized_display_name, legacy_phone
                        HAVING COUNT(*) > 1
                    )
                    SELECT COUNT(*)
                    INTO v_collision_group_count
                    FROM duplicate_groups;

                    IF v_collision_group_count > 0 THEN
                        RAISE EXCEPTION
                            'Cannot restore legacy customer phone keys: % project/name/phone collision group(s) would be created. No customer rows were changed.',
                            v_collision_group_count;
                    END IF;
                END
                $$;

                WITH digitized AS (
                    SELECT
                        customer.id,
                        regexp_replace(customer.phone, '[^0123456789]', '', 'g') AS legacy_phone
                    FROM project_customers AS customer
                )
                UPDATE project_customers AS customer
                SET normalized_phone = digitized.legacy_phone
                FROM digitized
                WHERE customer.id = digitized.id
                  AND customer.normalized_phone IS DISTINCT FROM digitized.legacy_phone;
                """);
        }
    }
}
