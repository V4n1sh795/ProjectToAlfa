using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace cash.Migrations
{
    /// <inheritdoc />
    public partial class AddCuratorTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Meeting_team_team_id",
                table: "Meeting");

            migrationBuilder.DropIndex(
                name: "IX_Meeting_team_id",
                table: "Meeting");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "Meeting");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "Meeting");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "Meeting",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "Meeting",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Meeting_team_id",
                table: "Meeting",
                column: "team_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Meeting_team_team_id",
                table: "Meeting",
                column: "team_id",
                principalTable: "team",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
