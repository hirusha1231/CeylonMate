namespace CeylonMate.Api.Models;
using CeylonMate.Api.Trips;

public class WorkflowStep
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkflowId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public int StepOrder { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? InputJson { get; set; }
    public string? OutputJson { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation property
    public WorkflowExecution? Workflow { get; set; }
}