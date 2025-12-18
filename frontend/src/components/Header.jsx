export default function Header({ apiInfo }) {
    return (
        <div className="mb-8 animate-fade-in">
            <div className="text-center mb-6">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600 mb-2">
                    ☸️ Kubernetes Task Manager
                </h1>
                <p className="text-slate-400 text-lg">
                    Production-Ready Cloud-Native Application
                </p>
            </div>

            {apiInfo && (
                <div className="card">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-slate-400 text-sm">Service</p>
                            <p className="text-white font-semibold">{apiInfo.service}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Version</p>
                            <p className="text-primary-400 font-semibold">{apiInfo.version}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Environment</p>
                            <p className="text-green-400 font-semibold">{apiInfo.environment}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Instance</p>
                            <p className="text-purple-400 font-semibold text-xs">{apiInfo.instance}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
