using System.ComponentModel.DataAnnotations;

namespace TaskFlowApi.Models;

public class TaskItem
{
    public int Id { get; set; }

    [Required(ErrorMessage = "A task title is required.")]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    public bool IsCompleted { get; set; }
}