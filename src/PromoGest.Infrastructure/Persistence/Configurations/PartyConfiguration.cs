using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class PartyConfiguration : IEntityTypeConfiguration<Party>
{
    public void Configure(EntityTypeBuilder<Party> builder)
    {
        builder.ToTable("parties", table =>
        {
            table.HasCheckConstraint("ck_parties_kind", "party_kind IN ('Person', 'LegalEntity')");
            table.HasCheckConstraint("ck_parties_name_non_empty", "length(btrim(display_name)) > 0");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Kind).HasColumnName("party_kind").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(200).IsRequired();
        builder.Property(x => x.NormalizedDisplayName).HasColumnName("normalized_display_name").HasMaxLength(200).IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        // Similar names are deliberately not globally unique: matching is a review workflow, not an identity constraint.
        builder.HasIndex(x => x.NormalizedDisplayName)
            .HasDatabaseName("ix_parties_normalized_display_name");
    }
}