# Prologue - Simple Project Management

A lightweight, customizable project management tool with a beautiful kanban board interface. Perfect for freelancers, small teams, or client projects.

## ✨ Features

- **🎯 Simple Kanban Board**: Three-column workflow (To Do, Working, Done)
- **✏️ Rich Text Editor**: WYSIWYG editor for detailed task descriptions
- **🖱️ Drag & Drop**: Intuitive task management with position persistence
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **🎨 Modern UI**: Clean interface inspired by shadcn/ui design system
- **⚡ Fast & Lightweight**: SQLite database, no complex setup required
- **🏷️ Client Branding**: Customize the app title for your clients
- **🔒 No Authentication**: Single-user focused, perfect for individual projects

## 🚀 Quick Start

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/prologue-project-management.git
   cd prologue-project-management
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure (Optional)**:
   ```bash
   cp .env.example .env
   # Edit .env to customize CLIENT_NAME
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Open your browser**:
   ```
   http://localhost:3000
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Client/Project Name (appears in the app header and browser title)
CLIENT_NAME=Your Client Name

# Server Port (default: 3000)
PORT=3000
```

### Examples

```env
CLIENT_NAME=Acme Corporation
CLIENT_NAME=John's Coffee Shop
CLIENT_NAME=Design Project 2024
```

## 💻 Development

For development with automatic server restart:
```bash
npm run dev
```

## 📁 Project Structure

```
prologue-project-management/
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── server.js             # Express server and API
├── tasks.db              # SQLite database (auto-created)
├── public/
│   ├── index.html        # Main application
│   └── app.js            # Frontend JavaScript
└── README.md
```

## 🔌 API Reference

### Configuration
- `GET /api/config` - Get client configuration

### Tasks
- `GET /api/tasks` - Get all tasks (ordered by status and position)
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id` - Update task details
- `PATCH /api/tasks/:id/status` - Update task status and position
- `PATCH /api/tasks/reorder` - Bulk update task positions
- `DELETE /api/tasks/:id` - Delete a task

## 🎯 Usage Guide

### Creating Tasks
1. Click the **"Add Task"** button
2. Enter a title and optional rich-text description
3. Use the formatting toolbar for **bold**, *italic*, lists, etc.
4. Click **"Add Task"** to save

### Managing Tasks
- **📋 View Details**: Click on any task to see full details
- **✏️ Edit**: Click the edit icon or use "Edit Task" in detail view
- **🗑️ Delete**: Click the delete icon or use "Delete Task" in detail view
- **➡️ Move**: Drag and drop tasks between columns or reorder within columns

### Task Status Flow
```
📝 To Do → 🔄 Working → ✅ Done
```

## 🛠️ Technical Details

### Database Schema
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tech Stack
- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **UI Framework**: Tailwind CSS
- **Drag & Drop**: SortableJS
- **Rich Text**: Custom WYSIWYG implementation

## 🎨 Customization

### Branding
- Set `CLIENT_NAME` environment variable to customize the app title
- Modify colors in the Tailwind configuration within `index.html`
- Update the favicon by replacing `public/favicon.ico` (if you add one)

### Styling
The app uses a shadcn/ui inspired design system with CSS custom properties for easy theming.

## 🚀 Deployment

### Railway/Render/Heroku
1. Connect your GitHub repository
2. Set `CLIENT_NAME` environment variable
3. Deploy!

### VPS/Self-hosted
1. Clone repository on your server
2. Set up environment variables
3. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name prologue
   pm2 startup
   pm2 save
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspired by [shadcn/ui](https://ui.shadcn.com/)
- Drag and drop powered by [SortableJS](https://sortablejs.github.io/Sortable/)
- Icons from [Heroicons](https://heroicons.com/)

---

**Perfect for**: Freelancers, consultants, small teams, client projects, personal task management

**Keywords**: kanban, project management, task management, drag and drop, client branding, simple, lightweight 