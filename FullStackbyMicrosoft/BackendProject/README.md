# TaskFlow API 🚀

A foundational RESTful backend built with **.NET 10** and **ASP.NET Core**. This project serves as a robust headless API for a task management system, demonstrating core backend engineering principles and clean architecture.

## 📖 Overview

TaskFlow API was developed to implement industry-standard backend patterns. It provides a complete set of CRUD operations to manage task lifecycles, utilizing an in-memory data store for rapid testing and iteration. 

This architecture is designed to be completely decoupled from the frontend, making it the perfect foundation for future integrations with modern client-side frameworks like Blazor.

## ⚙️ Core Concepts Implemented

This repository showcases the implementation of the following foundational engineering concepts:
* **RESTful Architecture:** Clean API endpoints using Attribute Routing.
* **Dependency Injection (DI):** Decoupled business logic utilizing `ITaskService`.
* **Data Serialization:** Seamless JSON serialization and deserialization using standard .NET libraries.
* **Middleware Pipeline:** * Implementation of built-in middleware for routing and authorization.
  * Custom `RequestTimingMiddleware` to log the execution time of incoming HTTP requests.
* **Error Handling & Logging:** Implementation of `ILogger` to track critical application events and gracefully handle missing resources (e.g., returning `404 Not Found`).
* **Security & Validation:** Data annotations ensuring structural integrity and preventing malformed requests.
* **OpenAPI Integration:** Auto-generated interactive documentation using Swagger UI.

## 🛠️ Tech Stack

* **Framework:** .NET 10.0
* **Web API:** ASP.NET Core
* **Language:** C# 14
* **Documentation:** Swashbuckle.AspNetCore (Swagger)

## 🚦 Getting Started

Follow these steps to run the API locally on your machine.

### Prerequisites
* [.NET 10 SDK](https://dotnet.microsoft.com/download)
* Visual Studio 2026 (or your preferred IDE)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/jabir02/TaskFlowApi.git](https://github.com/jabir02/TaskFlowApi.git)
   cd TaskFlowApi

2. **Restore dependencies:**
   ```bash
   dotnet restore
3. **Run the application:**
   ```bash
   dotnet run
3. **View the Documentation:**
   Open your browser and navigate to https://localhost:<port>/swagger to interact with the API endpoints.

| HTTP Method | Endpoint          | Description                                            |
| :---------- | :---------------- | :----------------------------------------------------- |
| `GET`       | `/api/tasks`      | Retrieves a list of all tasks.                         |
| `GET`       | `/api/tasks/{id}` | Retrieves a specific task by its ID.                   |
| `POST`      | `/api/tasks`      | Creates a new task. Requires a JSON payload.           |
| `PUT`       | `/api/tasks/{id}` | Updates an existing task's title or completion status. |
| `DELETE`    | `/api/tasks/{id}` | Deletes a task from the system.                        |
