using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

public sealed class DomainInvariantTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void SystemAdministrator_CannotBeDeactivated_AndCanBeUnlocked()
    {
        var admin = User.CreateSystemAdministrator(
            "sysadmin",
            "Karim Benali",
            "admin@promogest.dz",
            "+213550000001",
            "hash",
            "ar",
            FixedNow);

        var ex = Assert.Throws<DomainException>(() => admin.SetActiveStatus(false, FixedNow.AddMinutes(5)));
        Assert.Equal("CANNOT_DEACTIVATE_SYSTEM_ADMIN", ex.Code);
        Assert.True(admin.IsActive);

        for (var i = 0; i < User.MaxFailedLoginAttempts; i++)
        {
            admin.RecordFailedLogin(FixedNow.AddSeconds(i));
        }
        Assert.True(admin.IsLockedOut(FixedNow.AddMinutes(1)));
        admin.UnlockAccount(FixedNow.AddMinutes(2));
        Assert.False(admin.IsLockedOut(FixedNow.AddMinutes(2)));
        Assert.Equal(0, admin.FailedLoginAttempts);
    }

    [Fact]
    public void User_RejectsInvalidUsernameOrEmailFormat()
    {
        Assert.Throws<DomainException>(() => User.CreateEmployee("ab", "Short", "a@b.dz", null, "hash", "ar", FixedNow));
        Assert.Throws<DomainException>(() => User.CreateEmployee("bad user!", "Space", "a@b.dz", null, "hash", "ar", FixedNow));
        Assert.Throws<DomainException>(() => User.CreateEmployee("valid.user", "Bad Email", "not-an-email", null, "hash", "ar", FixedNow));
    }

    [Fact]
    public void User_LocksOutAfterFiveFailedAttempts_AndRecoversOnSuccess()
    {
        var employee = User.CreateEmployee(
            "sara.commercial",
            "Sara Mansouri",
            "sara@promogest.dz",
            null,
            "hash",
            "fr",
            FixedNow);

        for (var i = 1; i < User.MaxFailedLoginAttempts; i++)
        {
            Assert.False(employee.RecordFailedLogin(FixedNow.AddSeconds(i)));
            Assert.False(employee.IsLockedOut(FixedNow.AddSeconds(i)));
        }

        Assert.True(employee.RecordFailedLogin(FixedNow.AddSeconds(10)));
        Assert.True(employee.IsLockedOut(FixedNow.AddMinutes(5)));
        Assert.False(employee.IsLockedOut(FixedNow.AddMinutes(16)));

        employee.RecordSuccessfulLogin(FixedNow.AddMinutes(20));
        Assert.Equal(0, employee.FailedLoginAttempts);
        Assert.Null(employee.LockoutEndUtc);
    }

    [Fact]
    public void OrganizationSettings_EnforcesAlgerianInvariantsAndRejectsInvalidCodes()
    {
        var org = OrganizationSettings.Initialize(
            "SARL Promotion El-Bahdja",
            "El-Bahdja Immo",
            "sarl",
            "001616012345678",
            "001616012345600",
            "16/00-1234567B20",
            "16012345678",
            50_000_000m,
            "16",
            "Alger",
            "Hydra, Alger",
            "+21321000000",
            "contact@elbahdja.dz",
            "ar",
            FixedNow);

        Assert.Equal("DZD", org.CurrencyCode);
        Assert.Equal("SARL", org.LegalForm);
        Assert.Equal(OrganizationSettings.FixedSingletonGuard, org.SingletonGuard);
        Assert.True(org.IsInitialized);

        Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "SARL Test", null, "SARL", null, null, null, null, null,
            "99", "Unknown", "Address", null, null, "ar", FixedNow));

        Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "SARL Test", null, "INVALID_FORM", null, null, null, null, null,
            "16", "Alger", "Address", null, null, "ar", FixedNow));

        Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "SARL Test", null, "SARL", "123", null, null, null, null,
            "16", "Alger", "Address", null, null, "ar", FixedNow));
    }

    [Fact]
    public void Project_RejectsNegativeBudgetAndInvalidWilaya_AndAssignsUniqueMembership()
    {
        var creatorId = Guid.NewGuid();
        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-01", "مشروع البهجة", "Résidence El-Bahdja", "16", "Alger", "Hydra",
            null, null, null, null, ProjectStatus.Planning, -100m, 2, 24, creatorId, FixedNow));

        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-02", "مشروع", "Résidence", "00", "Invalid", "Hydra",
            null, null, null, null, ProjectStatus.Planning, 100m, 2, 24, creatorId, FixedNow));

        var project = Project.Create(
            "PRJ-01",
            "مشروع البهجة",
            "Résidence El-Bahdja",
            "16",
            "Alger",
            "Hydra",
            null,
            null,
            null,
            null,
            ProjectStatus.Commercialization,
            250_000_000m,
            3,
            48,
            creatorId,
            FixedNow);

        var memberUserId = Guid.NewGuid();
        project.AssignMember(memberUserId, ProjectRole.CommercialAgent, false, true, false, true, creatorId, FixedNow);
        project.AssignMember(memberUserId, ProjectRole.ProjectManager, true, true, true, true, creatorId, FixedNow.AddMinutes(1));

        Assert.Single(project.Members);
        Assert.Equal(ProjectRole.ProjectManager, project.Members.Single().RoleInProject);
        Assert.True(project.Members.Single().CanViewFinancials);
    }

    [Fact]
    public void AuditLog_SanitizesControlCharsAndClampsOversizedFields()
    {
        var longUserAgent = new string('A', 450);
        var longSummary = "Line1\r\nLine2 " + new string('B', 600);
        var entry = AuditLog.Record(
            FixedNow,
            null,
            new string('u', 100),
            "AUTH_LOGIN_FAILED",
            AuditSeverity.Security,
            "User",
            "123",
            longSummary,
            null,
            "127.0.0.1",
            longUserAgent);

        Assert.Equal(64, entry.ActorUsername!.Length);
        Assert.Equal(500, entry.Summary.Length);
        Assert.DoesNotContain("\r", entry.Summary);
        Assert.DoesNotContain("\n", entry.Summary);
        Assert.Equal(300, entry.UserAgent!.Length);
    }
}
