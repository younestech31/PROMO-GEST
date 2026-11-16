using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PromoGest.Contracts.Reference;
using PromoGest.Domain.Reference;

namespace PromoGest.Api.Controllers;

[ApiController]
[Route("api/reference")]
public sealed class AdministrativeReferenceController : ControllerBase
{
    [HttpGet("administrative-units")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true)]
    public ActionResult<AdministrativeUnitsReferenceDto> GetAdministrativeUnits()
    {
        var wilayas = AlgerianAdministrativeReference.Wilayas
            .Select(wilaya => new AdministrativeWilayaDto(
                wilaya.Code,
                wilaya.NameAr,
                wilaya.NameFr,
                wilaya.CanonicalDisplayName))
            .ToList();

        return Ok(new AdministrativeUnitsReferenceDto(
            AlgerianAdministrativeReference.DatasetVersion,
            AlgerianAdministrativeReference.EffectiveDate,
            AlgerianAdministrativeReference.LegalSource,
            AlgerianAdministrativeReference.CommuneDatasetStatus,
            AlgerianAdministrativeReference.CommuneLegalBaselineCount,
            AlgerianAdministrativeReference.CommunesCount,
            wilayas));
    }
}
