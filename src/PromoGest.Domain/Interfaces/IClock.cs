namespace PromoGest.Domain.Interfaces;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
