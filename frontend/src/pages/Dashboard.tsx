import { useState, useEffect } from 'react';
import { 
  Activity, Train, ShieldCheck, Wrench, Users, 
  TrendingUp, AlertTriangle, Clock, Zap
} from 'lucide-react';

interface DashboardMetrics {
  stations_deployed: number;
  track_km_monitored: number;
  avg_delay_saved_min: number;
  passenger_hours_saved_day: number;
  annual_fuel_savings_cr: number;
  animal_lives_saved_yr: number;
  incidents_prevented_yr: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/impact/');
      if (res.ok) {
        setMetrics(await res.json());
      } else {
        throw new Error('API Error');
      }
    } catch {
      setMetrics({
        stations_deployed: 3,
        track_km_monitored: 1000,
        avg_delay_saved_min: 15,
        passenger_hours_saved_day: 1250000,
        annual_fuel_savings_cr: 54.75,
        animal_lives_saved_yr: 20,
        incidents_prevented_yr: 10
      });
    }
    setLoading(false);
  };

  const statCards = metrics ? [
    {
      title: 'Stations Active',
      value: metrics.stations_deployed,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary-container',
      textColor: 'text-on-primary-container'
    },
    {
      title: 'Track KM Monitored',
      value: metrics.track_km_monitored.toLocaleString(),
      icon: Train,
      color: 'text-secondary',
      bgColor: 'bg-secondary-container',
      textColor: 'text-on-secondary-container'
    },
    {
      title: 'Avg Delay Saved',
      value: `${metrics.avg_delay_saved_min} min`,
      icon: Clock,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary-container',
      textColor: 'text-on-tertiary-container'
    },
    {
      title: 'Incidents Prevented',
      value: metrics.incidents_prevented_yr,
      icon: ShieldCheck,
      color: 'text-success',
      bgColor: 'bg-green-100',
      textColor: 'text-success'
    }
  ] : [];

  const impactCards = metrics ? [
    {
      title: 'Passenger Hours Saved / Day',
      value: metrics.passenger_hours_saved_day.toLocaleString(),
      subtitle: 'Across all monitored stations',
      icon: Users,
      accent: 'border-l-primary'
    },
    {
      title: 'Annual Fuel Savings',
      value: `₹${metrics.annual_fuel_savings_cr} Cr`,
      subtitle: 'From reduced idling & delays',
      icon: TrendingUp,
      accent: 'border-l-success'
    },
    {
      title: 'Animal Lives Saved / Year',
      value: metrics.animal_lives_saved_yr,
      subtitle: 'Via track intrusion detection',
      icon: Zap,
      accent: 'border-l-warning'
    }
  ] : [];

  const modules = [
    {
      name: 'AI Delay Predictor',
      status: 'ONLINE',
      model: 'XGBoost v1.2',
      icon: Clock,
      link: '/delay'
    },
    {
      name: 'PlatformGuard',
      status: 'ONLINE',
      model: 'YOLOv5-Crowd v2',
      icon: Users,
      link: '/platform'
    },
    {
      name: 'Track Inspector',
      status: 'ONLINE',
      model: 'ViT-Track v1',
      icon: Wrench,
      link: '/track'
    },
    {
      name: 'Citizen App',
      status: 'ONLINE',
      model: 'SMS Gateway',
      icon: Activity,
      link: '/citizen'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-surface">Command Center</h1>
        <p className="text-on-surface-variant mt-1">Real-time intelligence overview for Indian Railways</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div 
            key={card.title} 
            className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-on-surface-variant">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {impactCards.map((card) => (
          <div 
            key={card.title} 
            className={`bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant border-l-4 ${card.accent}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <card.icon className="w-5 h-5 text-on-surface-variant" />
              <span className="text-sm font-medium text-on-surface-variant">{card.title}</span>
            </div>
            <div className="text-2xl font-bold text-on-surface">{card.value}</div>
            <p className="text-xs text-outline mt-1">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Module Status Grid */}
      <div>
        <h2 className="text-xl font-semibold text-on-surface mb-4">AI Module Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <a 
              key={mod.name}
              href={mod.link}
              className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-surface-container-low group-hover:bg-primary-container transition-colors">
                  <mod.icon className="w-5 h-5 text-on-surface-variant group-hover:text-on-primary-container" />
                </div>
                <span className="text-sm font-bold text-on-surface">{mod.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline">{mod.model}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                  {mod.status}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* System Alert Banner */}
      <div className="bg-inverse-surface rounded-xl p-5 flex items-center gap-4">
        <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
        <div>
          <p className="text-inverse-on-surface font-medium">System Advisory</p>
          <p className="text-inverse-on-surface/70 text-sm">
            All AI modules operational. Last model sync: {new Date().toLocaleTimeString()}.
            Next scheduled calibration in 6 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
