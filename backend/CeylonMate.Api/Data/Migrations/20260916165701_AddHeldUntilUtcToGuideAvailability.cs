using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations;

/// <summary>Adds hold-expiry columns to existing capacity tables.</summary>
public partial class AddHeldUntilUtcToGuideAvailability : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            ALTER TABLE IF EXISTS public.guide_availabilities ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
            ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
            ALTER TABLE IF EXISTS public.attraction_slots ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "HeldUntilUtc", table: "guide_availabilities");
        migrationBuilder.DropColumn(name: "HeldUntilUtc", table: "transport_slots");
        migrationBuilder.DropColumn(name: "HeldUntilUtc", table: "attraction_slots");
    }
}

