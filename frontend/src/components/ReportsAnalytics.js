import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  User,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsAnalytics = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [selectedResource, setSelectedResource] = useState('');
  const [resourceReport, setResourceReport] = useState(null);
  const [timeRange, setTimeRange] = useState('4weeks');

  useEffect(() => {
    fetchReportsOverview();
  }, [token]);

  const fetchReportsOverview = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Errore nel caricamento dei report');
    } finally {
      setLoading(false);
    }
  };

  const fetchResourceReport = async (resourceId) => {
    try {
      const response = await axios.get(`${API}/reports/resource/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResourceReport(response.data);
    } catch (error) {
      console.error('Failed to fetch resource report:', error);
      toast.error('Errore nel caricamento del report risorsa');
    }
  };

  const handleResourceSelect = (resourceId) => {
    setSelectedResource(resourceId);
    if (resourceId) {
      fetchResourceReport(resourceId);
    } else {
      setResourceReport(null);
    }
  };

  // Colors for charts
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="loading"></div>
          <span className="text-slate-600">Caricamento report e analisi...</span>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={64} className="mx-auto text-slate-400 mb-4" />
        <p className="text-slate-500">Nessun dato disponibile per i report</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Report e Analisi</h1>
          <p className="text-slate-600 mt-1">Dashboard completa delle performance e utilizzo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportsOverview}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={16} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Risorse Attive</p>
              <p className="text-3xl font-bold text-slate-800">{reportData.summary.total_resources}</p>
            </div>
            <Users size={32} className="text-blue-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Ore Totali (Mese)</p>
              <p className="text-3xl font-bold text-slate-800">
                {reportData.resource_performance.reduce((sum, r) => sum + r.total_hours, 0)}h
              </p>
            </div>
            <Clock size={32} className="text-green-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Straordinari (Mese)</p>
              <p className="text-3xl font-bold text-slate-800">
                {Math.round(reportData.resource_performance.reduce((sum, r) => sum + r.total_overtime, 0))}h
              </p>
            </div>
            <AlertTriangle size={32} className="text-orange-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Turni (Mese)</p>
              <p className="text-3xl font-bold text-slate-800">
                {reportData.resource_performance.reduce((sum, r) => sum + r.total_shifts, 0)}
              </p>
            </div>
            <Calendar size={32} className="text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Tendenze Settimanali (Ultime 4 Settimane)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData.weekly_trends.reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week" 
                tickFormatter={(value, index) => `S${value}`}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => `Settimana ${value}`}
                formatter={(value, name) => [
                  `${value}${name.includes('ore') ? 'h' : ''}`,
                  name === 'total_hours' ? 'Ore Totali' : 
                  name === 'total_overtime' ? 'Straordinari' : 'Turni'
                ]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total_hours" 
                stackId="1"
                stroke="#0ea5e9" 
                fill="#0ea5e9" 
                fillOpacity={0.6}
                name="Ore Totali"
              />
              <Area 
                type="monotone" 
                dataKey="total_overtime" 
                stackId="1"
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={0.6}
                name="Straordinari"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Distribuzione Giornaliera (Settimana Corrente)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.daily_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value}${name.includes('ore') || name.includes('overtime') ? 'h' : ''}`,
                  name === 'hours' ? 'Ore' : 
                  name === 'overtime' ? 'Straordinari' : 'Turni'
                ]}
              />
              <Legend />
              <Bar dataKey="hours" fill="#10b981" name="Ore" />
              <Bar dataKey="overtime" fill="#f59e0b" name="Straordinari" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={20} />
            Performance Risorse (Ore Mensili)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.resource_performance.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value}h`,
                  name === 'total_hours' ? 'Ore Normali' : 'Straordinari'
                ]}
              />
              <Legend />
              <Bar dataKey="total_hours" fill="#0ea5e9" name="Ore Normali" />
              <Bar dataKey="total_overtime" fill="#ef4444" name="Straordinari" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time Slot Usage */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChartIcon size={20} />
            Utilizzo Fasce Orarie
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.time_slot_usage}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="usage_count"
              >
                {reportData.time_slot_usage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} utilizzi`, 'Conteggio']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Utilization Table */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={20} />
          Dettaglio Utilizzo Risorse
        </h3>
        
        <div className="mb-4">
          <select
            value={selectedResource}
            onChange={(e) => handleResourceSelect(e.target.value)}
            className="form-select max-w-md"
          >
            <option value="">Seleziona una risorsa per il dettaglio...</option>
            {reportData.resource_performance.map(resource => (
              <option key={resource.id} value={resource.id}>
                {resource.name} - {resource.total_hours}h questo mese
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Ore Mensili</th>
                <th>Straordinari</th>
                <th>Turni</th>
                <th>Utilizzo</th>
                <th>Efficienza</th>
              </tr>
            </thead>
            <tbody>
              {reportData.resource_performance.map((resource) => (
                <tr key={resource.id}>
                  <td className="font-medium">{resource.name}</td>
                  <td>{resource.email}</td>
                  <td>{resource.total_hours}h</td>
                  <td>
                    <span className={resource.total_overtime > 0 ? 'text-orange-600 font-medium' : ''}>
                      {resource.total_overtime}h
                    </span>
                  </td>
                  <td>{resource.total_shifts}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            resource.utilization_percentage > 90 ? 'bg-red-500' :
                            resource.utilization_percentage > 70 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(resource.utilization_percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-600">
                        {resource.utilization_percentage}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      resource.utilization_percentage > 80 ? 'badge-success' :
                      resource.utilization_percentage > 50 ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {resource.utilization_percentage > 80 ? 'Alta' :
                       resource.utilization_percentage > 50 ? 'Media' : 'Bassa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Detail Panel */}
      {resourceReport && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User size={20} />
            Dettaglio Risorsa: {resourceReport.resource.name}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Breakdown */}
            <div>
              <h4 className="font-medium text-slate-700 mb-3">Andamento Settimanale (Ultime 8 Settimane)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={resourceReport.weekly_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tickFormatter={(value) => `S${value}`} />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Settimana ${value}`}
                    formatter={(value, name) => [
                      `${value}${name.includes('ore') ? 'h' : ''}`,
                      name === 'hours' ? 'Ore' : 
                      name === 'overtime' ? 'Straordinari' : 'Turni'
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="hours" stroke="#0ea5e9" name="Ore" />
                  <Line type="monotone" dataKey="overtime" stroke="#f59e0b" name="Straordinari" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Time Slot Preferences */}
            <div>
              <h4 className="font-medium text-slate-700 mb-3">Preferenze Fasce Orarie</h4>
              <div className="space-y-2">
                {Object.entries(resourceReport.time_slot_preferences).map(([slot, count]) => (
                  <div key={slot} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="font-medium">{slot}</span>
                    <span className="badge badge-info">{count} volte</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <h5 className="font-medium text-blue-900 mb-2">Statistiche Totali</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Turni Totali:</span>
                    <span className="font-medium ml-1">{resourceReport.totals.total_shifts}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Ore Totali:</span>
                    <span className="font-medium ml-1">{resourceReport.totals.total_hours}h</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Straordinari:</span>
                    <span className="font-medium ml-1">{resourceReport.totals.total_overtime}h</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Media/Settimana:</span>
                    <span className="font-medium ml-1">{resourceReport.totals.average_hours_per_week}h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;