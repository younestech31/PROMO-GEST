using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.OccurredAtUtc).HasColumnName("occurred_at_utc").IsRequired();
        builder.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
        builder.Property(x => x.ActorUsername).HasColumnName("actor_username").HasMaxLength(64);
        builder.Property(x => x.EventType).HasColumnName("event_type").HasMaxLength(64).IsRequired();
        builder.Property(x => x.Severity).HasColumnName("severity").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.TargetEntityType).HasColumnName("target_entity_type").HasMaxLength(64);
        builder.Property(x => x.TargetEntityId).HasColumnName("target_entity_id").HasMaxLength(64);
        builder.Property(x => x.Summary).HasColumnName("summary").HasMaxLength(500).IsRequired();
        builder.Property(x => x.MetadataJson).HasColumnName("metadata_json").HasColumnType("jsonb");
        builder.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(64);
        builder.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(300);

        builder.HasIndex(x => x.OccurredAtUtc).HasDatabaseName("ix_audit_logs_occurred_at_utc");
        builder.HasIndex(x => x.EventType).HasDatabaseName("ix_audit_logs_event_type");
    }
}

public sealed class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.ToTable("system_settings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Key).HasColumnName("key").HasMaxLength(120).IsRequired();
        builder.Property(x => x.Value).HasColumnName("value").HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Category).HasColumnName("category").HasMaxLength(64).IsRequired();
        builder.Property(x => x.IsEncrypted).HasColumnName("is_encrypted").IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(300);
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => x.Key).IsUnique().HasDatabaseName("ux_system_settings_key");
    }
}

public sealed class StoredFileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> builder)
    {
        builder.ToTable("stored_files", table =>
        {
            table.HasCheckConstraint("ck_stored_files_size_positive", "size_bytes > 0");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.OriginalFileName).HasColumnName("original_file_name").HasMaxLength(255).IsRequired();
        builder.Property(x => x.StoredRelativePath).HasColumnName("stored_relative_path").HasMaxLength(500).IsRequired();
        builder.Property(x => x.ContentType).HasColumnName("content_type").HasMaxLength(120).IsRequired();
        builder.Property(x => x.SizeBytes).HasColumnName("size_bytes").IsRequired();
        builder.Property(x => x.Sha256Checksum).HasColumnName("sha256_checksum").HasMaxLength(64).IsRequired();
        builder.Property(x => x.Scope).HasColumnName("scope").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.ProjectId).HasColumnName("project_id");
        builder.Property(x => x.UploadedByUserId).HasColumnName("uploaded_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => x.StoredRelativePath).IsUnique().HasDatabaseName("ux_stored_files_relative_path");
        builder.HasIndex(x => x.ProjectId).HasDatabaseName("ix_stored_files_project_id");
        builder.HasIndex(x => x.UploadedByUserId).HasDatabaseName("ix_stored_files_uploaded_by_user_id");

        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.ToTable("user_sessions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(x => x.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
        builder.Property(x => x.SecurityStamp).HasColumnName("security_stamp").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.ExpiresAtUtc).HasColumnName("expires_at_utc").IsRequired();
        builder.Property(x => x.LastSeenAtUtc).HasColumnName("last_seen_at_utc").IsRequired();
        builder.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(64);
        builder.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(300);
        builder.Property(x => x.IsRevoked).HasColumnName("is_revoked").IsRequired();
        builder.Property(x => x.RevokedAtUtc).HasColumnName("revoked_at_utc");

        builder.HasIndex(x => x.TokenHash).IsUnique().HasDatabaseName("ux_user_sessions_token_hash");
        builder.HasIndex(x => x.UserId).HasDatabaseName("ix_user_sessions_user_id");

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
