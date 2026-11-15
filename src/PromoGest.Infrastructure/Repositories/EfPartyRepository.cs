using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class EfPartyRepository : IPartyRepository
{
    private readonly AppDbContext _dbContext;

    public EfPartyRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Party?> GetByIdAsync(Guid partyId, CancellationToken ct = default)
        => _dbContext.Parties.FirstOrDefaultAsync(party => party.Id == partyId, ct);

    public async Task<IReadOnlyList<Party>> SearchDirectoryAsync(
        string normalizedPrefix,
        int limit,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(normalizedPrefix))
            return Array.Empty<Party>();

        var boundedLimit = Math.Clamp(limit, 1, 50);
        return await _dbContext.Parties
            .AsNoTracking()
            .Where(party => party.NormalizedDisplayName.StartsWith(normalizedPrefix))
            .OrderBy(party => party.NormalizedDisplayName)
            .ThenBy(party => party.Id)
            .Take(boundedLimit)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Party party, CancellationToken ct = default)
    {
        await _dbContext.Parties.AddAsync(party, ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}
