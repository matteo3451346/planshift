import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  User,
  LogOut,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeDashboard = () => {
  const { user, logout, token } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchShifts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchShifts(false); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const fetchShifts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const response = await axios.get(`${API}/employee/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      if (showLoading) {
        toast.error('Errore nel caricamento dei turni');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const groupShiftsByWeek = (shifts) => {
    const grouped = {};
    shifts.forEach(shift => {
      const key = `${shift.year}-W${shift.week_number}`;
      if (!grouped[key]) {
        grouped[key] = {
          week: shift.week_number,
          year: shift.year,
          shifts: []
        };
      }
      grouped[key].shifts.push(shift);
    });

    // Sort by week
    return Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const calculateTotalHours = (weekShifts) => {
    return weekShifts.reduce((total, shift) => total + shift.hours, 0);
  };

  const calculateTotalOvertime = (weekShifts) => {
    return weekShifts.reduce((total, shift) => total + shift.overtime_hours, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="loading mb-4"></div>
          <p className="text-slate-600">Caricamento turni...</p>
        </div>
      </div>
    );
  }

  const weeklyShifts = groupShiftsByWeek(shifts);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="nav-header">
        <div className="container nav-content">
          <div className="nav-brand">PlanShift - Dashboard Dipendente</div>
          <div className="nav-menu">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                <User size={16} className="inline mr-1" />
                {user?.full_name}
              </div>
              <button
                onClick={() => fetchShifts(true)}
                className="btn btn-secondary btn-sm"
                title="Aggiorna"
              >
                <RefreshCw size={16} />
              </button>
              <button onClick={logout} className="btn btn-secondary btn-sm">
                <LogOut size={16} />
                Esci
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-8">
        <div className="fade-in space-y-6">
          {/* Welcome Section */}
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Benvenuto, {user?.full_name}!
            </h1>
            <p className="text-slate-600 mb-4">
              Qui puoi visualizzare i tuoi turni di lavoro pubblicati.
            </p>
            <div className="flex items-center text-sm text-slate-500">
              <Clock size={16} className="mr-1" />
              Ultimo aggiornamento: {lastUpdated.toLocaleTimeString('it-IT')}
              <span className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded">
                Aggiornamento automatico ogni 30 secondi
              </span>
            </div>
          </div>

          {/* No Shifts Message */}
          {weeklyShifts.length === 0 && (
            <div className="card p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-slate-400 mb-4" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">
                Nessun turno pubblicato
              </h2>
              <p className="text-slate-500">
                Non ci sono ancora turni pubblicati per te. 
                Controlla più tardi o contatta il tuo supervisore.
              </p>
            </div>
          )}

          {/* Shifts by Week */}
          {weeklyShifts.map((weekData) => {
            const totalHours = calculateTotalHours(weekData.shifts);
            const totalOvertime = calculateTotalOvertime(weekData.shifts);
            
            return (
              <div key={`${weekData.year}-W${weekData.week}`} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">
                    Settimana {weekData.week} - {weekData.year}
                  </h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-slate-600">
                      <strong>{totalHours}h</strong> totali
                    </div>
                    {totalOvertime > 0 && (
                      <div className="text-warning-600">
                        <strong>+{totalOvertime}h</strong> straordinari
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {weekData.shifts
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((shift) => (
                      <div
                        key={shift.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <Calendar size={20} className="text-primary-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {formatDate(shift.date)}
                              </p>
                              <p className="text-sm text-slate-600">
                                {shift.time_slot?.name}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock size={16} className="text-slate-400" />
                              <span className="font-medium text-slate-800">
                                {shift.time_slot?.start_time} - {shift.time_slot?.end_time}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600">
                              {shift.hours}h di lavoro
                              {shift.overtime_hours > 0 && (
                                <span className="text-warning-600 ml-2">
                                  (+{shift.overtime_hours}h straordinari)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}

          {/* Summary Stats */}
          {weeklyShifts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 text-center">
                <Calendar size={32} className="mx-auto text-primary-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {shifts.length}
                </p>
                <p className="text-sm text-slate-600">
                  Turni totali
                </p>
              </div>
              
              <div className="card p-6 text-center">
                <Clock size={32} className="mx-auto text-success-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {shifts.reduce((total, shift) => total + shift.hours, 0)}h
                </p>
                <p className="text-sm text-slate-600">
                  Ore di lavoro
                </p>
              </div>
              
              <div className="card p-6 text-center">
                <AlertCircle size={32} className="mx-auto text-warning-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {shifts.reduce((total, shift) => total + shift.overtime_hours, 0)}h
                </p>
                <p className="text-sm text-slate-600">
                  Ore straordinari
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;