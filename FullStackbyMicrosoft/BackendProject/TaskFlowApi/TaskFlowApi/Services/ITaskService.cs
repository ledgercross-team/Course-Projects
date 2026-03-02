using TaskFlowApi.Models;

namespace TaskFlowApi.Services;

public interface ITaskService
{
    IEnumerable<TaskItem> GetAllTasks();
    TaskItem? GetTaskById(int id);
    TaskItem CreateTask(TaskItem task);
    bool UpdateTask(int id, TaskItem updatedTask);
    bool DeleteTask(int id);
}