using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace cash.Migrations
{
    /// <inheritdoc />
    public partial class AdddayTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Meeting",
                columns: table => new
                {
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    team_ids = table.Column<int>(type: "integer", nullable: false),
                    result = table.Column<short>(type: "smallint", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Meeting", x => x.date);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Meeting");
        }
    }
}
