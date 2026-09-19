using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations;

/// <summary>Adds hold-expiry columns to existing capacity tables.</summary>
public partial class AddHeldUntilUtcToGuideAvailability : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "HeldUntilUtc", table: "guide_availabilities",
            type: "timestamp with time zone", nullable: true);
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "HeldUntilUtc", table: "transport_slots",
            type: "timestamp with time zone", nullable: true);
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "HeldUntilUtc", table: "attraction_slots",
            type: "timestamp with time zone", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "HeldUntilUtc", table: "guide_availabilities");
        migrationBuilder.DropColumn(name: "HeldUntilUtc", table: "transport_slots");
        migrationBuilder.DropColumn(name: "HeldUntilUtc", table: "attraction_slots");
    }
}
