export default function TaskList({ tasks, loading, onToggle, onDelete }) {
    if (loading) {
        return (
            <div className="card">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="card text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">No tasks yet</h3>
                <p className="text-slate-500">Add your first task to get started!</p>
            </div>
        );
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'border-red-500 bg-red-500/10';
            case 'medium': return 'border-yellow-500 bg-yellow-500/10';
            case 'low': return 'border-green-500 bg-green-500/10';
            default: return 'border-slate-500 bg-slate-500/10';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">📋</span>
                Task List
            </h2>

            {tasks.map((task, index) => (
                <div
                    key={task.id}
                    className={`card hover:scale-[1.02] transition-all duration-300 border-l-4 ${getPriorityColor(task.priority)} animate-slide-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <button
                                onClick={() => onToggle(task.id)}
                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed
                                        ? 'bg-primary-500 border-primary-500'
                                        : 'border-slate-600 hover:border-primary-500'
                                    }`}
                            >
                                {task.completed && <span className="text-white text-sm">✓</span>}
                            </button>

                            <div className="flex-1">
                                <h3 className={`text-lg font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-white'
                                    }`}>
                                    {task.title}
                                </h3>

                                <div className="flex items-center gap-3 mt-2 text-sm">
                                    <span className="text-slate-400">
                                        {getPriorityIcon(task.priority)} {task.priority}
                                    </span>
                                    {task.instance && (
                                        <span className="text-slate-500 text-xs">
                                            Pod: {task.instance.substring(0, 8)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => onDelete(task.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-lg transition-all"
                            title="Delete task"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
