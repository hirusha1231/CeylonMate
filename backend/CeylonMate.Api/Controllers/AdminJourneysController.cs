using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeylonMate.Api.Controllers;

[ApiController]
[Route("api/admin/signature-journeys")]
[Authorize(Roles = "TRAVEL_AGENT,ADMIN")]
public class AdminJourneysController : AgentJourneysController
{
    public AdminJourneysController(CeylonMate.Api.Data.CeylonMateDbContext db) : base(db)
    {
    }
}
