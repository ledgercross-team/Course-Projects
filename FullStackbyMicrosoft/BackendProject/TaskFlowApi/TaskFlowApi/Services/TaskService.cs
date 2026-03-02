using TaskFlowApi.Models;

namespace TaskFlowApi.Services;

public class TaskService : ITaskService
{
    private readonly List<TaskItem> _tasks = new();
    private int _nextId = 1;
    private readonly ILogger<TaskService> _logger;

    public TaskService(ILogger<TaskService> logger)
    {
        _logger = logger;
    }

    public IEnumerable<TaskItem> GetAllTasks() => _tasks;

    public TaskItem? GetTaskById(int id) => _tasks.FirstOrDefault(t => t.Id == id);

    public TaskItem CreateTask(TaskItem task)
    {
        task.Id = _nextId++;
        _tasks.Add(task);
        _logger.LogInformation("Created new task with ID: {Id}", task.Id);
        return task;
    }

    public bool UpdateTask(int id, TaskItem updatedTask)
    {
        var existingTask = GetTaskById(id);
        if (existingTask == null) return false;

        existingTask.Title = updatedTask.Title;
        existingTask.IsCompleted = updatedTask.IsCompleted;
        return true;
    }

    public bool DeleteTask(int id)
    {
        var task = GetTaskById(id);
        if (task == null)
        {
            _logger.LogWarning("Attempted to delete non-existent task ID: {Id}", id);
            return false;
        }

        _tasks.Remove(task);
        return true;
    }
}