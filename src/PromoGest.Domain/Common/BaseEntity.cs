namespace PromoGest.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAtUtc { get; protected set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; protected set; } = DateTimeOffset.UtcNow;
    public Guid ConcurrencyStamp { get; protected set; } = Guid.NewGuid();

    public void Touch(DateTimeOffset nowUtc)
    {
        UpdatedAtUtc = nowUtc;
        ConcurrencyStamp = Guid.NewGuid();
    }
}
