using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class EnforceProjectCustomerIdentityUniqueness : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                -- Do not silently repair or delete possible customer records. Fail closed
                -- and require reconciliation if duplicates appeared after the legacy index
                -- was retired and before this database guard is installed.
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM project_customers AS customer
                        INNER JOIN parties AS party ON party.id = customer.party_id
                        GROUP BY customer.project_id, party.normalized_display_name, customer.normalized_phone
                        HAVING COUNT(*) > 1
                    ) THEN
                        RAISE EXCEPTION
                            'Cannot enable project customer identity uniqueness: duplicate normalized name/phone pairs already exist in a project. Reconcile records before retrying this migration.';
                    END IF;
                END
                $$;

                CREATE OR REPLACE FUNCTION assert_project_customer_identity_unique(
                    p_project_id uuid,
                    p_customer_id uuid,
                    p_party_id uuid,
                    p_normalized_phone text)
                RETURNS void
                LANGUAGE plpgsql
                AS $$
                DECLARE
                    v_normalized_display_name text;
                BEGIN
                    SELECT party.normalized_display_name
                    INTO v_normalized_display_name
                    FROM parties AS party
                    WHERE party.id = p_party_id;

                    IF NOT FOUND THEN
                        RETURN;
                    END IF;

                    -- Serialize checks for the same project/name/phone tuple. The
                    -- following query runs after the lock is acquired and sees commits
                    -- made by an earlier competing transaction under READ COMMITTED.
                    PERFORM pg_advisory_xact_lock(
                        hashtextextended(
                            p_project_id::text || ':' ||
                            char_length(v_normalized_display_name)::text || ':' ||
                            v_normalized_display_name || ':' ||
                            p_normalized_phone,
                            0));

                    IF EXISTS (
                        SELECT 1
                        FROM project_customers AS other_customer
                        INNER JOIN parties AS other_party
                            ON other_party.id = other_customer.party_id
                        WHERE other_customer.project_id = p_project_id
                          AND other_customer.id <> p_customer_id
                          AND other_customer.normalized_phone = p_normalized_phone
                          AND other_party.normalized_display_name = v_normalized_display_name
                    ) THEN
                        RAISE EXCEPTION
                            'A customer with the same normalized name and phone number already exists in this project.'
                            USING
                                ERRCODE = '23505',
                                CONSTRAINT = 'ux_project_customers_project_name_phone',
                                TABLE = 'project_customers';
                    END IF;
                END;
                $$;

                CREATE OR REPLACE FUNCTION enforce_project_customer_identity_after_change()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                DECLARE
                    current_customer record;
                BEGIN
                    -- Read the final transaction state. This matters when Party identity
                    -- and project contact details are updated together in one unit of work.
                    SELECT customer.project_id, customer.id, customer.party_id, customer.normalized_phone
                    INTO current_customer
                    FROM project_customers AS customer
                    WHERE customer.id = NEW.id;

                    IF NOT FOUND THEN
                        RETURN NEW;
                    END IF;

                    PERFORM assert_project_customer_identity_unique(
                        current_customer.project_id,
                        current_customer.id,
                        current_customer.party_id,
                        current_customer.normalized_phone);

                    RETURN NEW;
                END;
                $$;

                CREATE OR REPLACE FUNCTION enforce_party_identity_after_change()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                DECLARE
                    linked_customer record;
                BEGIN
                    -- A Party name is canonical and can affect several project
                    -- relationships. Check all linked project/name/phone tuples.
                    FOR linked_customer IN
                        SELECT customer.project_id, customer.id, customer.party_id, customer.normalized_phone
                        FROM project_customers AS customer
                        WHERE customer.party_id = NEW.id
                        ORDER BY customer.project_id, customer.normalized_phone, customer.id
                    LOOP
                        PERFORM assert_project_customer_identity_unique(
                            linked_customer.project_id,
                            linked_customer.id,
                            linked_customer.party_id,
                            linked_customer.normalized_phone);
                    END LOOP;

                    RETURN NEW;
                END;
                $$;

                CREATE CONSTRAINT TRIGGER trg_project_customers_identity_unique
                AFTER INSERT OR UPDATE ON project_customers
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE FUNCTION enforce_project_customer_identity_after_change();

                CREATE CONSTRAINT TRIGGER trg_parties_identity_unique
                AFTER UPDATE ON parties
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE FUNCTION enforce_party_identity_after_change();
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS trg_project_customers_identity_unique ON project_customers;
                DROP TRIGGER IF EXISTS trg_parties_identity_unique ON parties;
                DROP FUNCTION IF EXISTS enforce_project_customer_identity_after_change();
                DROP FUNCTION IF EXISTS enforce_party_identity_after_change();
                DROP FUNCTION IF EXISTS assert_project_customer_identity_unique(uuid, uuid, uuid, text);
                """);
        }
    }
}
