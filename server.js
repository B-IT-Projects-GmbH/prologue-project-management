require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_NAME = process.env.CLIENT_NAME || 'Prologue';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./tasks.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Create tasks table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Add position column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0`, (err) => {
      // Ignore error if column already exists
    });
  }
});

// API Routes

// Get client configuration
app.get('/api/config', (req, res) => {
  res.json({
    clientName: CLIENT_NAME
  });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY status, position, created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update task positions (must come before /api/tasks/:id routes)
app.patch('/api/tasks/reorder', (req, res) => {
  const { tasks } = req.body;
  
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Tasks array is required' });
  }

  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let errors = [];
    let completed = 0;
    
    tasks.forEach((task, index) => {
      db.run(
        'UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [task.status, task.position, task.id],
        function(err) {
          if (err) {
            errors.push(err);
          }
          completed++;
          
          if (completed === tasks.length) {
            if (errors.length > 0) {
              db.run('ROLLBACK');
              res.status(500).json({ error: 'Failed to update task positions', details: errors });
            } else {
              db.run('COMMIT');
              res.json({ message: 'Task positions updated successfully' });
            }
          }
        }
      );
    });
  });
});

// Create new task
app.post('/api/tasks', (req, res) => {
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Get the highest position in todo column to add at the end
  db.get('SELECT MAX(position) as maxPos FROM tasks WHERE status = ?', ['todo'], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const position = (row.maxPos || 0) + 1;
    
    db.run(
      'INSERT INTO tasks (title, description, position) VALUES (?, ?, ?)',
      [title, description || '', position],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({
          id: this.lastID,
          title,
          description: description || '',
          status: 'todo',
          position,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    );
  });
});

// Update task status
app.patch('/api/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, position } = req.body;

  if (!['todo', 'working', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, position || 0, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json({ message: 'Task updated successfully' });
    }
  );
});

// Update task details
app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'UPDATE tasks SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, description || '', id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json({ message: 'Task updated successfully' });
    }
  );
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
}); 