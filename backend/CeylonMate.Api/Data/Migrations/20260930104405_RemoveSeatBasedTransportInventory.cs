using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations;

public partial class RemoveSeatBasedTransportInventory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameColumn(
            name: "PricePerSeat",
            table: "transport_slots",
            newName: "DailyRate");

        migrationBuilder.DropColumn(
            name: "AvailableSeats",
            table: "transport_slots");

        migrationBuilder.DropColumn(
            name: "TotalSeats",
            table: "transport_slots");

        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS public.transport_seat_holds;
            ALTER TABLE IF EXISTS public.transport_slots DROP COLUMN IF EXISTS "BookedSeats";
            ALTER TABLE IF EXISTS public.transport_slots DROP COLUMN IF EXISTS "HeldSeats";
            ALTER TABLE IF EXISTS public.transport_slots DROP COLUMN IF EXISTS "RatePerSeatLkr";
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameColumn(
            name: "DailyRate",
            table: "transport_slots",
            newName: "PricePerSeat");

        migrationBuilder.AddColumn<int>(
            name: "AvailableSeats",
            table: "transport_slots",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "TotalSeats",
            table: "transport_slots",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.Sql("""
            ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS "BookedSeats" integer NOT NULL DEFAULT 0;
            ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS "HeldSeats" integer NOT NULL DEFAULT 0;
            ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS "RatePerSeatLkr" numeric(18,2) NULL;
            """);
    }
}
