using PromoGest.Contracts.Reference;

namespace PromoGest.Application.Interfaces;

public interface IAdministrativeReferenceReadRepository
{
    // Each read is one consistent DB snapshot; a removed version is not an empty catalogue.
    Task<StagedAdministrativeSnapshotDto?> GetSnapshotAsync(string snapshotId, CancellationToken ct = default);
    Task<StagedAdministrativeCommunePageDto?> GetCommunesAsync(
        string snapshotId, string? wilayaCode, string? query, int page, int pageSize,
        CancellationToken ct = default);
}
