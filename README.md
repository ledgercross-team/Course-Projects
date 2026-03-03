# 🍋 Little Lemon Restaurant Booking API

This project implements a **table booking system** and **menu API** for the Little Lemon restaurant using **Django** and **Django REST Framework**, connected to a **MySQL** database.

---

## 🚀 Setup Instructions

1. **Install dependencies:**
   ```bash
   pip install django djangorestframework djoser mysqlclient
   ```

2. **Create a MySQL database** called `reservations`

3. **Run migrations:**
   ```bash
   python manage.py makemigrations && python manage.py migrate
   ```

4. **Create a superuser:**
   ```bash
   python manage.py createsuperuser
   ```

5. **Run the server:**
   ```bash
   python manage.py runserver
   ```

---

## 📡 API Paths for Testing (Insomnia / Postman)

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/users/` | Register a new user |
| `POST` | `/auth/token/login/` | Login and obtain auth token |
| `POST` | `/auth/token/logout/` | Logout (destroy token) |
| `GET` | `/auth/users/me/` | Get current user info |

### 📅 Table Booking API *(requires authentication)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/restaurant/booking/tables/` | List all bookings |
| `POST` | `/restaurant/booking/tables/` | Create a new booking |
| `GET` | `/restaurant/booking/tables/{id}/` | Retrieve a specific booking |
| `PUT` | `/restaurant/booking/tables/{id}/` | Update a specific booking |
| `PATCH` | `/restaurant/booking/tables/{id}/` | Partially update a booking |
| `DELETE` | `/restaurant/booking/tables/{id}/` | Delete a booking |

### 🍽️ Menu API *(requires authentication)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/restaurant/menu/` | List all menu items |
| `POST` | `/restaurant/menu/` | Add a new menu item |
| `GET` | `/restaurant/menu/{id}` | Retrieve a specific menu item |
| `PUT` | `/restaurant/menu/{id}` | Update a specific menu item |

### 🌐 Static HTML Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Home page |
| `GET` | `/about/` | About page |
| `GET` | `/book/` | Booking form page |
| `GET` | `/menu/` | Menu page |
| `GET` | `/bookings/` | All reservations page |

---

## 🔑 Authentication Notes

- To access the API endpoints, you need to first **register a user** and **obtain a token**.
- Include the token in the request header as:
  ```
  Authorization: Token <your-token-here>
  ```

---

## 📝 Example: Creating a Booking via API (Insomnia)

**Step 1** — Register a user:
```http
POST /auth/users/
Content-Type: application/json

{
  "username": "testuser",
  "password": "testpass123!",
  "email": "test@test.com"
}
```

**Step 2** — Login to get a token:
```http
POST /auth/token/login/
Content-Type: application/json

{
  "username": "testuser",
  "password": "testpass123!"
}
```

**Step 3** — Copy the token from the response.

**Step 4** — Create a booking:
```http
POST /restaurant/booking/tables/
Authorization: Token <token>
Content-Type: application/json

{
  "first_name": "Jane",
  "reservation_date": "2024-06-15",
  "reservation_slot": 11
}
```
