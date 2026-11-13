using Microsoft.EntityFrameworkCore;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedRolesAndPermissionsAsync(AppDbContext dbContext, CancellationToken ct = default)
    {
        var seedTime = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

        var permissions = new[]
        {
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000001"), "org.read", "Organization", "قراءة بيانات المؤسسة", "Consulter les paramètres de l'organisation", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000002"), "org.manage", "Organization", "تعديل بيانات المؤسسة", "Modifier les paramètres de l'organisation", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000003"), "users.read", "Administration", "عرض حسابات الموظفين", "Consulter les comptes employés", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000004"), "users.manage", "Administration", "إدارة حسابات الموظفين", "Gérer les comptes employés", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000005"), "projects.read", "Projects", "الاطلاع على المشاريع المصرح بها", "Consulter les projets autorisés", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000006"), "projects.create", "Projects", "إنشاء مشاريع عقارية جديدة", "Créer de nouveaux projets immobiliers", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000007"), "projects.manage", "Projects", "تعديل بيانات المشاريع", "Modifier les projets", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000008"), "projects.access.manage", "Projects", "إدارة صلاحيات الوصول للمشاريع", "Gérer les accès aux projets", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000009"), "audit.read", "Security", "الاطلاع على سجل التدقيق الأمني", "Consulter le journal d'audit de sécurité", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000010"), "files.read", "Documents", "تحميل الوثائق المحلية", "Télécharger les documents locaux", seedTime),
            Permission.Create(Guid.Parse("10000000-0000-0000-0000-000000000011"), "files.write", "Documents", "رفع الوثائق المحلية", "Téléverser des documents locaux", seedTime)
        };

        var existingPermCodes = await dbContext.Permissions.Select(p => p.Code).ToListAsync(ct);
        foreach (var perm in permissions)
        {
            if (!existingPermCodes.Contains(perm.Code, StringComparer.OrdinalIgnoreCase))
            {
                await dbContext.Permissions.AddAsync(perm, ct);
            }
        }

        var roles = new[]
        {
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000001"), Role.SystemAdminCode, "مدير النظام", "Administrateur Système", "الصلاحية الكاملة الوحيدة لإدارة النظام المحلي", "Compte unique d'administration locale du système", true, seedTime),
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000002"), Role.ProjectDirectorCode, "مدير المشاريع", "Directeur de Projets", "إدارة المشاريع العقارية وتعيين فرق العمل", "Pilotage des projets immobiliers et affectation des équipes", false, seedTime),
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000003"), Role.CommercialManagerCode, "مسؤول المبيعات والتسويق", "Responsable Commercial", "متابعة الزبائن والمبيعات والحجوزات ضمن المشاريع المصرح بها", "Suivi des clients, ventes et réservations sur les projets autorisés", false, seedTime),
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000004"), Role.FinanceOfficerCode, "مسؤول المالية والمحاسبة", "Responsable Financier", "متابعة الدفعات والمستحقات المالية للمشاريع المصرح بها", "Suivi des encaissements et échéanciers des projets autorisés", false, seedTime),
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000005"), Role.SiteEngineerCode, "مهندس متابعة الأشغال", "Ingénieur Travaux", "تحديث تقدم الأشغال والوثائق التقنية للمشاريع المصرح بها", "Suivi de l'avancement des travaux et dossiers techniques", false, seedTime),
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000006"), Role.LegalOfficerCode, "المكلف بالشؤون القانونية والعقود", "Chargé Juridique & Contrats", "إعداد ومراجعة العقود والوثائق العقارية", "Préparation et vérification des actes et contrats immobiliers", false, seedTime),
            Role.Create(Guid.Parse("20000000-0000-0000-0000-000000000007"), Role.ViewerCode, "مستخدم للمطالعة فقط", "Consultant Lecture Seule", "الاطلاع فقط على المشاريع المصرح بها", "Consultation en lecture seule des projets autorisés", false, seedTime)
        };

        var existingRoleCodes = await dbContext.Roles.Select(r => r.Code).ToListAsync(ct);
        foreach (var role in roles)
        {
            if (!existingRoleCodes.Contains(role.Code, StringComparer.OrdinalIgnoreCase))
            {
                await dbContext.Roles.AddAsync(role, ct);
            }
        }

        await dbContext.SaveChangesAsync(ct);

        var roleMap = await dbContext.Roles.ToDictionaryAsync(r => r.Code, r => r.Id, ct);
        var permMap = await dbContext.Permissions.ToDictionaryAsync(p => p.Code, p => p.Id, ct);
        var existingLinks = await dbContext.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync(ct);

        void Link(string roleCode, params string[] permCodes)
        {
            var rId = roleMap[roleCode];
            foreach (var pCode in permCodes)
            {
                var pId = permMap[pCode];
                if (!existingLinks.Any(x => x.RoleId == rId && x.PermissionId == pId))
                {
                    dbContext.RolePermissions.Add(RolePermission.Create(rId, pId));
                }
            }
        }

        Link(Role.SystemAdminCode, permMap.Keys.ToArray());
        Link(Role.ProjectDirectorCode, "org.read", "projects.read", "projects.create", "projects.manage", "projects.access.manage", "files.read", "files.write");
        Link(Role.CommercialManagerCode, "org.read", "projects.read", "files.read", "files.write");
        Link(Role.FinanceOfficerCode, "org.read", "projects.read", "files.read", "files.write");
        Link(Role.SiteEngineerCode, "org.read", "projects.read", "files.read", "files.write");
        Link(Role.LegalOfficerCode, "org.read", "projects.read", "files.read", "files.write");
        Link(Role.ViewerCode, "org.read", "projects.read", "files.read");

        await dbContext.SaveChangesAsync(ct);
    }
}
