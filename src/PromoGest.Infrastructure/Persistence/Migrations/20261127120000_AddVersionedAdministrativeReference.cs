using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations;

/// <summary>Additive storage only: no source seed, activation or historical field rewrite.</summary>
public partial class AddVersionedAdministrativeReference : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "admin_reference_versions",
            columns: table => new
            {
                id = table.Column<string>(type: "character varying(78)", maxLength: 78, nullable: false),
                canonical_content_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                manifest_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                source_spreadsheet_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                claimed_capture_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                wilaya_count = table.Column<int>(type: "integer", nullable: false),
                commune_count = table.Column<int>(type: "integer", nullable: false),
                alias_count = table.Column<int>(type: "integer", nullable: false),
                declared_daira_count = table.Column<int>(type: "integer", nullable: false),
                observed_daira_count = table.Column<int>(type: "integer", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_admin_reference_versions", x => x.id);
                table.CheckConstraint("ck_admin_reference_hashes", "canonical_content_sha256 ~ '^[0-9a-f]{64}$' AND manifest_sha256 ~ '^[0-9a-f]{64}$' AND id = 'sheets-sha256-' || canonical_content_sha256");
                table.CheckConstraint("ck_admin_reference_counts", "wilaya_count > 0 AND commune_count > 0 AND alias_count >= 0 AND declared_daira_count >= 0 AND observed_daira_count >= 0");
                table.CheckConstraint("ck_admin_reference_source", "length(btrim(source_spreadsheet_id)) > 0");
            });

        migrationBuilder.CreateTable(
            name: "admin_wilaya_identities",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_admin_wilaya_identities", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "admin_commune_identities",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_admin_commune_identities", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "admin_wilaya_versions",
            columns: table => new
            {
                snapshot_id = table.Column<string>(type: "character varying(78)", maxLength: 78, nullable: false),
                wilaya_id = table.Column<Guid>(type: "uuid", nullable: false),
                system_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                name_fr = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                name_ar = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                declared_daira_count = table.Column<int>(type: "integer", nullable: false),
                declared_commune_count = table.Column<int>(type: "integer", nullable: false),
                name_ar_source = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_admin_wilaya_versions", x => new { x.snapshot_id, x.wilaya_id });
                table.CheckConstraint("ck_admin_wilaya_code", "system_code ~ '^[0-9]{2}$'");
                table.CheckConstraint("ck_admin_wilaya_labels", "length(btrim(name_fr)) > 0 AND length(btrim(name_ar)) > 0 AND length(btrim(name_ar_source)) > 0");
                table.CheckConstraint("ck_admin_wilaya_counts", "declared_daira_count >= 0 AND declared_commune_count > 0");
                table.ForeignKey(
                    name: "fk_admin_wilaya_version_snapshot",
                    columns: x => x.snapshot_id,
                    principalTable: "admin_reference_versions",
                    principalColumns: new[] { "id" },
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_admin_wilaya_version_identity",
                    columns: x => x.wilaya_id,
                    principalTable: "admin_wilaya_identities",
                    principalColumns: new[] { "id" },
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ux_admin_wilaya_version_code",
            table: "admin_wilaya_versions",
            columns: new[] { "snapshot_id", "system_code" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_admin_wilaya_identity",
            table: "admin_wilaya_versions",
            columns: new[] { "wilaya_id" },
            unique: false);

        migrationBuilder.CreateTable(
            name: "admin_commune_versions",
            columns: table => new
            {
                snapshot_id = table.Column<string>(type: "character varying(78)", maxLength: 78, nullable: false),
                commune_id = table.Column<Guid>(type: "uuid", nullable: false),
                system_code = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                name_fr = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                name_ar = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                wilaya_id = table.Column<Guid>(type: "uuid", nullable: false),
                daira_name_fr = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                daira_name_ar = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                is_daira_seat = table.Column<bool>(type: "boolean", nullable: true),
                parent_effective_from = table.Column<DateOnly>(type: "date", nullable: true),
                parent_effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                parent_date_evidence = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_admin_commune_versions", x => new { x.snapshot_id, x.commune_id });
                table.CheckConstraint("ck_admin_commune_code", "system_code ~ '^[0-9]{4}$'");
                table.CheckConstraint("ck_admin_commune_labels", "length(btrim(name_fr)) > 0 AND length(btrim(name_ar)) > 0 AND length(btrim(daira_name_fr)) > 0 AND length(btrim(daira_name_ar)) > 0");
                table.CheckConstraint("ck_admin_commune_parent_dates", "((parent_effective_from IS NULL AND parent_effective_to IS NULL AND parent_date_evidence IS NULL) OR (parent_effective_from IS NOT NULL AND parent_date_evidence IS NOT NULL AND length(btrim(parent_date_evidence)) > 0 AND (parent_effective_to IS NULL OR parent_effective_to > parent_effective_from)))");
                table.ForeignKey(
                    name: "fk_admin_commune_version_snapshot",
                    columns: x => x.snapshot_id,
                    principalTable: "admin_reference_versions",
                    principalColumns: new[] { "id" },
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_admin_commune_version_identity",
                    columns: x => x.commune_id,
                    principalTable: "admin_commune_identities",
                    principalColumns: new[] { "id" },
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_admin_commune_version_wilaya",
                    columns: x => new { x.snapshot_id, x.wilaya_id },
                    principalTable: "admin_wilaya_versions",
                    principalColumns: new[] { "snapshot_id", "wilaya_id" },
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ux_admin_commune_version_code",
            table: "admin_commune_versions",
            columns: new[] { "snapshot_id", "system_code" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_admin_commune_identity",
            table: "admin_commune_versions",
            columns: new[] { "commune_id" },
            unique: false);

        migrationBuilder.CreateIndex(
            name: "ix_admin_commune_version_wilaya",
            table: "admin_commune_versions",
            columns: new[] { "snapshot_id", "wilaya_id" },
            unique: false);

        migrationBuilder.CreateTable(
            name: "admin_commune_aliases",
            columns: table => new
            {
                snapshot_id = table.Column<string>(type: "character varying(78)", maxLength: 78, nullable: false),
                commune_id = table.Column<Guid>(type: "uuid", nullable: false),
                reference_name_fr = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                alias_name_fr = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                reference_name_ar = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                repository_name_ar = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                evidence = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_admin_commune_aliases", x => new { x.snapshot_id, x.commune_id });
                table.CheckConstraint("ck_admin_commune_alias_labels", "length(btrim(reference_name_fr)) > 0 AND length(btrim(alias_name_fr)) > 0 AND length(btrim(reference_name_ar)) > 0 AND length(btrim(repository_name_ar)) > 0 AND length(btrim(evidence)) > 0");
                table.ForeignKey(
                    name: "fk_admin_commune_alias_version",
                    columns: x => new { x.snapshot_id, x.commune_id },
                    principalTable: "admin_commune_versions",
                    principalColumns: new[] { "snapshot_id", "commune_id" },
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.Sql("""
            DO $grant$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'promogest_app') THEN
                    REVOKE ALL ON TABLE public.admin_reference_versions, public.admin_wilaya_identities, public.admin_commune_identities, public.admin_wilaya_versions, public.admin_commune_versions, public.admin_commune_aliases FROM promogest_app;
                    GRANT SELECT ON TABLE public.admin_reference_versions, public.admin_wilaya_identities, public.admin_commune_identities, public.admin_wilaya_versions, public.admin_commune_versions, public.admin_commune_aliases TO promogest_app;
                END IF;
            END
            $grant$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Destructive only to this new reference store. Back it up before an approved rollback.
        migrationBuilder.DropTable(name: "admin_commune_aliases");
        migrationBuilder.DropTable(name: "admin_commune_versions");
        migrationBuilder.DropTable(name: "admin_wilaya_versions");
        migrationBuilder.DropTable(name: "admin_commune_identities");
        migrationBuilder.DropTable(name: "admin_wilaya_identities");
        migrationBuilder.DropTable(name: "admin_reference_versions");
    }
}
