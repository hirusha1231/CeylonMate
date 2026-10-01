using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.DTOs;

public class CreateSignatureJourneyDto
{
    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Tagline { get; set; }

    public string? Description { get; set; }

    [Required]
    public string HeroImageUrl { get; set; } = string.Empty;

    public List<string>? GalleryImages { get; set; }

    public int? DurationDays { get; set; }

    public int? DurationNights { get; set; }

    [Range(0, 1000000)]
    public decimal StartingPriceUsd { get; set; }

    [Range(0, 1000000000)]
    public decimal StartingPriceLkr { get; set; }

    public string? DestinationsCovered { get; set; }

    public List<string>? Highlights { get; set; }

    public bool IsPublished { get; set; } = true;
}

public class UpdateSignatureJourneyDto : CreateSignatureJourneyDto
{
}
