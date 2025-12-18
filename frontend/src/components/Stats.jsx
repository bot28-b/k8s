export default function Stats({ tasks }) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && !t.completed).length;

    const stats = [
        {
            label: 'Total Tasks',
            value: totalTasks,
            icon: '📋',
            color: 'from-blue-500 to-blue-600'
        },
        {
            label: 'Completed',
            value: completedTasks,
            icon: '✅',
            color: 'from-green-500 to-green-600'
        },
        {
            label: 'High Priority',
            value: highPriorityTasks,
            icon: '🔥',
            color: 'from-red-500 to-red-600'
        }
    ];

    return (
        <>
            {stats.map((stat, index) => (
                <div
                    key={stat.label}
                    className="card hover:scale-105 transition-transform duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                        </div>
                        <div className={`text-4xl bg-gradient-to-br ${stat.color} w-16 h-16 rounded-xl flex items-center justify-center shadow-lg`}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
