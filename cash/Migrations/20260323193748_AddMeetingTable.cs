using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace cash.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Meeting",
                table: "Meeting");

            migrationBuilder.RenameColumn(
                name: "Time",
                table: "Meeting",
                newName: "time");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Meeting",
                newName: "status");

            migrationBuilder.RenameColumn(
                name: "team_ids",
                table: "Meeting",
                newName: "team_id");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "Meeting",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<int>(
                name: "id",
                table: "Meeting",
                type: "integer",
                nullable: false,
                defaultValue: 0)
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "Meeting",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<List<int>>(
                name: "tasks",
                table: "Meeting",
                type: "integer[]",
                nullable: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "Meeting",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Meeting",
                table: "Meeting",
                column: "id");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Meeting_team_team_id",
                table: "Meeting");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Meeting",
                table: "Meeting");

            migrationBuilder.DropIndex(
                name: "IX_Meeting_team_id",
                table: "Meeting");

            migrationBuilder.DropColumn(
                name: "id",
                table: "Meeting");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "Meeting");

            migrationBuilder.DropColumn(
                name: "tasks",
                table: "Meeting");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "Meeting");

            migrationBuilder.RenameColumn(
                name: "time",
                table: "Meeting",
                newName: "Time");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "Meeting",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "team_id",
                table: "Meeting",
                newName: "team_ids");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Meeting",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Meeting",
                table: "Meeting",
                column: "date");
        }
    }
}
