<div align="center">
  <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=200" alt="LedgerTurf Logo" width="120" style="border-radius: 20px; margin-bottom: 20px;" />
  
  <h1>LedgerTurf</h1>
  
  <p><strong>Dhaka's Premier MERN-Stack Turf Booking Ecosystem</strong></p>

  <p>
    <a href="https://ledgerturf.vercel.app/"><img src="https://img.shields.io/badge/🔴_Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" /></a>
    <a href="https://github.com/Saji-d/ledgerturf"><img src="https://img.shields.io/badge/Source_Code-181717?style=for-the-badge&logo=github&logoColor=white" alt="Source Code" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  </p>

  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-key-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Installation</a> •
    <a href="#-architecture">Architecture</a>
  </p>
</div>

---

## 📖 Overview

LedgerTurf is a high-performance, production-ready MERN stack application tailored for the sports community in Dhaka, Bangladesh. It bridges the gap between turf owners and athletes by providing a seamless, real-time booking experience, advanced management dashboards, and intelligent discovery tools.

Built with a rigorous focus on **concurrency safety**, **spatial search capabilities**, and **modern UX design**, LedgerTurf transforms how sports venues are discovered, managed, and reserved.

---

## ✨ Key Features

LedgerTurf serves three distinct user roles with dedicated experiences:

### ⚽ For Players
* **Smart Discovery**: Advanced filtering by neighborhood (Uttara, Banani, Gulshan, etc.), sport type, and hourly rate.
* **Real-Time Booking**: Slot-based reservation management with dynamic time validation synchronized to Bangladesh Time (UTC+6).
* **Night Owl Mode**: Specialized discovery interface for venues offering late-night slots and elite floodlighting.
* **Interactive Maps**: Integrated Google Maps for precise location tracking and seamless navigation.

### 💼 For Turf Owners
* **Business Hub**: A comprehensive dashboard to manage multiple facility listings and oversee daily operations.
* **Revenue Analytics**: Real-time insights, financial breakdowns, and performance metrics based on confirmed reservations.
* **Listing Management**: Intuitive listing creation supporting high-resolution image uploads and precise map pinning.

### 🛡️ For Administrators
* **Control Panel**: Centralized moderation hub for platform-wide user and facility management.
* **Venue Approval System**: Robust review queue for new turf listings, featuring live previews and spatial verification before public visibility.

---

## 🛠️ Tech Stack

LedgerTurf utilizes a modern, decoupled architecture ensuring scalability and maintainability.

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS | High-performance SPA with utility-first styling |
| **State & UI** | Redux Toolkit, Framer Motion | Predictable state management and fluid animations |
| **Backend** | Node.js, Express.js | Scalable, serverless-ready RESTful API framework |
| **Database** | MongoDB Atlas, Mongoose | NoSQL database with advanced GeoJSON spatial indexing |
| **Security** | JWT, Bcrypt | Stateless authentication and role-based access control |
| **Deployment**| Vercel | Zero-config full-stack monorepo deployment |

---

## 🏗️ Architecture

The platform follows a highly modular, monorepo-style architecture optimized for modern cloud deployments.

* **Frontend SPA**: Communicates securely with the backend via a centralized, interceptor-equipped Axios service layer.
* **RESTful API**: Organized strictly by domain (Controllers, Models, Middleware, Routes) promoting clear separation of concerns.
* **RBAC Security**: Enforces strict Role-Based Access Control ensuring isolated data access for Players, Owners, and Admins.
* **Spatial Processing**: Leverages MongoDB's native `$geoWithin` and `$centerSphere` operators for lightning-fast location-based queries.

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **MongoDB Atlas** connection string
* **Google Maps API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Saji-d/ledgerturf.git
   cd ledgerturf
   ```

2. **Install dependencies**
   ```bash
   # Installs dependencies for both frontend and backend workspaces
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5002
   MONGO_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```

   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:5002/api
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Run the Development Servers**
   ```bash
   # From the root directory:
   npm run start-backend         # Starts the Express API
   npm run dev --prefix frontend # Starts the React frontend
   ```

---

## 📁 Folder Structure

```text
ledgerturf/
├── api/                # Vercel Serverless Function entry point
├── backend/            # Express API Environment
│   └── src/
│       ├── config/     # Database and service configurations
│       ├── controllers/# Request handlers and business logic
│       ├── middleware/ # Authentication and error handling
│       ├── models/     # Mongoose ODM schemas
│       └── routes/     # API route definitions
├── frontend/           # React SPA Environment
│   └── src/
│       ├── components/ # Reusable presentation UI atoms
│       ├── pages/      # Feature-driven view components
│       ├── services/   # Axios API communication layer
│       └── store/      # Redux Toolkit global state slices
├── vercel.json         # Unified cloud deployment configuration
└── package.json        # Root workspace configuration
```

---

## ☁️ Deployment

LedgerTurf is actively deployed and optimized for **Vercel**.

* **Live Platform:** [https://ledgerturf.vercel.app/](https://ledgerturf.vercel.app/)
* **Routing Strategy:** The `vercel.json` configuration elegantly handles `/api/*` rewrites to the Node.js serverless functions, while directing all other traffic to the React SPA frontend.

---

## 🧩 Challenges & Solutions

* **Timezone Synchronization**: Solved critical booking conflicts by enforcing absolute `UTC+6` time calculations exclusively on the backend, guaranteeing consistent availability slots regardless of the client's local timezone.
* **Booking Concurrency**: Mitigated race conditions during high-traffic reservations by implementing atomic MongoDB queries and pre-flight availability validations prior to confirming transactions.
* **Serverless SPA Routing**: Overcame deep-link 404 errors on Vercel by utilizing custom rewrite rules that effectively bridge the gap between static asset serving and dynamic API routes.

---


## 🌟 Project Highlights

- Production-ready MERN architecture optimized for scalability
- Real-time slot booking with concurrency-safe validation
- Geo-spatial venue discovery powered by MongoDB indexing
- Role-based dashboards for Players, Owners, and Admins
- Fully deployed full-stack platform on Vercel
- Modern responsive UI with smooth micro-interactions

---

## 🤝 Contribution & Feedback

Contributions, feature suggestions, and constructive feedback are always welcome.

If you found this project interesting, consider giving it a ⭐ on GitHub.

---

<div align="center">
  <p>Engineered with precision for Dhaka's vibrant sports community.</p>
</div>
