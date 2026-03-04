# Customer Accounts Microservice

[![CI Build](https://github.com/Jaima01/Customer-account-microservice/actions/workflows/ci-build.yaml/badge.svg)](https://github.com/Jaima01/Customer-account-microservice/actions)

## Overview

A RESTful microservice for managing customer accounts, built with Python Flask. This service supports full CRUD operations (Create, Read, Update, Delete, and List) for customer accounts.

## Features

- **Create** a new customer account
- **Read** a customer account by ID
- **List** all customer accounts
- **Update** an existing customer account
- **Delete** a customer account
- **Security**: Talisman security headers and CORS policies
- **CI/CD**: Automated builds and testing with GitHub Actions
- **Containerization**: Dockerized application
- **Deployment**: Kubernetes deployment configuration

## Technology Stack

- **Language**: Python 3.11
- **Framework**: Flask 2.3
- **Database**: PostgreSQL / SQLite (development)
- **Testing**: Nose, Coverage, Pylint, Flake8
- **CI/CD**: GitHub Actions, Tekton Pipelines
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## API Endpoints

| Method   | Endpoint              | Description                 |
|----------|-----------------------|-----------------------------|
| `GET`    | `/`                   | Service root information    |
| `GET`    | `/health`             | Health check                |
| `POST`   | `/accounts`           | Create a new account        |
| `GET`    | `/accounts`           | List all accounts           |
| `GET`    | `/accounts/<id>`      | Read an account by ID       |
| `PUT`    | `/accounts/<id>`      | Update an account           |
| `DELETE` | `/accounts/<id>`      | Delete an account           |

## Setup & Installation

```bash
# Clone the repository
git clone https://github.com/Jaima01/Customer-account-microservice.git
cd Customer-account-microservice

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run the service
python wsgi.py
```

## Running Tests

```bash
nosetests
```

## Docker

```bash
# Build the image
docker build -t accounts-service:1.0 .

# Run the container
docker run -d -p 8080:8080 accounts-service:1.0
```

## Kubernetes Deployment

```bash
kubectl apply -f k8s/
```

## License

Licensed under the Apache License 2.0.