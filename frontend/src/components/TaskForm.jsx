import { useState } from 'react';

export default function TaskForm({ onAdd }) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (title.trim()) {
            onAdd(title, priority);
            setTitle('');
            setPriority('medium');
        }
    };

    return (
        <div className="card sticky top-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-2">➕</span>
                Add New Task
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-slate-300 mb-2 text-sm font-medium">
                        Task Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter task title..."
                        className="input-field w-full"
                        required
                    />
                </div>

                <div>
                    <label className="block text-slate-300 mb-2 text-sm font-medium">
                        Priority
                    </label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="input-field w-full cursor-pointer"
                    >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                    </select>
                </div>

                <button type="submit" className="btn-primary w-full">
                    Add Task
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">💡 K8s Features</h3>
                <ul className="text-xs text-slate-500 space-y-1">
                    <li>✓ Multi-replica deployment</li>
                    <li>✓ Auto-scaling (HPA)</li>
                    <li>✓ Health checks</li>
                    <li>✓ ConfigMaps & Secrets</li>
                    <li>✓ Ingress routing</li>
                    <li>✓ Persistent storage</li>
                </ul>
            </div>
        </div>
    );
}
