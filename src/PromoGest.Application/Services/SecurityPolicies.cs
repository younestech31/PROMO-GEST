namespace PromoGest.Application.Services;

/// <summary>
/// Server-side session timing. Both an absolute lifetime and an idle timeout apply; the shorter
/// one wins. Values are validated and clamped once, at composition time
/// (<c>Security:SessionAbsoluteLifetimeHours</c>, <c>Security:SessionIdleTimeoutMinutes</c>,
/// <c>Security:SessionTouchIntervalMinutes</c>).
/// </summary>
public sealed record SessionPolicy(TimeSpan AbsoluteLifetime, TimeSpan IdleTimeout, TimeSpan TouchInterval)
{
    public static SessionPolicy Default { get; } = new(
        TimeSpan.FromHours(12),
        TimeSpan.FromMinutes(30),
        TimeSpan.FromMinutes(1));

    public void EnsureConsistent()
    {
        if (TouchInterval <= TimeSpan.Zero || TouchInterval >= IdleTimeout)
            throw new InvalidOperationException("SessionTouchIntervalMinutes must be greater than zero and shorter than SessionIdleTimeoutMinutes.");
        if (IdleTimeout <= TimeSpan.Zero || IdleTimeout > AbsoluteLifetime)
            throw new InvalidOperationException("SessionIdleTimeoutMinutes must be greater than zero and not longer than SessionAbsoluteLifetimeHours.");
    }
}

/// <summary>
/// Deadline applied to a password that an administrator issued (account creation or reset).
/// </summary>
public sealed record PasswordLifecyclePolicy(TimeSpan TemporaryPasswordLifetime)
{
    public static PasswordLifecyclePolicy Default { get; } = new(TimeSpan.FromHours(24));
}
