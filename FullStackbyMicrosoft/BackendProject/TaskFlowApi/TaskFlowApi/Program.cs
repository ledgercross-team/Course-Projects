using TaskFlowApi.Middlewares;
using TaskFlowApi.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Dependency Injection Registration
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// We use AddSingleton because we are using an in-memory list. 
// If using a real database, this would be AddScoped.
builder.Services.AddSingleton<ITaskService, TaskService>();

var app = builder.Build();

// 2. Built-in Middleware Pipeline & OpenAPI
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "TaskFlow API v1");
    });
}

// This tells the app to serve index.html as the default root page
app.UseDefaultFiles();

// This enables the app to serve static files (HTML, CSS, JS) from a wwwroot folder
app.UseStaticFiles();

app.UseHttpsRedirection();
// ... rest of your code

app.UseHttpsRedirection();

// 3. Register Custom Middleware
app.UseMiddleware<RequestTimingMiddleware>();

app.UseAuthorization();

// 4. Map the API Endpoints
app.MapControllers();

app.Run();