using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace cash.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectRecruitment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "isRecruitmentOpen",
                table: "Project",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "isRecruitmentOpen",
                table: "Project");
        }
    }
}
