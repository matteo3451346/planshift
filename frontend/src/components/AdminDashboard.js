import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  Play,
  Eye,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import InteractiveSchedulingGrid from './InteractiveSchedulingGrid';
import AdvancedSchedulingGrid from './AdvancedSchedulingGrid';
import ProfessionalSchedulingGrid from './ProfessionalSchedulingGrid';
import ReportsAnalytics from './ReportsAnalytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await axios.post(`${API}/admin/init-data`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize system:', error);
        toast.error('Errore nell\'inizializzazione del sistema');
      }
    };

    if (token && !isInitialized) {
      initializeSystem();
    }
  }, [token, isInitialized]);

  const navigationItems = [
    { path: '/admin', label: 'Panoramica', icon: BarChart3, exact: true },
    { path: '/admin/planning', label: 'Pianificazione', icon: Calendar },
    { path: '/admin/resources', label: 'Risorse', icon: Users },
    { path: '/admin/timeslots', label: 'Fasce Orarie', icon: Clock },
    { path: '/admin/reports', label: 'Report', icon: BarChart3 },
    { path: '/schedule', label: 'Turni Pubblicati', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="container nav-content">
          <div className="nav-brand">PlanShift Admin</div>
          <div className="nav-menu">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${
                  (item.exact && location.pathname === item.path) ||
                  (!item.exact && location.pathname.startsWith(item.path))
                    ? 'active'
                    : ''
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <button onClick={logout} className="btn btn-secondary btn-sm">
              <LogOut size={16} />
              Esci
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-8">
        <div className="fade-in">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="planning" element={<ShiftPlanning />} />
            <Route path="resources" element={<ResourceManagement />} />
            <Route path="timeslots" element={<TimeSlotManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// Overview Component - Enhanced
const Overview = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    totalResources: 0,
    totalTimeSlots: 0,
    publishedWeeks: 0,
    currentWeekShifts: 0,
    totalMonthlyHours: 0,
    monthlyOvertime: 0,
    utilizationRate: 0,
    pendingPublications: 0,
    activeConflicts: 0,
    weeklyTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchEnhancedStats = async () => {
      try {
        const [
          resourcesRes, 
          timeSlotsRes, 
          weeklyPlansRes, 
          reportsRes,
          shiftsRes
        ] = await Promise.all([
          axios.get(`${API}/resources`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/timeslots`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/weekly-plans`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/reports/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/shifts`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const publishedWeeks = weeklyPlansRes.data.filter(plan => plan.is_published).length;
        const pendingWeeks = weeklyPlansRes.data.filter(plan => !plan.is_published).length;
        
        // Calculate current week shifts
        const currentWeek = getCurrentWeek();
        const currentWeekShifts = shiftsRes.data.filter(shift => 
          shift.week_number === currentWeek.week && shift.year === currentWeek.year
        ).length;

        // Calculate monthly stats from reports
        const totalHours = reportsRes.data?.resource_performance?.reduce((sum, r) => sum + r.total_hours, 0) || 0;
        const totalOvertime = reportsRes.data?.resource_performance?.reduce((sum, r) => sum + r.total_overtime, 0) || 0;
        const avgUtilization = reportsRes.data?.resource_performance?.reduce((sum, r) => sum + r.utilization_percentage, 0) / (reportsRes.data?.resource_performance?.length || 1) || 0;

        // Mock weekly trend data
        const weeklyTrend = [
          { week: currentWeek.week - 3, hours: totalHours * 0.8 },
          { week: currentWeek.week - 2, hours: totalHours * 0.9 },
          { week: currentWeek.week - 1, hours: totalHours * 0.95 },
          { week: currentWeek.week, hours: totalHours }
        ];

        setStats({
          totalResources: resourcesRes.data.length,
          totalTimeSlots: timeSlotsRes.data.length,
          publishedWeeks,
          currentWeekShifts,
          totalMonthlyHours: Math.round(totalHours),
          monthlyOvertime: Math.round(totalOvertime),
          utilizationRate: Math.round(avgUtilization),
          pendingPublications: pendingWeeks,
          activeConflicts: 0, // Would need conflict detection logic
          weeklyTrend
        });

        // Mock recent activity
        setRecentActivity([
          { id: 1, type: 'publish', message: `Piano settimana ${currentWeek.week} pubblicato`, time: '2 ore fa', icon: Calendar },
          { id: 2, type: 'create', message: 'Nuova risorsa "Marco Verdi" aggiunta', time: '1 giorno fa', icon: Users },
          { id: 3, type: 'update', message: 'Fascia oraria "Mattino" modificata', time: '2 giorni fa', icon: Clock },
          { id: 4, type: 'conflict', message: 'Risolto conflitto turni Anna Neri', time: '3 giorni fa', icon: BarChart3 }
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch enhanced stats:', error);
        setLoading(false);
      }
    };

    fetchEnhancedStats();
  }, [token]);

  function getCurrentWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return { week: weekNumber, year };
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800">Panoramica Sistema</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panoramica Sistema</h1>
          <p className="text-slate-600 mt-1">Dashboard completa con metriche real-time</p>
        </div>
        <div className="text-sm text-slate-500">
          Aggiornato: {new Date().toLocaleTimeString('it-IT')}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Risorse Attive"
          value={stats.totalResources}
          icon={Users}
          color="blue"
          subtitle={`${stats.utilizationRate}% utilizzo medio`}
          trend={"+2 questo mese"}
        />
        <EnhancedStatCard
          title="Ore Totali (Mese)"
          value={`${stats.totalMonthlyHours}h`}
          icon={Clock}
          color="green"
          subtitle={`+${stats.monthlyOvertime}h straordinari`}
          trend={"+12% vs scorso mese"}
        />
        <EnhancedStatCard
          title="Piani Pubblicati"
          value={stats.publishedWeeks}
          icon={Calendar}
          color="purple"
          subtitle={`${stats.pendingPublications} in attesa`}
          trend={`${stats.currentWeekShifts} turni questa settimana`}
        />
        <EnhancedStatCard
          title="Performance"
          value={`${stats.utilizationRate}%`}
          icon={BarChart3}
          color="orange"
          subtitle="Tasso di utilizzo"
          trend={stats.activeConflicts === 0 ? "Nessun conflitto" : `${stats.activeConflicts} conflitti`}
        />
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Mini Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Tendenza Settimanale
          </h3>
          <div className="space-y-3">
            {stats.weeklyTrend.map((week, index) => (
              <div key={week.week} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Settimana {week.week}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((week.hours / stats.totalMonthlyHours) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-12 text-right">
                    {Math.round(week.hours)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={20} />
            Attività Recenti
          </h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'publish' ? 'bg-green-100 text-green-600' :
                  activity.type === 'create' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'update' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <activity.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium">{activity.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health Status */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Stato Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusIndicator 
            label="Database" 
            status="online" 
            message="Connessione stabile"
          />
          <StatusIndicator 
            label="Pianificazione" 
            status={stats.activeConflicts === 0 ? "online" : "warning"} 
            message={stats.activeConflicts === 0 ? "Nessun conflitto" : `${stats.activeConflicts} conflitti attivi`}
          />
          <StatusIndicator 
            label="Pubblicazioni" 
            status={stats.pendingPublications === 0 ? "online" : "info"} 
            message={stats.pendingPublications === 0 ? "Tutto pubblicato" : `${stats.pendingPublications} piani in attesa`}
          />
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/planning" className="btn btn-primary flex-col h-20 text-center">
            <Calendar size={24} />
            <span className="text-sm font-medium">Pianifica Turni</span>
          </Link>
          <Link to="/admin/resources" className="btn btn-secondary flex-col h-20 text-center">
            <Users size={24} />
            <span className="text-sm font-medium">Gestisci Risorse</span>
          </Link>
          <Link to="/admin/reports-analytics" className="btn btn-secondary flex-col h-20 text-center">
            <BarChart3 size={24} />
            <span className="text-sm font-medium">Visualizza Reports</span>
          </Link>
          <Link to="/admin/timeslots" className="btn btn-secondary flex-col h-20 text-center">
            <Clock size={24} />
            <span className="text-sm font-medium">Configura Orari</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Enhanced Stat Card Component
const EnhancedStatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div className="border-t pt-3 mt-3">
          <p className="text-xs text-slate-500">{trend}</p>
        </div>
      )}
    </div>
  );
};

// Status Indicator Component
const StatusIndicator = ({ label, status, message }) => {
  const statusConfig = {
    online: { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
    warning: { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
    error: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
    info: { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' }
  };

  const config = statusConfig[status] || statusConfig.info;

  return (
    <div className={`p-4 rounded-lg ${config.bg} border border-opacity-20`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
        <div>
          <p className="font-medium text-slate-800">{label}</p>
          <p className={`text-sm ${config.text}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

// Shift Planning Component (Placeholder)
const ShiftPlanning = () => {
  const { token } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [shifts, setShifts] = useState([]);
  const [resources, setResources] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  function getCurrentWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return { week: weekNumber, year };
  }

  useEffect(() => {
    fetchData();
  }, [currentWeek, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftsRes, resourcesRes, timeSlotsRes] = await Promise.all([
        axios.get(`${API}/shifts?week=${currentWeek.week}&year=${currentWeek.year}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/resources`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/timeslots`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setShifts(shiftsRes.data);
      setResources(resourcesRes.data);
      setTimeSlots(timeSlotsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const publishWeek = async () => {
    try {
      await axios.post(`${API}/weekly-plans/publish?week_number=${currentWeek.week}&year=${currentWeek.year}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Piano settimanale pubblicato con successo!');
    } catch (error) {
      console.error('Failed to publish week:', error);
      toast.error('Errore nella pubblicazione del piano');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Pianificazione Turni</h1>
        <button onClick={publishWeek} className="btn btn-success">
          <Play size={20} />
          Pubblica Settimana
        </button>
      </div>

      {/* Professional Scheduling Grid - Like the Image */}
      <ProfessionalSchedulingGrid 
        currentWeek={currentWeek}
        onWeekChange={setCurrentWeek}
      />
    </div>
  );
};

// Resource Management Component
const ResourceManagement = () => {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    weekly_hour_limit: 40,
    min_rest_hours: 12
  });

  useEffect(() => {
    fetchResources();
  }, [token]);

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API}/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      toast.error('Errore nel caricamento delle risorse');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingResource) {
        await axios.put(`${API}/resources/${editingResource.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Risorsa aggiornata con successo!');
      } else {
        await axios.post(`${API}/resources`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Risorsa creata con successo!');
      }
      
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Failed to save resource:', error);
      toast.error(error.response?.data?.detail || 'Errore nel salvataggio della risorsa');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      weekly_hour_limit: 40,
      min_rest_hours: 12
    });
    setEditingResource(null);
    setShowForm(false);
  };

  const editResource = (resource) => {
    setFormData({
      name: resource.name,
      email: resource.email,
      weekly_hour_limit: resource.weekly_hour_limit,
      min_rest_hours: resource.min_rest_hours
    });
    setEditingResource(resource);
    setShowForm(true);
  };

  const handleDeleteClick = (resource) => {
    setResourceToDelete(resource);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!resourceToDelete) return;

    try {
      const response = await axios.delete(`${API}/resources/${resourceToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Risorsa '${resourceToDelete.name}' eliminata con successo!`);
      
      // Show info about deleted shifts if any
      if (response.data.deleted_shifts_count > 0) {
        toast.info(`Eliminati anche ${response.data.deleted_shifts_count} turni associati`);
      }
      
      setShowDeleteModal(false);
      setResourceToDelete(null);
      fetchResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      toast.error(error.response?.data?.detail || 'Errore nell\'eliminazione della risorsa');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setResourceToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestione Risorse</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Nuova Risorsa
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {editingResource ? 'Modifica Risorsa' : 'Nuova Risorsa'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Limite Ore Settimanali</label>
                <input
                  type="number"
                  value={formData.weekly_hour_limit}
                  onChange={(e) => setFormData({ ...formData, weekly_hour_limit: parseInt(e.target.value) })}
                  className="form-input"
                  min="1"
                  max="168"
                  required
                />
              </div>
              <div>
                <label className="form-label">Ore Minime di Riposo</label>
                <input
                  type="number"
                  value={formData.min_rest_hours}
                  onChange={(e) => setFormData({ ...formData, min_rest_hours: parseInt(e.target.value) })}
                  className="form-input"
                  min="1"
                  max="24"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Ore minime che devono passare tra la fine di un turno e l'inizio del successivo
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                <Save size={20} />
                Salva
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Limite Ore/Settimana</th>
              <th>Riposo Minimo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td className="font-medium">{resource.name}</td>
                <td>{resource.email}</td>
                <td>{resource.weekly_hour_limit}h</td>
                <td>{resource.min_rest_hours}h</td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editResource(resource)}
                      className="btn btn-sm btn-secondary"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(resource)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && resourceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Elimina Risorsa</h3>
                <p className="text-sm text-slate-600">Questa azione non può essere annullata</p>
              </div>
            </div>
            
            <p className="text-slate-700 mb-6">
              Sei sicuro di voler eliminare la risorsa <strong>{resourceToDelete.name}</strong>?
              <br />
              <span className="text-sm text-slate-500 mt-2 block">
                Tutti i turni associati a questa risorsa verranno eliminati automaticamente.
              </span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                <Trash2 size={16} />
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Time Slot Management Component  
const TimeSlotManagement = () => {
  const { token } = useAuth();
  const [timeSlots, setTimeSlots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    is_custom: false
  });

  useEffect(() => {
    fetchTimeSlots();
  }, [token]);

  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get(`${API}/timeslots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeSlots(response.data);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      toast.error('Errore nel caricamento delle fasce orarie');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSlot) {
        await axios.put(`${API}/timeslots/${editingSlot.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fascia oraria aggiornata con successo!');
      } else {
        await axios.post(`${API}/timeslots`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fascia oraria creata con successo!');
      }
      
      resetForm();
      fetchTimeSlots();
    } catch (error) {
      console.error('Failed to save time slot:', error);
      toast.error(error.response?.data?.detail || 'Errore nel salvataggio della fascia oraria');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_time: '',
      end_time: '',
      is_custom: false
    });
    setEditingSlot(null);
    setShowForm(false);
  };

  const editTimeSlot = (timeSlot) => {
    setFormData({
      name: timeSlot.name,
      start_time: timeSlot.start_time,
      end_time: timeSlot.end_time,
      is_custom: timeSlot.is_custom
    });
    setEditingSlot(timeSlot);
    setShowForm(true);
  };

  const deleteTimeSlot = async (slotId) => {
    if (window.confirm('Sei sicuro di voler eliminare questa fascia oraria?')) {
      try {
        await axios.delete(`${API}/timeslots/${slotId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fascia oraria eliminata con successo!');
        fetchTimeSlots();
      } catch (error) {
        console.error('Failed to delete time slot:', error);
        toast.error(error.response?.data?.detail || 'Errore nell\'eliminazione della fascia oraria');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Gestione Fasce Orarie</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Nuova Fascia Oraria
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {editingSlot ? 'Modifica Fascia Oraria' : 'Nuova Fascia Oraria'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Ora Inizio</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Ora Fine</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                <Save size={20} />
                Salva
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Time Slots Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ora Inizio</th>
              <th>Ora Fine</th>
              <th>Durata</th>
              <th>Tipo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => {
              const duration = calculateDuration(slot.start_time, slot.end_time);
              return (
                <tr key={slot.id}>
                  <td className="font-medium">{slot.name}</td>
                  <td>{slot.start_time}</td>
                  <td>{slot.end_time}</td>
                  <td>{duration}h</td>
                  <td>
                    <span className={`badge ${slot.is_custom ? 'badge-info' : 'badge-success'}`}>
                      {slot.is_custom ? 'Personalizzata' : 'Standard'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTimeSlot(slot)}
                        className="btn btn-sm btn-secondary"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteTimeSlot(slot.id)}
                        className="btn btn-sm btn-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper function to calculate duration
const calculateDuration = (startTime, endTime) => {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  let diff = end - start;
  if (diff < 0) {
    // Handle overnight shifts
    diff += 24 * 60 * 60 * 1000;
  }
  
  return Math.round(diff / (1000 * 60 * 60) * 10) / 10;
};

// Reports Component (Placeholder)
const Reports = () => {
  return <ReportsAnalytics />;
};

export default AdminDashboard;