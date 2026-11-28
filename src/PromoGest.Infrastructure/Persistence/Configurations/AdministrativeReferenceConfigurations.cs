using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Reference;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class AdministrativeReferenceVersionConfiguration : IEntityTypeConfiguration<AdministrativeReferenceVersion>
{
    public void Configure(EntityTypeBuilder<AdministrativeReferenceVersion> builder)
    {
        builder.ToTable("admin_reference_versions", table =>
        {
            table.HasCheckConstraint("ck_admin_reference_hashes", "canonical_content_sha256 ~ '^[0-9a-f]{64}$' AND manifest_sha256 ~ '^[0-9a-f]{64}$' AND id = 'sheets-sha256-' || canonical_content_sha256");
            table.HasCheckConstraint("ck_admin_reference_counts", "wilaya_count > 0 AND commune_count > 0 AND alias_count >= 0 AND declared_daira_count >= 0 AND observed_daira_count >= 0");
            table.HasCheckConstraint("ck_admin_reference_source", "length(btrim(source_spreadsheet_id)) > 0");
        });
        builder.HasKey(x => x.Id).HasName("pk_admin_reference_versions");
        builder.Property(x => x.Id).HasColumnName("id").HasMaxLength(78).IsRequired();
        builder.Property(x => x.CanonicalContentSha256).HasColumnName("canonical_content_sha256").HasMaxLength(64).IsRequired();
        builder.Property(x => x.ManifestSha256).HasColumnName("manifest_sha256").HasMaxLength(64).IsRequired();
        builder.Property(x => x.SourceSpreadsheetId).HasColumnName("source_spreadsheet_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.ClaimedCaptureAtUtc).HasColumnName("claimed_capture_at_utc");
        builder.Property(x => x.WilayaCount).HasColumnName("wilaya_count");
        builder.Property(x => x.CommuneCount).HasColumnName("commune_count");
        builder.Property(x => x.AliasCount).HasColumnName("alias_count");
        builder.Property(x => x.DeclaredDairaCount).HasColumnName("declared_daira_count");
        builder.Property(x => x.ObservedDairaCount).HasColumnName("observed_daira_count");
    }
}

public sealed class AdministrativeWilayaIdentityConfiguration : IEntityTypeConfiguration<AdministrativeWilayaIdentity>
{
    public void Configure(EntityTypeBuilder<AdministrativeWilayaIdentity> builder)
    {
        builder.ToTable("admin_wilaya_identities");
        builder.HasKey(x => x.Id).HasName("pk_admin_wilaya_identities");
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
    }
}

public sealed class AdministrativeCommuneIdentityConfiguration : IEntityTypeConfiguration<AdministrativeCommuneIdentity>
{
    public void Configure(EntityTypeBuilder<AdministrativeCommuneIdentity> builder)
    {
        builder.ToTable("admin_commune_identities");
        builder.HasKey(x => x.Id).HasName("pk_admin_commune_identities");
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
    }
}

public sealed class AdministrativeWilayaVersionConfiguration : IEntityTypeConfiguration<AdministrativeWilayaVersion>
{
    public void Configure(EntityTypeBuilder<AdministrativeWilayaVersion> builder)
    {
        builder.ToTable("admin_wilaya_versions", table =>
        {
            table.HasCheckConstraint("ck_admin_wilaya_code", "system_code ~ '^[0-9]{2}$'");
            table.HasCheckConstraint("ck_admin_wilaya_labels", "length(btrim(name_fr)) > 0 AND length(btrim(name_ar)) > 0 AND length(btrim(name_ar_source)) > 0");
            table.HasCheckConstraint("ck_admin_wilaya_counts", "declared_daira_count >= 0 AND declared_commune_count > 0");
        });
        builder.HasKey(x => new { x.SnapshotId, x.WilayaId }).HasName("pk_admin_wilaya_versions");
        builder.Property(x => x.SnapshotId).HasColumnName("snapshot_id").HasMaxLength(78).IsRequired();
        builder.Property(x => x.WilayaId).HasColumnName("wilaya_id");
        builder.Property(x => x.SystemCode).HasColumnName("system_code").HasMaxLength(2).IsRequired();
        builder.Property(x => x.NameFr).HasColumnName("name_fr").HasMaxLength(256).IsRequired();
        builder.Property(x => x.NameAr).HasColumnName("name_ar").HasMaxLength(256).IsRequired();
        builder.Property(x => x.DeclaredDairaCount).HasColumnName("declared_daira_count");
        builder.Property(x => x.DeclaredCommuneCount).HasColumnName("declared_commune_count");
        builder.Property(x => x.NameArSource).HasColumnName("name_ar_source").HasMaxLength(1000).IsRequired();
        builder.HasIndex(x => new { x.SnapshotId, x.SystemCode }).IsUnique().HasDatabaseName("ux_admin_wilaya_version_code");
        builder.HasIndex(x => x.WilayaId).HasDatabaseName("ix_admin_wilaya_identity");
        builder.HasOne<AdministrativeReferenceVersion>().WithMany().HasForeignKey(x => x.SnapshotId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_admin_wilaya_version_snapshot");
        builder.HasOne<AdministrativeWilayaIdentity>().WithMany().HasForeignKey(x => x.WilayaId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_admin_wilaya_version_identity");
    }
}

public sealed class AdministrativeCommuneVersionConfiguration : IEntityTypeConfiguration<AdministrativeCommuneVersion>
{
    public void Configure(EntityTypeBuilder<AdministrativeCommuneVersion> builder)
    {
        builder.ToTable("admin_commune_versions", table =>
        {
            table.HasCheckConstraint("ck_admin_commune_code", "system_code ~ '^[0-9]{4}$'");
            table.HasCheckConstraint("ck_admin_commune_labels", "length(btrim(name_fr)) > 0 AND length(btrim(name_ar)) > 0 AND length(btrim(daira_name_fr)) > 0 AND length(btrim(daira_name_ar)) > 0");
            table.HasCheckConstraint("ck_admin_commune_parent_dates", "((parent_effective_from IS NULL AND parent_effective_to IS NULL AND parent_date_evidence IS NULL) OR (parent_effective_from IS NOT NULL AND parent_date_evidence IS NOT NULL AND length(btrim(parent_date_evidence)) > 0 AND (parent_effective_to IS NULL OR parent_effective_to > parent_effective_from)))");
        });
        builder.HasKey(x => new { x.SnapshotId, x.CommuneId }).HasName("pk_admin_commune_versions");
        builder.Property(x => x.SnapshotId).HasColumnName("snapshot_id").HasMaxLength(78).IsRequired();
        builder.Property(x => x.CommuneId).HasColumnName("commune_id");
        builder.Property(x => x.SystemCode).HasColumnName("system_code").HasMaxLength(4).IsRequired();
        builder.Property(x => x.NameFr).HasColumnName("name_fr").HasMaxLength(256).IsRequired();
        builder.Property(x => x.NameAr).HasColumnName("name_ar").HasMaxLength(256).IsRequired();
        builder.Property(x => x.WilayaId).HasColumnName("wilaya_id");
        builder.Property(x => x.DairaNameFr).HasColumnName("daira_name_fr").HasMaxLength(256).IsRequired();
        builder.Property(x => x.DairaNameAr).HasColumnName("daira_name_ar").HasMaxLength(256).IsRequired();
        builder.Property(x => x.IsDairaSeat).HasColumnName("is_daira_seat");
        builder.Property(x => x.ParentEffectiveFrom).HasColumnName("parent_effective_from");
        builder.Property(x => x.ParentEffectiveTo).HasColumnName("parent_effective_to");
        builder.Property(x => x.ParentDateEvidence).HasColumnName("parent_date_evidence").HasMaxLength(1000);
        builder.HasIndex(x => new { x.SnapshotId, x.SystemCode }).IsUnique().HasDatabaseName("ux_admin_commune_version_code");
        builder.HasIndex(x => x.CommuneId).HasDatabaseName("ix_admin_commune_identity");
        builder.HasIndex(x => new { x.SnapshotId, x.WilayaId }).HasDatabaseName("ix_admin_commune_version_wilaya");
        builder.HasOne<AdministrativeReferenceVersion>().WithMany().HasForeignKey(x => x.SnapshotId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_admin_commune_version_snapshot");
        builder.HasOne<AdministrativeCommuneIdentity>().WithMany().HasForeignKey(x => x.CommuneId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_admin_commune_version_identity");
        builder.HasOne<AdministrativeWilayaVersion>().WithMany().HasForeignKey(x => new { x.SnapshotId, x.WilayaId }).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_admin_commune_version_wilaya");
    }
}

public sealed class AdministrativeCommuneAliasConfiguration : IEntityTypeConfiguration<AdministrativeCommuneAlias>
{
    public void Configure(EntityTypeBuilder<AdministrativeCommuneAlias> builder)
    {
        builder.ToTable("admin_commune_aliases", table =>
        {
            table.HasCheckConstraint("ck_admin_commune_alias_labels", "length(btrim(reference_name_fr)) > 0 AND length(btrim(alias_name_fr)) > 0 AND length(btrim(reference_name_ar)) > 0 AND length(btrim(repository_name_ar)) > 0 AND length(btrim(evidence)) > 0");
        });
        builder.HasKey(x => new { x.SnapshotId, x.CommuneId }).HasName("pk_admin_commune_aliases");
        builder.Property(x => x.SnapshotId).HasColumnName("snapshot_id").HasMaxLength(78).IsRequired();
        builder.Property(x => x.CommuneId).HasColumnName("commune_id");
        builder.Property(x => x.ReferenceNameFr).HasColumnName("reference_name_fr").HasMaxLength(256).IsRequired();
        builder.Property(x => x.AliasNameFr).HasColumnName("alias_name_fr").HasMaxLength(256).IsRequired();
        builder.Property(x => x.ReferenceNameAr).HasColumnName("reference_name_ar").HasMaxLength(256).IsRequired();
        builder.Property(x => x.RepositoryNameAr).HasColumnName("repository_name_ar").HasMaxLength(256).IsRequired();
        builder.Property(x => x.Evidence).HasColumnName("evidence").HasMaxLength(2000).IsRequired();
        builder.HasOne<AdministrativeCommuneVersion>().WithMany().HasForeignKey(x => new { x.SnapshotId, x.CommuneId }).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_admin_commune_alias_version");
    }
}
