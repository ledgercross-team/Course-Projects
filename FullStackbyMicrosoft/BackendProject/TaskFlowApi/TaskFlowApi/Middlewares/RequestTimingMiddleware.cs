using System.Diagnostics;

namespace TaskFlowApi.Middlewares;

public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var watch = Stopwatch.StartNew();

        await _next(context); // Passes the request to the next middleware

        watch.Stop();
        _logger.LogInformation("HTTP {Method} {Path} executed in {Milliseconds} ms",
            context.Request.Method, context.Request.Path, watch.ElapsedMilliseconds);
    }
}