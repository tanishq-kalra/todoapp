# Todo SaaS

A modern, full-stack todo application built with React and FastAPI.

## Features

- User authentication (register/login/logout)
- Task management with drag-and-drop reordering
- Subtasks support
- Categories for task organization
- Priority levels (high, medium, low)
- Due dates
- Light/dark theme toggle
- Responsive design
- Real-time statistics

## Tech Stack

### Backend
- FastAPI
- MongoDB with Motor
- JWT authentication
- bcrypt for password hashing

### Frontend
- React 18
- React Router
- Tailwind CSS
- Shadcn/ui components
- Axios for API calls
- @hello-pangea/dnd for drag-and-drop

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.8+
- MongoDB

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Update the `.env` file with your MongoDB connection string and other settings.

4. Start the backend server:
   ```bash
   uvicorn server:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the backend URL in the frontend code if necessary (default: http://localhost:8000).

4. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token

### Tasks
- `GET /api/tasks` - Get all tasks for current user
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/{task_id}` - Update a task
- `DELETE /api/tasks/{task_id}` - Delete a task
- `POST /api/tasks/{task_id}/reorder` - Reorder tasks

### Subtasks
- `POST /api/tasks/{task_id}/subtasks` - Create a subtask
- `PUT /api/tasks/{task_id}/subtasks/{subtask_id}` - Update a subtask
- `DELETE /api/tasks/{task_id}/subtasks/{subtask_id}` - Delete a subtask

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a category
- `DELETE /api/categories/{category_id}` - Delete a category

### Statistics
- `GET /api/stats` - Get user statistics

## Environment Variables

### Backend (.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `CORS_ORIGINS` - Allowed CORS origins
- `JWT_SECRET` - JWT secret key
- `ADMIN_EMAIL` - Admin email for initial setup
- `ADMIN_PASSWORD` - Admin password

### Frontend
- `REACT_APP_BACKEND_URL` - Backend API URL (default: http://localhost:8000)

## Project Structure

```
todo-saas/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── lib/
│   └── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.