using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class EfProjectCustomerRepository : IProjectCustomerRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectCustomerRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProjectCustomer>> ListByProjectAsync(
        Guid projectId,
        CancellationToken ct = default)
        => await _dbContext.ProjectCustomers
            .AsNoTracking()
            .Where(customer => customer.ProjectId == projectId)
            .OrderByDescending(customer => customer.UpdatedAtUtc)
            .ToListAsync(ct);

    public Task<ProjectCustomer?> GetByProjectAsync(
        Guid projectId,
        Guid customerId,
        CancellationToken ct = default)
        => _dbContext.ProjectCustomers
            .Include(customer => customer.IdentityDocumentFile)
            .Include(customer => customer.Interactions)
            .ThenInclude(interaction => interaction.CreatedByUser)
            .FirstOrDefaultAsync(
                customer => customer.ProjectId == projectId && customer.Id == customerId,
                ct);

    public Task<bool> ExistsDuplicateAsync(
        Guid projectId,
        string normalizedDisplayName,
        string normalizedPhone,
        Guid? excludeCustomerId = null,
        CancellationToken ct = default)
        => _dbContext.ProjectCustomers.AnyAsync(customer =>
            customer.ProjectId == projectId &&
            customer.NormalizedDisplayName == normalizedDisplayName &&
            customer.NormalizedPhone == normalizedPhone &&
            (!excludeCustomerId.HasValue || customer.Id != excludeCustomerId.Value),
            ct);

    public Task AddCustomerAsync(ProjectCustomer customer, CancellationToken ct = default)
    {
        _dbContext.ProjectCustomers.Add(customer);
        return Task.CompletedTask;
    }

    public Task AddInteractionAsync(CustomerInteraction interaction, CancellationToken ct = default)
    {
        _dbContext.CustomerInteractions.Add(interaction);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}