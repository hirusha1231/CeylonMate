using System;
using System.Collections.Generic;

namespace CeylonMate.Api.Models;

public class SignatureJourney
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string HeroImageUrl { get; set; } = string.Empty;
    public List<string> GalleryImages { get; set; } = new();
    public int DurationDays { get; set; }
    public int DurationNights { get; set; }
    public decimal StartingPriceUsd { get; set; }
    public decimal StartingPriceLkr { get; set; }
    public string DestinationsCovered { get; set; } = string.Empty;
    public List<string> Highlights { get; set; } = new();
    public bool IsPublished { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
