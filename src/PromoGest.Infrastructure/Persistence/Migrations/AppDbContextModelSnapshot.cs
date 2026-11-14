using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using PromoGest.Infrastructure.Persistence;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder) => BuildModelCore(modelBuilder);

        internal static void BuildModelCore(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "10.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("PromoGest.Domain.Entities.AuditLog", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<Guid?>("ActorUserId").HasColumnType("uuid").HasColumnName("actor_user_id");
                    b.Property<string>("ActorUsername").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("actor_username");
                    b.Property<string>("EventType").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("event_type");
                    b.Property<string>("IpAddress").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("ip_address");
                    b.Property<string>("MetadataJson").HasColumnType("jsonb").HasColumnName("metadata_json");
                    b.Property<DateTimeOffset>("OccurredAtUtc").HasColumnType("timestamp with time zone").HasColumnName("occurred_at_utc");
                    b.Property<string>("Severity").IsRequired().HasMaxLength(24).HasColumnType("character varying(24)").HasColumnName("severity");
                    b.Property<string>("Summary").IsRequired().HasMaxLength(500).HasColumnType("character varying(500)").HasColumnName("summary");
                    b.Property<string>("TargetEntityId").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("target_entity_id");
                    b.Property<string>("TargetEntityType").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("target_entity_type");
                    b.Property<string>("UserAgent").HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("user_agent");

                    b.HasKey("Id");
                    b.HasIndex("EventType").HasDatabaseName("ix_audit_logs_event_type");
                    b.HasIndex("OccurredAtUtc").HasDatabaseName("ix_audit_logs_occurred_at_utc");
                    b.ToTable("audit_logs", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.OrganizationSettings", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<string>("Address").IsRequired().HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("address");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<string>("CurrencyCode").IsRequired().HasMaxLength(3).HasColumnType("character varying(3)").HasColumnName("currency_code");
                    b.Property<string>("DefaultLanguage").IsRequired().HasMaxLength(4).HasColumnType("character varying(4)").HasColumnName("default_language");
                    b.Property<string>("Email").HasMaxLength(160).HasColumnType("character varying(160)").HasColumnName("email");
                    b.Property<DateTimeOffset?>("InitializedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("initialized_at_utc");
                    b.Property<bool>("IsInitialized").HasColumnType("boolean").HasColumnName("is_initialized");
                    b.Property<string>("LegalForm").IsRequired().HasMaxLength(24).HasColumnType("character varying(24)").HasColumnName("legal_form");
                    b.Property<string>("LegalName").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)").HasColumnName("legal_name");
                    b.Property<string>("Nif").HasMaxLength(32).HasColumnType("character varying(32)").HasColumnName("nif");
                    b.Property<string>("Nis").HasMaxLength(32).HasColumnType("character varying(32)").HasColumnName("nis");
                    b.Property<string>("Phone").HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("phone");
                    b.Property<decimal?>("ShareCapitalDzd").HasPrecision(18, 2).HasColumnType("numeric(18,2)").HasColumnName("share_capital_dzd");
                    b.Property<int>("SingletonGuard").HasColumnType("integer").HasColumnName("singleton_guard");
                    b.Property<string>("TaxArticleNumber").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("tax_article_number");
                    b.Property<string>("TradeName").HasMaxLength(200).HasColumnType("character varying(200)").HasColumnName("trade_name");
                    b.Property<string>("TradeRegisterNumber").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("trade_register_number");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");
                    b.Property<string>("WilayaCode").IsRequired().HasMaxLength(4).HasColumnType("character varying(4)").HasColumnName("wilaya_code");
                    b.Property<string>("WilayaName").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)").HasColumnName("wilaya_name");

                    b.HasKey("Id");
                    b.HasIndex("SingletonGuard").IsUnique().HasDatabaseName("ux_organization_settings_singleton");
                    b.ToTable("organization_settings", null, t =>
                        {
                            t.HasCheckConstraint("ck_organization_currency_dzd", "currency_code = 'DZD'");
                            t.HasCheckConstraint("ck_organization_default_language", "default_language IN ('ar', 'fr')");
                            t.HasCheckConstraint("ck_organization_share_capital_non_negative", "share_capital_dzd IS NULL OR share_capital_dzd >= 0");
                            t.HasCheckConstraint("ck_organization_singleton_guard", "singleton_guard = 1");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Permission", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<string>("Code").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)").HasColumnName("code");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<string>("DescriptionAr").IsRequired().HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("description_ar");
                    b.Property<string>("DescriptionFr").IsRequired().HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("description_fr");
                    b.Property<string>("Module").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("module");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");

                    b.HasKey("Id");
                    b.HasIndex("Code").IsUnique().HasDatabaseName("ux_permissions_code");
                    b.ToTable("permissions", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Building", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<string>("Code").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("code");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<Guid>("CreatedByUserId").HasColumnType("uuid").HasColumnName("created_by_user_id");
                    b.Property<string>("NameAr").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)").HasColumnName("name_ar");
                    b.Property<string>("NameFr").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)").HasColumnName("name_fr");
                    b.Property<string>("NormalizedCode").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("normalized_code");
                    b.Property<Guid>("ProjectId").HasColumnType("uuid").HasColumnName("project_id");
                    b.Property<string>("Status").IsRequired().HasMaxLength(24).HasColumnType("character varying(24)").HasColumnName("status");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");

                    b.HasKey("Id");
                    b.HasIndex("CreatedByUserId").HasDatabaseName("ix_buildings_created_by_user_id");
                    b.HasIndex("ProjectId", "NormalizedCode").IsUnique().HasDatabaseName("ux_buildings_project_code");
                    b.ToTable("buildings", null, t =>
                        {
                            t.HasCheckConstraint("ck_buildings_code_not_empty", "length(btrim(code)) > 0");
                            t.HasCheckConstraint("ck_buildings_status", "status IN ('Planned', 'UnderConstruction', 'Completed', 'Suspended')");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.BuildingFloor", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<Guid>("BuildingId").HasColumnType("uuid").HasColumnName("building_id");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<int>("FloorNumber").HasColumnType("integer").HasColumnName("floor_number");
                    b.Property<string>("NameAr").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)").HasColumnName("name_ar");
                    b.Property<string>("NameFr").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)").HasColumnName("name_fr");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");

                    b.HasKey("Id");
                    b.HasIndex("BuildingId", "FloorNumber").IsUnique().HasDatabaseName("ux_building_floors_building_number");
                    b.ToTable("building_floors", null, t =>
                        {
                            t.HasCheckConstraint("ck_building_floors_number_range", "floor_number BETWEEN -10 AND 200");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.PropertyUnit", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<Guid>("CreatedByUserId").HasColumnType("uuid").HasColumnName("created_by_user_id");
                    b.Property<Guid>("FloorId").HasColumnType("uuid").HasColumnName("floor_id");
                    b.Property<decimal?>("GrossAreaSquareMeters").HasPrecision(10, 2).HasColumnType("numeric(10,2)").HasColumnName("gross_area_square_meters");
                    b.Property<decimal?>("NetAreaSquareMeters").HasPrecision(10, 2).HasColumnType("numeric(10,2)").HasColumnName("net_area_square_meters");
                    b.Property<string>("NormalizedUnitNumber").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("normalized_unit_number");
                    b.Property<int?>("RoomsCount").HasColumnType("integer").HasColumnName("rooms_count");
                    b.Property<string>("Status").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)").HasColumnName("status");
                    b.Property<string>("UnitNumber").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("unit_number");
                    b.Property<string>("UnitType").IsRequired().HasMaxLength(24).HasColumnType("character varying(24)").HasColumnName("unit_type");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");

                    b.HasKey("Id");
                    b.HasIndex("CreatedByUserId").HasDatabaseName("ix_property_units_created_by_user_id");
                    b.HasIndex("FloorId", "NormalizedUnitNumber").IsUnique().HasDatabaseName("ux_property_units_floor_number");
                    b.HasIndex("Status").HasDatabaseName("ix_property_units_status");
                    b.ToTable("property_units", null, t =>
                        {
                            t.HasCheckConstraint("ck_property_units_gross_area_non_negative", "gross_area_square_meters IS NULL OR gross_area_square_meters >= 0");
                            t.HasCheckConstraint("ck_property_units_net_area_non_negative", "net_area_square_meters IS NULL OR net_area_square_meters >= 0");
                            t.HasCheckConstraint("ck_property_units_net_not_over_gross", "net_area_square_meters IS NULL OR gross_area_square_meters IS NULL OR net_area_square_meters <= gross_area_square_meters");
                            t.HasCheckConstraint("ck_property_units_rooms_range", "rooms_count IS NULL OR rooms_count BETWEEN 0 AND 20");
                            t.HasCheckConstraint("ck_property_units_status", "status IN ('Planned', 'UnderConstruction', 'AvailableForSale', 'Reserved', 'Sold', 'Delivered', 'Withdrawn')");
                            t.HasCheckConstraint("ck_property_units_type", "unit_type IN ('Apartment', 'Shop', 'ParkingSpace', 'Office', 'Storage')");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Project", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<string>("Address").HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("address");
                    b.Property<DateOnly?>("BuildingPermitDate").HasColumnType("date").HasColumnName("building_permit_date");
                    b.Property<string>("BuildingPermitNumber").HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("building_permit_number");
                    b.Property<string>("Code").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("code");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<Guid>("CreatedByUserId").HasColumnType("uuid").HasColumnName("created_by_user_id");
                    b.Property<decimal>("EstimatedBudgetDzd").HasPrecision(18, 2).HasColumnType("numeric(18,2)").HasColumnName("estimated_budget_dzd");
                    b.Property<string>("LandTitleReference").HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("land_title_reference");
                    b.Property<string>("Municipality").IsRequired().HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("municipality");
                    b.Property<string>("NameAr").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)").HasColumnName("name_ar");
                    b.Property<string>("NameFr").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)").HasColumnName("name_fr");
                    b.Property<string>("NormalizedCode").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("normalized_code");
                    b.Property<int>("PlannedBlocksCount").HasColumnType("integer").HasColumnName("planned_blocks_count");
                    b.Property<int>("PlannedUnitsCount").HasColumnType("integer").HasColumnName("planned_units_count");
                    b.Property<string>("Status").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)").HasColumnName("status");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");
                    b.Property<string>("WilayaCode").IsRequired().HasMaxLength(4).HasColumnType("character varying(4)").HasColumnName("wilaya_code");
                    b.Property<string>("WilayaName").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)").HasColumnName("wilaya_name");

                    b.HasKey("Id");
                    b.HasIndex("CreatedByUserId").HasDatabaseName("ix_projects_created_by_user_id");
                    b.HasIndex("NormalizedCode").IsUnique().HasDatabaseName("ux_projects_normalized_code");
                    b.HasIndex("WilayaCode").HasDatabaseName("ix_projects_wilaya_code");
                    b.ToTable("projects", null, t =>
                        {
                            t.HasCheckConstraint("ck_projects_blocks_non_negative", "planned_blocks_count >= 0");
                            t.HasCheckConstraint("ck_projects_budget_non_negative", "estimated_budget_dzd >= 0");
                            t.HasCheckConstraint("ck_projects_units_non_negative", "planned_units_count >= 0");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.ProjectMember", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<DateTimeOffset>("AssignedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("assigned_at_utc");
                    b.Property<Guid>("AssignedByUserId").HasColumnType("uuid").HasColumnName("assigned_by_user_id");
                    b.Property<bool>("CanManageConstruction").HasColumnType("boolean").HasColumnName("can_manage_construction");
                    b.Property<bool>("CanManageDocuments").HasColumnType("boolean").HasColumnName("can_manage_documents");
                    b.Property<bool>("CanManageSales").HasColumnType("boolean").HasColumnName("can_manage_sales");
                    b.Property<bool>("CanViewFinancials").HasColumnType("boolean").HasColumnName("can_view_financials");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<Guid>("ProjectId").HasColumnType("uuid").HasColumnName("project_id");
                    b.Property<string>("RoleInProject").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("role_in_project");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");
                    b.Property<Guid>("UserId").HasColumnType("uuid").HasColumnName("user_id");

                    b.HasKey("Id");
                    b.HasIndex("UserId").HasDatabaseName("ix_project_members_user_id");
                    b.HasIndex("ProjectId", "UserId").IsUnique().HasDatabaseName("ux_project_members_project_user");
                    b.ToTable("project_members", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Role", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<string>("Code").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("code");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<string>("DescriptionAr").IsRequired().HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("description_ar");
                    b.Property<string>("DescriptionFr").IsRequired().HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("description_fr");
                    b.Property<bool>("IsSystemRole").HasColumnType("boolean").HasColumnName("is_system_role");
                    b.Property<string>("NameAr").IsRequired().HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("name_ar");
                    b.Property<string>("NameFr").IsRequired().HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("name_fr");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");

                    b.HasKey("Id");
                    b.HasIndex("Code").IsUnique().HasDatabaseName("ux_roles_code");
                    b.ToTable("roles", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.RolePermission", b =>
                {
                    b.Property<Guid>("RoleId").HasColumnType("uuid").HasColumnName("role_id");
                    b.Property<Guid>("PermissionId").HasColumnType("uuid").HasColumnName("permission_id");

                    b.HasKey("RoleId", "PermissionId");
                    b.HasIndex("PermissionId");
                    b.ToTable("role_permissions", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.StoredFile", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<string>("ContentType").IsRequired().HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("content_type");
                    b.Property<string>("Category").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("category");
                    b.Property<string>("Description").HasMaxLength(500).HasColumnType("character varying(500)").HasColumnName("description");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<string>("OriginalFileName").IsRequired().HasMaxLength(255).HasColumnType("character varying(255)").HasColumnName("original_file_name");
                    b.Property<Guid?>("ProjectId").HasColumnType("uuid").HasColumnName("project_id");
                    b.Property<string>("Scope").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)").HasColumnName("scope");
                    b.Property<string>("Sha256Checksum").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("sha256_checksum");
                    b.Property<long>("SizeBytes").HasColumnType("bigint").HasColumnName("size_bytes");
                    b.Property<string>("StoredRelativePath").IsRequired().HasMaxLength(500).HasColumnType("character varying(500)").HasColumnName("stored_relative_path");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");
                    b.Property<Guid>("UploadedByUserId").HasColumnType("uuid").HasColumnName("uploaded_by_user_id");

                    b.HasKey("Id");
                    b.HasIndex("ProjectId").HasDatabaseName("ix_stored_files_project_id");
                    b.HasIndex("StoredRelativePath").IsUnique().HasDatabaseName("ux_stored_files_relative_path");
                    b.HasIndex("UploadedByUserId").HasDatabaseName("ix_stored_files_uploaded_by_user_id");
                    b.ToTable("stored_files", null, t =>
                        {
                            t.HasCheckConstraint("ck_stored_files_size_positive", "size_bytes > 0");
                            t.HasCheckConstraint("ck_stored_files_category", "category IN ('Legal', 'LandAndTitle', 'Permits', 'Plans', 'Engineering', 'Commercial', 'Financial', 'Correspondence', 'Other')");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.SystemSetting", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<string>("Category").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("category");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<string>("Description").HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("description");
                    b.Property<bool>("IsEncrypted").HasColumnType("boolean").HasColumnName("is_encrypted");
                    b.Property<string>("Key").IsRequired().HasMaxLength(120).HasColumnType("character varying(120)").HasColumnName("key");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");
                    b.Property<string>("Value").IsRequired().HasMaxLength(2000).HasColumnType("character varying(2000)").HasColumnName("value");

                    b.HasKey("Id");
                    b.HasIndex("Key").IsUnique().HasDatabaseName("ux_system_settings_key");
                    b.ToTable("system_settings", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.User", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<Guid>("ConcurrencyStamp").IsConcurrencyToken().HasColumnType("uuid").HasColumnName("concurrency_stamp");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<string>("Email").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)").HasColumnName("email");
                    b.Property<int>("FailedLoginAttempts").HasColumnType("integer").HasColumnName("failed_login_attempts");
                    b.Property<string>("FullName").IsRequired().HasMaxLength(150).HasColumnType("character varying(150)").HasColumnName("full_name");
                    b.Property<bool>("IsActive").HasColumnType("boolean").HasColumnName("is_active");
                    b.Property<bool>("IsSystemAdministrator").HasColumnType("boolean").HasColumnName("is_system_administrator");
                    b.Property<DateTimeOffset?>("LastLoginAtUtc").HasColumnType("timestamp with time zone").HasColumnName("last_login_at_utc");
                    b.Property<DateTimeOffset?>("LockoutEndUtc").HasColumnType("timestamp with time zone").HasColumnName("lockout_end_utc");
                    b.Property<string>("NormalizedEmail").IsRequired().HasMaxLength(160).HasColumnType("character varying(160)").HasColumnName("normalized_email");
                    b.Property<string>("NormalizedUsername").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("normalized_username");
                    b.Property<string>("PasswordHash").IsRequired().HasMaxLength(512).HasColumnType("character varying(512)").HasColumnName("password_hash");
                    b.Property<string>("Phone").HasMaxLength(40).HasColumnType("character varying(40)").HasColumnName("phone");
                    b.Property<string>("PreferredLanguage").IsRequired().HasMaxLength(4).HasColumnType("character varying(4)").HasColumnName("preferred_language");
                    b.Property<Guid>("SecurityStamp").HasColumnType("uuid").HasColumnName("security_stamp");
                    b.Property<DateTimeOffset>("UpdatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("updated_at_utc");
                    b.Property<string>("Username").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("username");

                    b.HasKey("Id");
                    b.HasIndex("IsSystemAdministrator").IsUnique().HasDatabaseName("ux_users_single_system_admin").HasFilter("is_system_administrator = true");
                    b.HasIndex("NormalizedEmail").IsUnique().HasDatabaseName("ux_users_normalized_email");
                    b.HasIndex("NormalizedUsername").IsUnique().HasDatabaseName("ux_users_normalized_username");
                    b.ToTable("users", null, t =>
                        {
                            t.HasCheckConstraint("ck_users_failed_attempts_non_negative", "failed_login_attempts >= 0");
                            t.HasCheckConstraint("ck_users_preferred_language", "preferred_language IN ('ar', 'fr')");
                            t.HasCheckConstraint("ck_users_username_length", "char_length(username) >= 3");
                        });
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.UserRole", b =>
                {
                    b.Property<Guid>("UserId").HasColumnType("uuid").HasColumnName("user_id");
                    b.Property<Guid>("RoleId").HasColumnType("uuid").HasColumnName("role_id");
                    b.Property<DateTimeOffset>("AssignedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("assigned_at_utc");
                    b.Property<Guid?>("AssignedByUserId").HasColumnType("uuid").HasColumnName("assigned_by_user_id");

                    b.HasKey("UserId", "RoleId");
                    b.HasIndex("RoleId");
                    b.ToTable("user_roles", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.UserSession", b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid").HasColumnName("id");
                    b.Property<DateTimeOffset>("CreatedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("created_at_utc");
                    b.Property<DateTimeOffset>("ExpiresAtUtc").HasColumnType("timestamp with time zone").HasColumnName("expires_at_utc");
                    b.Property<string>("IpAddress").HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("ip_address");
                    b.Property<bool>("IsRevoked").HasColumnType("boolean").HasColumnName("is_revoked");
                    b.Property<DateTimeOffset>("LastSeenAtUtc").HasColumnType("timestamp with time zone").HasColumnName("last_seen_at_utc");
                    b.Property<DateTimeOffset?>("RevokedAtUtc").HasColumnType("timestamp with time zone").HasColumnName("revoked_at_utc");
                    b.Property<Guid>("SecurityStamp").HasColumnType("uuid").HasColumnName("security_stamp");
                    b.Property<string>("TokenHash").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)").HasColumnName("token_hash");
                    b.Property<string>("UserAgent").HasMaxLength(300).HasColumnType("character varying(300)").HasColumnName("user_agent");
                    b.Property<Guid>("UserId").HasColumnType("uuid").HasColumnName("user_id");

                    b.HasKey("Id");
                    b.HasIndex("TokenHash").IsUnique().HasDatabaseName("ux_user_sessions_token_hash");
                    b.HasIndex("UserId").HasDatabaseName("ix_user_sessions_user_id");
                    b.ToTable("user_sessions", (string)null);
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Building", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.Project", null)
                        .WithMany()
                        .HasForeignKey("ProjectId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("PromoGest.Domain.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("CreatedByUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.BuildingFloor", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.Building", null)
                        .WithMany()
                        .HasForeignKey("BuildingId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.PropertyUnit", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.BuildingFloor", null)
                        .WithMany()
                        .HasForeignKey("FloorId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("PromoGest.Domain.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("CreatedByUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Project", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("CreatedByUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.ProjectMember", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.Project", "Project")
                        .WithMany("Members")
                        .HasForeignKey("ProjectId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("PromoGest.Domain.Entities.User", "User")
                        .WithMany("ProjectMemberships")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Project");
                    b.Navigation("User");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.RolePermission", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.Permission", "Permission")
                        .WithMany("RolePermissions")
                        .HasForeignKey("PermissionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("PromoGest.Domain.Entities.Role", "Role")
                        .WithMany("RolePermissions")
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Permission");
                    b.Navigation("Role");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.StoredFile", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.Project", null)
                        .WithMany()
                        .HasForeignKey("ProjectId")
                        .OnDelete(DeleteBehavior.Restrict);

                    b.HasOne("PromoGest.Domain.Entities.User", null)
                        .WithMany()
                        .HasForeignKey("UploadedByUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.UserRole", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.Role", "Role")
                        .WithMany("UserRoles")
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("PromoGest.Domain.Entities.User", "User")
                        .WithMany("UserRoles")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Role");
                    b.Navigation("User");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.UserSession", b =>
                {
                    b.HasOne("PromoGest.Domain.Entities.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Permission", b =>
                {
                    b.Navigation("RolePermissions");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Project", b =>
                {
                    b.Navigation("Members");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.Role", b =>
                {
                    b.Navigation("RolePermissions");
                    b.Navigation("UserRoles");
                });

            modelBuilder.Entity("PromoGest.Domain.Entities.User", b =>
                {
                    b.Navigation("ProjectMemberships");
                    b.Navigation("UserRoles");
                });
#pragma warning restore 612, 618
        }
    }
}
