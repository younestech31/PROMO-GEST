using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class InitialFoundation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    actor_username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    event_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    severity = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    target_entity_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    target_entity_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: true),
                    ip_address = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "organization_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    legal_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    trade_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    legal_form = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    nif = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    nis = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    trade_register_number = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    tax_article_number = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    share_capital_dzd = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    wilaya_code = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    wilaya_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    default_language = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    is_initialized = table.Column<bool>(type: "boolean", nullable: false),
                    initialized_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    singleton_guard = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_settings", x => x.id);
                    table.CheckConstraint("ck_organization_currency_dzd", "currency_code = 'DZD'");
                    table.CheckConstraint("ck_organization_default_language", "default_language IN ('ar', 'fr')");
                    table.CheckConstraint("ck_organization_share_capital_non_negative", "share_capital_dzd IS NULL OR share_capital_dzd >= 0");
                    table.CheckConstraint("ck_organization_singleton_guard", "singleton_guard = 1");
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    module = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    description_ar = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description_fr = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    normalized_code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    name_ar = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    name_fr = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    wilaya_code = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    wilaya_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    municipality = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    land_title_reference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    building_permit_number = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    building_permit_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    estimated_budget_dzd = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    planned_blocks_count = table.Column<int>(type: "integer", nullable: false),
                    planned_units_count = table.Column<int>(type: "integer", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.id);
                    table.CheckConstraint("ck_projects_blocks_non_negative", "planned_blocks_count >= 0");
                    table.CheckConstraint("ck_projects_budget_non_negative", "estimated_budget_dzd >= 0");
                    table.CheckConstraint("ck_projects_units_non_negative", "planned_units_count >= 0");
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name_ar = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    name_fr = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description_ar = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description_fr = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    is_system_role = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "stored_files",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    stored_relative_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    content_type = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256_checksum = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    scope = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    uploaded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stored_files", x => x.id);
                    table.CheckConstraint("ck_stored_files_size_positive", "size_bytes > 0");
                });

            migrationBuilder.CreateTable(
                name: "system_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    value = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    is_encrypted = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    normalized_username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    full_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    password_hash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    is_system_administrator = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    preferred_language = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    failed_login_attempts = table.Column<int>(type: "integer", nullable: false),
                    lockout_end_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    last_login_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    security_stamp = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.CheckConstraint("ck_users_failed_attempts_non_negative", "failed_login_attempts >= 0");
                    table.CheckConstraint("ck_users_preferred_language", "preferred_language IN ('ar', 'fr')");
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    permission_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => new { x.role_id, x.permission_id });
                    table.ForeignKey(
                        name: "FK_role_permissions_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_role_permissions_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_in_project = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    can_view_financials = table.Column<bool>(type: "boolean", nullable: false),
                    can_manage_sales = table.Column<bool>(type: "boolean", nullable: false),
                    can_manage_construction = table.Column<bool>(type: "boolean", nullable: false),
                    can_manage_documents = table.Column<bool>(type: "boolean", nullable: false),
                    assigned_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_members_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_project_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assigned_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_roles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "FK_user_roles_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_roles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    security_stamp = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_seen_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ip_address = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    is_revoked = table.Column<bool>(type: "boolean", nullable: false),
                    revoked_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(name: "ix_audit_logs_event_type", table: "audit_logs", column: "event_type");
            migrationBuilder.CreateIndex(name: "ix_audit_logs_occurred_at_utc", table: "audit_logs", column: "occurred_at_utc");
            migrationBuilder.CreateIndex(name: "ux_organization_settings_singleton", table: "organization_settings", column: "singleton_guard", unique: true);
            migrationBuilder.CreateIndex(name: "ux_permissions_code", table: "permissions", column: "code", unique: true);
            migrationBuilder.CreateIndex(name: "ix_project_members_user_id", table: "project_members", column: "user_id");
            migrationBuilder.CreateIndex(name: "ux_project_members_project_user", table: "project_members", columns: new[] { "project_id", "user_id" }, unique: true);
            migrationBuilder.CreateIndex(name: "ix_projects_wilaya_code", table: "projects", column: "wilaya_code");
            migrationBuilder.CreateIndex(name: "ux_projects_normalized_code", table: "projects", column: "normalized_code", unique: true);
            migrationBuilder.CreateIndex(name: "ix_role_permissions_permission_id", table: "role_permissions", column: "permission_id");
            migrationBuilder.CreateIndex(name: "ux_roles_code", table: "roles", column: "code", unique: true);
            migrationBuilder.CreateIndex(name: "ix_stored_files_project_id", table: "stored_files", column: "project_id");
            migrationBuilder.CreateIndex(name: "ux_stored_files_relative_path", table: "stored_files", column: "stored_relative_path", unique: true);
            migrationBuilder.CreateIndex(name: "ux_system_settings_key", table: "system_settings", column: "key", unique: true);
            migrationBuilder.CreateIndex(name: "ix_user_roles_role_id", table: "user_roles", column: "role_id");
            migrationBuilder.CreateIndex(name: "ix_user_sessions_user_id", table: "user_sessions", column: "user_id");
            migrationBuilder.CreateIndex(name: "ux_user_sessions_token_hash", table: "user_sessions", column: "token_hash", unique: true);
            migrationBuilder.CreateIndex(name: "ux_users_normalized_email", table: "users", column: "normalized_email", unique: true);
            migrationBuilder.CreateIndex(name: "ux_users_normalized_username", table: "users", column: "normalized_username", unique: true);
            migrationBuilder.CreateIndex(
                name: "ux_users_single_system_admin",
                table: "users",
                column: "is_system_administrator",
                unique: true,
                filter: "is_system_administrator = true");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "audit_logs");
            migrationBuilder.DropTable(name: "organization_settings");
            migrationBuilder.DropTable(name: "project_members");
            migrationBuilder.DropTable(name: "role_permissions");
            migrationBuilder.DropTable(name: "stored_files");
            migrationBuilder.DropTable(name: "system_settings");
            migrationBuilder.DropTable(name: "user_roles");
            migrationBuilder.DropTable(name: "user_sessions");
            migrationBuilder.DropTable(name: "projects");
            migrationBuilder.DropTable(name: "permissions");
            migrationBuilder.DropTable(name: "roles");
            migrationBuilder.DropTable(name: "users");
        }
    }
}
