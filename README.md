# Task Management App

A full-stack task management platform with Kanban boards, role-based access control, real-time updates, and threaded comments — built with React + Express + Supabase.

---

## Tech Stack

| Layer     | Tech                                              |
|-----------|---------------------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, React Query, Zustand |
| Drag-Drop | @dnd-kit/core + @dnd-kit/sortable                 |
| Animations| GSAP                                              |
| Backend   | Node.js, Express 5                                |
| Database  | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Auth      | Supabase Auth (JWT)                               |

---

## Roles & Permissions

| Action               | Member | Manager | Admin |
|----------------------|--------|---------|-------|
| View tasks           | ✅     | ✅      | ✅    |
| Create / edit tasks  | ✅     | ✅      | ✅    |
| Delete any task      | ❌     | ✅      | ✅    |
| Manage projects      | ❌     | ✅      | ✅    |
| Manage users / roles | ❌     | ❌      | ✅    |

---

## Quick Start

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**, paste the contents of `database_schema.sql` and run it
3. Enable **Realtime** on the `tasks` and `notifications` tables

### 2. Backend

```bash
cd server
cp .env.example .env          # fill in your Supabase keys
npm install
npm run dev                   # starts on http://localhost:4000
```

Required `.env` values:

```
PORT=4000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=any_random_secret
CLIENT_URL=http://localhost:5173
```

### 3. Frontend

```bash
cd client
cp .env.example .env          # fill in your Supabase keys
npm install
npm run dev                   # starts on http://localhost:5173
```

Required `.env` values:

```
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Project Structure

```
Task-management/
├── database_schema.sql        ← Run in Supabase SQL Editor
├── server/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── config/            ← supabase.js, logger.js
│       ├── middleware/        ← auth.middleware.js, error.middleware.js
│       └── modules/
│           ├── auth/
│           ├── tasks/
│           ├── projects/
│           ├── users/
│           ├── comments/
│           └── notifications/
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx            ← Router + guards
        ├── main.jsx
        ├── index.css
        ├── api/               ← React Query hooks (per resource)
        ├── components/
        │   ├── layout/        ← AppLayout, Sidebar, Topbar, AuthLayout
        │   ├── tasks/         ← KanbanBoard, TaskCard, TaskModal, TaskFilters, CommentThread
        │   └── ui/            ← Button, Input, Modal, Badge, Avatar, Spinner
        ├── hooks/
        │   ├── useRealtime.js ← Supabase realtime subscriptions
        │   └── useFilters.js  ← URL-synced filter state
        ├── lib/               ← axios.js, supabase.js, utils.js, animations.js
        ├── pages/             ← All page components
        └── store/             ← Zustand: authStore, uiStore
```

---

## Features

- **Kanban Board** — Drag & drop tasks across 5 columns with optimistic updates
- **Task CRUD** — Create, edit, archive, reopen, delete with full form validation
- **Threaded Comments** — Nested replies, delete your own comments
- **Real-time Updates** — Supabase realtime invalidates React Query caches automatically
- **Filters** — Search + filter by status, priority, project, assignee, overdue; synced to URL
- **Role-based Access** — Admin / Manager / Member guards on both frontend routes and API middleware
- **Dark Mode** — Class-based, persisted in Zustand store
- **Notifications** — Polling every 30 s, mark as read
- **Admin Panel** — View all users, change roles, delete accounts
