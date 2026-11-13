using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class OrganizationSettingsConfiguration : IEntityTypeConfiguration<OrganizationSettings>
{
    public void Configure(EntityTypeBuilder<OrganizationSettings> builder)
    {
        builder.ToTable("organization_settings", table =>
        {
            table.HasCheckConstraint("ck_organization_singleton_guard", "singleton_guard = 1");
            table.HasCheckConstraint("ck_organization_share_capital_non_negative", "share_capital_dzd IS NULL OR share_capital_dzd >= 0");
            table.HasCheckConstraint("ck_organization_default_language", "default_language IN ('ar', 'fr')");
            table.HasCheckConstraint("ck_organization_currency_dzd", "currency_code = 'DZD'");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.LegalName).HasColumnName("legal_name").HasMaxLength(200).IsRequired();
        builder.Property(x => x.TradeName).HasColumnName("trade_name").HasMaxLength(200);
        builder.Property(x => x.LegalForm).HasColumnName("legal_form").HasMaxLength(24).IsRequired();
        builder.Property(x => x.Nif).HasColumnName("nif").HasMaxLength(32);
        builder.Property(x => x.Nis).HasColumnName("nis").HasMaxLength(32);
        builder.Property(x => x.TradeRegisterNumber).HasColumnName("trade_register_number").HasMaxLength(64);
        builder.Property(x => x.TaxArticleNumber).HasColumnName("tax_article_number").HasMaxLength(64);
        builder.Property(x => x.ShareCapitalDzd).HasColumnName("share_capital_dzd").HasPrecision(18, 2);
        builder.Property(x => x.WilayaCode).HasColumnName("wilaya_code").HasMaxLength(4).IsRequired();
        builder.Property(x => x.WilayaName).HasColumnName("wilaya_name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.Address).HasColumnName("address").HasMaxLength(300).IsRequired();
        builder.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(40);
        builder.Property(x => x.Email).HasColumnName("email").HasMaxLength(160);
        builder.Property(x => x.DefaultLanguage).HasColumnName("default_language").HasMaxLength(4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
        builder.Property(x => x.IsInitialized).HasColumnName("is_initialized").IsRequired();
        builder.Property(x => x.InitializedAtUtc).HasColumnName("initialized_at_utc");
        builder.Property(x => x.SingletonGuard).HasColumnName("singleton_guard").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => x.SingletonGuard).IsUnique().HasDatabaseName("ux_organization_settings_singleton");
    }
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", table =>
        {
            table.HasCheckConstraint("ck_users_failed_attempts_non_negative", "failed_login_attempts >= 0");
            table.HasCheckConstraint("ck_users_preferred_language", "preferred_language IN ('ar', 'fr')");
            table.HasCheckConstraint("ck_users_username_length", "char_length(username) >= 3");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Username).HasColumnName("username").HasMaxLength(64).IsRequired();
        builder.Property(x => x.NormalizedUsername).HasColumnName("normalized_username").HasMaxLength(64).IsRequired();
        builder.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.Email).HasColumnName("email").HasMaxLength(160).IsRequired();
        builder.Property(x => x.NormalizedEmail).HasColumnName("normalized_email").HasMaxLength(160).IsRequired();
        builder.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(40);
        builder.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(512).IsRequired();
        builder.Property(x => x.IsSystemAdministrator).HasColumnName("is_system_administrator").IsRequired();
        builder.Property(x => x.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(x => x.PreferredLanguage).HasColumnName("preferred_language").HasMaxLength(4).IsRequired();
        builder.Property(x => x.FailedLoginAttempts).HasColumnName("failed_login_attempts").IsRequired();
        builder.Property(x => x.LockoutEndUtc).HasColumnName("lockout_end_utc");
        builder.Property(x => x.LastLoginAtUtc).HasColumnName("last_login_at_utc");
        builder.Property(x => x.SecurityStamp).HasColumnName("security_stamp").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => x.NormalizedUsername).IsUnique().HasDatabaseName("ux_users_normalized_username");
        builder.HasIndex(x => x.NormalizedEmail).IsUnique().HasDatabaseName("ux_users_normalized_email");
        builder.HasIndex(x => x.IsSystemAdministrator)
            .IsUnique()
            .HasFilter("is_system_administrator = true")
            .HasDatabaseName("ux_users_single_system_admin");
    }
}
