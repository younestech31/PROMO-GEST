using System.Data;
using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Contracts.Reference;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class EfAdministrativeReferenceReadRepository(AppDbContext db) : IAdministrativeReferenceReadRepository
{
    public Task<StagedAdministrativeSnapshotDto?> GetSnapshotAsync(string snapshotId, CancellationToken ct = default)
        => ReadConsistentlyAsync<StagedAdministrativeSnapshotDto?>(async () =>
        {
            var version = await db.AdministrativeReferenceVersions.AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == snapshotId, ct);
            if (version is null) return null;
            var wilayas = await db.AdministrativeWilayaVersions.AsNoTracking()
                .Where(x => x.SnapshotId == snapshotId).OrderBy(x => x.SystemCode).ThenBy(x => x.WilayaId)
                .ToListAsync(ct);
            var communes = db.AdministrativeCommuneVersions.AsNoTracking().Where(x => x.SnapshotId == snapshotId);
            var perWilaya = await communes.GroupBy(x => x.WilayaId)
                .Select(g => new { Id = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.Count, ct);
            var communeCount = perWilaya.Values.Sum();
            var aliasCount = await db.AdministrativeCommuneAliases.AsNoTracking().CountAsync(x => x.SnapshotId == snapshotId, ct);
            var observedDairas = await communes.Select(x => new { x.WilayaId, x.DairaNameAr, x.DairaNameFr }).Distinct().CountAsync(ct);
            var countsMatch = wilayas.Count == version.WilayaCount && communeCount == version.CommuneCount
                && aliasCount == version.AliasCount && observedDairas == version.ObservedDairaCount
                && wilayas.Sum(x => x.DeclaredDairaCount) == version.DeclaredDairaCount
                && wilayas.All(x => perWilaya.GetValueOrDefault(x.WilayaId) == x.DeclaredCommuneCount);
            return new StagedAdministrativeSnapshotDto(
                version.Id, version.CanonicalContentSha256, version.ManifestSha256,
                version.SourceSpreadsheetId, version.ClaimedCaptureAtUtc, "StagedNotActivated",
                version.WilayaCount, version.CommuneCount, version.AliasCount,
                version.DeclaredDairaCount, version.ObservedDairaCount,
                wilayas.Count, communeCount, aliasCount, observedDairas, countsMatch,
                wilayas.Select(x => new StagedAdministrativeWilayaDto(
                    x.WilayaId, x.SystemCode, x.NameAr, x.NameFr, x.NameArSource,
                    x.DeclaredCommuneCount, perWilaya.GetValueOrDefault(x.WilayaId), x.DeclaredDairaCount)).ToList());
        }, ct);

    public Task<StagedAdministrativeCommunePageDto?> GetCommunesAsync(
        string snapshotId, string? wilayaCode, string? query, int page, int pageSize, CancellationToken ct = default)
        => ReadConsistentlyAsync<StagedAdministrativeCommunePageDto?>(async () =>
        {
            if (!await db.AdministrativeReferenceVersions.AsNoTracking().AnyAsync(x => x.Id == snapshotId, ct)) return null;
            var rows = from commune in db.AdministrativeCommuneVersions.AsNoTracking()
                       where commune.SnapshotId == snapshotId
                       join wilaya in db.AdministrativeWilayaVersions.AsNoTracking()
                           on new { commune.SnapshotId, commune.WilayaId } equals new { wilaya.SnapshotId, wilaya.WilayaId }
                       join alias in db.AdministrativeCommuneAliases.AsNoTracking()
                           on new { commune.SnapshotId, commune.CommuneId } equals new { alias.SnapshotId, alias.CommuneId } into aliases
                       from alias in aliases.DefaultIfEmpty()
                       select new { Commune = commune, Wilaya = wilaya, Alias = alias };
            if (wilayaCode is not null) rows = rows.Where(x => x.Wilaya.SystemCode == wilayaCode);
            if (query is not null)
            {
                var pattern = "%" + query.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
                rows = rows.Where(x => EF.Functions.ILike(x.Commune.SystemCode, pattern, "\\")
                    || EF.Functions.ILike(x.Commune.NameAr, pattern, "\\") || EF.Functions.ILike(x.Commune.NameFr, pattern, "\\")
                    || EF.Functions.ILike(x.Commune.DairaNameAr, pattern, "\\") || EF.Functions.ILike(x.Commune.DairaNameFr, pattern, "\\")
                    || (x.Alias != null && (EF.Functions.ILike(x.Alias.AliasNameFr, pattern, "\\")
                        || EF.Functions.ILike(x.Alias.RepositoryNameAr, pattern, "\\"))));
            }
            var count = await rows.CountAsync(ct);
            var items = await rows.OrderBy(x => x.Commune.SystemCode).ThenBy(x => x.Commune.CommuneId)
                .Skip(checked((page - 1) * pageSize)).Take(pageSize)
                .Select(x => new StagedAdministrativeCommuneDto(
                    x.Commune.CommuneId, x.Commune.SystemCode, x.Wilaya.WilayaId, x.Wilaya.SystemCode,
                    x.Commune.NameAr, x.Commune.NameFr, x.Commune.DairaNameAr, x.Commune.DairaNameFr,
                    x.Commune.IsDairaSeat, x.Commune.ParentEffectiveFrom, x.Commune.ParentEffectiveTo,
                    x.Commune.ParentDateEvidence, x.Alias == null ? null : new StagedAdministrativeAliasDto(
                        x.Alias.ReferenceNameAr, x.Alias.ReferenceNameFr, x.Alias.AliasNameFr,
                        x.Alias.RepositoryNameAr, x.Alias.Evidence)))
                .ToListAsync(ct);
            return new StagedAdministrativeCommunePageDto(snapshotId, page, pageSize, count,
                (int)Math.Ceiling((double)count / pageSize), items);
        }, ct);

    private Task<T> ReadConsistentlyAsync<T>(Func<Task<T>> read, CancellationToken ct)
        => db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
            // Runtime already has SELECT-only grants; also prevent accidental writes in this read unit.
            await db.Database.ExecuteSqlRawAsync("SET TRANSACTION READ ONLY", ct);
            var result = await read();
            await transaction.CommitAsync(ct);
            return result;
        });
}
