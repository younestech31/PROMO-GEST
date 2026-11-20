using PromoGest.Domain.Entities;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

/// <summary>
/// Covers the two server-enforced credential boundaries added after the 2026-11-20 review:
/// the idle lock on sessions and the configurable temporary-password deadline.
/// </summary>
public sealed class SessionAndPasswordLifecycleTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 20, 8, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan IdleTimeout = TimeSpan.FromMinutes(30);

    private static User NewUser() => User.CreateEmployee(
        "agent.one",
        "Agent One",
        "agent.one@example.invalid",
        null,
        "hash-initial",
        "ar",
        Start);

    private static UserSession NewSession(DateTimeOffset? expiresAtUtc = null) => UserSession.Create(
        Guid.NewGuid(),
        "token-hash",
        Guid.NewGuid(),
        Start,
        expiresAtUtc ?? Start.AddHours(12),
        "127.0.0.1",
        "xUnit");

    [Fact]
    public void Session_ExpiresAfterIdleTimeout_AndActivityExtendsIt()
    {
        var session = NewSession();

        Assert.True(session.IsValid(Start.AddMinutes(29), IdleTimeout));
        Assert.False(session.IsIdleExpired(Start.AddMinutes(29), IdleTimeout));

        Assert.False(session.IsValid(Start.AddMinutes(30), IdleTimeout));
        Assert.True(session.IsIdleExpired(Start.AddMinutes(30), IdleTimeout));

        session.Touch(Start.AddMinutes(20));

        Assert.True(session.IsValid(Start.AddMinutes(45), IdleTimeout));
        Assert.False(session.IsIdleExpired(Start.AddMinutes(45), IdleTimeout));
    }

    [Fact]
    public void Session_AbsoluteExpiryStillApplies_WhenIdleTimeoutIsLonger()
    {
        var session = NewSession(Start.AddHours(1));

        Assert.False(session.IsValid(Start.AddHours(2), TimeSpan.FromHours(8)));
        Assert.False(session.IsIdleExpired(Start.AddHours(2), TimeSpan.FromHours(8)));
    }

    [Fact]
    public void RevokedSession_IsNeverValid_EvenWithinIdleWindow()
    {
        var session = NewSession();
        session.Revoke(Start.AddMinutes(5));

        Assert.False(session.IsValid(Start.AddMinutes(6), IdleTimeout));
        Assert.False(session.IsIdleExpired(Start.AddMinutes(6), IdleTimeout));
    }

    [Fact]
    public void RequirePasswordChange_UsesConfiguredLifetime()
    {
        var user = NewUser();
        var stampBefore = user.SecurityStamp;

        user.RequirePasswordChange(Start, TimeSpan.FromHours(72));

        Assert.True(user.MustChangePasswordAtNextLogin);
        Assert.Equal(Start.AddHours(72), user.PasswordChangeRequiredUntilUtc);
        Assert.NotEqual(stampBefore, user.SecurityStamp);
    }

    [Fact]
    public void RequirePasswordChange_RejectsOutOfRangeLifetime()
    {
        var user = NewUser();

        Assert.Throws<DomainException>(() => user.RequirePasswordChange(Start, TimeSpan.Zero));
        Assert.Throws<DomainException>(() => user.RequirePasswordChange(Start, TimeSpan.FromDays(30)));
    }

    [Fact]
    public void ChangePassword_ClearsMandatoryRotation_AndRotatesStamp()
    {
        var user = NewUser();
        user.RequirePasswordChange(Start, TimeSpan.FromHours(24));
        var stampBefore = user.SecurityStamp;

        user.ChangePassword("hash-personal", Start.AddHours(1));

        Assert.False(user.MustChangePasswordAtNextLogin);
        Assert.Null(user.PasswordChangeRequiredUntilUtc);
        Assert.NotEqual(stampBefore, user.SecurityStamp);
        Assert.Equal("hash-personal", user.PasswordHash);
    }

    [Fact]
    public void ResetPassword_RequiresRotationAgain_WithConfiguredDeadline()
    {
        var user = NewUser();

        user.ResetPassword("hash-temporary", Start, TimeSpan.FromHours(48));

        Assert.True(user.MustChangePasswordAtNextLogin);
        Assert.Equal(Start.AddHours(48), user.PasswordChangeRequiredUntilUtc);
        Assert.Equal("hash-temporary", user.PasswordHash);
    }

    [Fact]
    public void ResetPasswordFromLocalConsole_LeavesPasswordUsable_AndClearsDeadline()
    {
        var user = NewUser();
        user.RequirePasswordChange(Start, TimeSpan.FromHours(24));

        user.ResetPasswordFromLocalConsole("hash-recovered", Start.AddHours(2));

        Assert.False(user.MustChangePasswordAtNextLogin);
        Assert.Null(user.PasswordChangeRequiredUntilUtc);
        Assert.Equal("hash-recovered", user.PasswordHash);
        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.Null(user.LockoutEndUtc);
    }
}
