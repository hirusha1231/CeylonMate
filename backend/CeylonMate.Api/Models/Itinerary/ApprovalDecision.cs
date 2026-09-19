namespace CeylonMate.Api.Models.Itinerary;

public class ApprovalDecision
{
    public int Id { get; set; }
    public int WorkflowId { get; set; }
    public int TravelAgentId { get; set; }
    public string Decision { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime DecidedAt { get; set; } = DateTime.UtcNow;
}