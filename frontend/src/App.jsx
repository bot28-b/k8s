import { useState, useEffect } from 'react';
import axios from 'axios';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import Header from './components/Header';
import Stats from './components/Stats';

// Get API URL from environment variable
// Use nullish coalescing (??) to allow empty string (for relative paths in Docker/K8s)
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function App() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiInfo, setApiInfo] = useState(null);

    // Fetch tasks from backend
    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/tasks`);
            setTasks(response.data.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch tasks. Is the backend running?');
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch API info
    const fetchApiInfo = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/info`);
            setApiInfo(response.data);
        } catch (err) {
            console.error('Error fetching API info:', err);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchApiInfo();
    }, []);

    // Add new task
    const addTask = async (title, priority) => {
        try {
            const response = await axios.post(`${API_URL}/api/tasks`, { title, priority });
            setTasks([...tasks, response.data.data]);
        } catch (err) {
            setError('Failed to add task');
            console.error('Error adding task:', err);
        }
    };

    // Toggle task completion
    const toggleTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        try {
            const response = await axios.put(`${API_URL}/api/tasks/${id}`, {
                ...task,
                completed: !task.completed
            });
            setTasks(tasks.map(t => t.id === id ? response.data.data : t));
        } catch (err) {
            setError('Failed to update task');
            console.error('Error updating task:', err);
        }
    };

    // Delete task
    const deleteTask = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/tasks/${id}`);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) {
            setError('Failed to delete task');
            console.error('Error deleting task:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <Header apiInfo={apiInfo} />

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 animate-fade-in">
                        ⚠️ {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <Stats tasks={tasks} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <TaskList
                            tasks={tasks}
                            loading={loading}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                        />
                    </div>

                    <div>
                        <TaskForm onAdd={addTask} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
