import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  User,
  RefreshCw,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogOut
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicScheduleView = () => {
  const { user, token, logout } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [weekDates, setWeekDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [groupedShifts, setGroupedShifts] = useState({});
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'my', 'today'

  function getCurrentWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return { week: weekNumber, year };
  }

  // Generate week dates
  const generateWeekDates = (weekNumber, year) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysFromFirstDayOfYear = (weekNumber - 1) * 7;
    const startOfWeek = new Date(firstDayOfYear.getTime() + daysFromFirstDayOfYear * 24 * 60 * 60 * 1000);
    
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(startOfWeek.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
    
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      dates.push({
        date: dateStr,
        day: date.toLocaleDateString('it-IT', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('it-IT', { weekday: 'short' }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString('it-IT', { month: 'long' }),
        monthShort: date.toLocaleDateString('it-IT', { month: 'short' }),
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return dates;
  };

  useEffect(() => {
    const dates = generateWeekDates(currentWeek.week, currentWeek.year);
    setWeekDates(dates);
  }, [currentWeek]);

  useEffect(() => {
    fetchPublishedShifts();
    fetchTimeSlots();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPublishedShifts(false); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [currentWeek, token]);

  useEffect(() => {
    // Group shifts by date and time slot
    const grouped = {};
    shifts.forEach(shift => {
      const key = `${shift.date}-${shift.time_slot_id}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(shift);
    });
    setGroupedShifts(grouped);
  }, [shifts]);

  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get(`${API}/timeslots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeSlots(response.data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    }
  };

  const fetchPublishedShifts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      // Get all published shifts for all users (admin view) or just employee shifts
      const endpoint = user?.role === 'ADMIN' 
        ? `shifts?week=${currentWeek.week}&year=${currentWeek.year}`
        : `employee/shifts`;
        
      const response = await axios.get(`${API}/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let shiftsData = response.data;
      
      // Filter by current week if employee (employee endpoint returns all published shifts)
      if (user?.role === 'EMPLOYEE') {
        shiftsData = shiftsData.filter(shift => 
          shift.week_number === currentWeek.week && shift.year === currentWeek.year
        );
      }
      
      setShifts(shiftsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch published shifts:', error);
      if (showLoading) {
        toast.error('Errore nel caricamento dei turni pubblicati');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getFilteredShifts = () => {
    let filtered = shifts;
    
    if (filterMode === 'my' && user?.role === 'EMPLOYEE') {
      // Filtra solo i turni dell'utente corrente
      filtered = filtered.filter(shift => isMyShift(shift));
    } else if (filterMode === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(shift => shift.date === today);
    }
    
    return filtered;
  };

  const getShiftsForCell = (date, timeSlotId) => {
    const key = `${date}-${timeSlotId}`;
    return groupedShifts[key] || [];
  };

  // Verifica se un turno appartiene all'utente corrente
  const isMyShift = (shift) => {
    if (user?.role !== 'EMPLOYEE') return false;
    return shift.resource?.email === user.email;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="loading mb-4"></div>
          <p className="text-slate-600">Caricamento turni pubblicati...</p>
        </div>
      </div>
    );
  }

  const filteredShifts = getFilteredShifts();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="nav-header">
        <div className="container nav-content">
          <div className="nav-brand">
            <Calendar className="w-6 h-6 mr-2" />
            Turni Pubblicati
            {user?.role === 'EMPLOYEE' && (
              <span className="ml-2 text-sm font-normal text-slate-600">
                - {user.full_name}
              </span>
            )}
          </div>
          <div className="nav-menu">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                <Clock size={16} className="inline mr-1" />
                Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
              </div>
              <button
                onClick={() => fetchPublishedShifts(true)}
                className="btn btn-secondary btn-sm"
                title="Aggiorna"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={logout}
                className="btn btn-danger btn-sm"
                title="Esci"
              >
                <LogOut size={16} />
                <span className="ml-1">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-8">
        <div className="space-y-6">
          {/* Week Navigation */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setCurrentWeek(prev => ({ ...prev, week: prev.week - 1 }))}
                className="btn btn-secondary"
              >
                <ChevronLeft size={20} />
                Precedente
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">
                  {weekDates[0]?.dayNum} {weekDates[0]?.month} - {weekDates[6]?.dayNum} {weekDates[6]?.month} {currentWeek.year}
                </h2>
              </div>
              
              <button 
                onClick={() => setCurrentWeek(prev => ({ ...prev, week: prev.week + 1 }))}
                className="btn btn-secondary"
              >
                Successiva
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Visualizzazione:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterMode('all')}
                className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Eye size={16} />
                Tutti i Turni
              </button>
              
              {user?.role === 'EMPLOYEE' && (
                <button
                  onClick={() => setFilterMode('my')}
                  className={`btn btn-sm ${filterMode === 'my' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <User size={16} />
                  I Miei Turni
                </button>
              )}
              
              <button
                onClick={() => setFilterMode('today')}
                className={`btn btn-sm ${filterMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Calendar size={16} />
                Solo Oggi
              </button>
            </div>
          </div>

          {/* No Shifts Message */}
          {filteredShifts.length === 0 && (
            <div className="card p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-slate-400 mb-4" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">
                Nessun turno pubblicato
              </h2>
              <p className="text-slate-500">
                {filterMode === 'today' 
                  ? 'Non ci sono turni pubblicati per oggi.'
                  : filterMode === 'my'
                    ? 'Non hai turni assegnati per questa settimana.'
                    : 'Non ci sono turni pubblicati per questa settimana.'
                }
              </p>
            </div>
          )}

          {/* Schedule Grid */}
          {filteredShifts.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 bg-slate-100 border-b">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={20} />
                  Pianificazione Turni
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {filteredShifts.length} turni pubblicati • Aggiornamento automatico ogni 30 secondi
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Header */}
                  <thead>
                    <tr>
                      <th className="bg-slate-200 border border-slate-300 p-3 text-left font-bold min-w-[180px]">
                        Fascia Oraria
                      </th>
                      {weekDates.map(dateInfo => (
                        <th key={dateInfo.date} className={`border border-slate-300 p-3 text-center min-w-[140px] ${
                          dateInfo.isToday ? 'bg-blue-100 font-bold' : 'bg-slate-100'
                        } ${dateInfo.isWeekend ? 'bg-slate-50' : ''}`}>
                          <div className="text-sm font-bold text-slate-800">
                            {dateInfo.dayShort}
                          </div>
                          <div className="text-lg font-bold text-slate-700">
                            {dateInfo.dayNum}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dateInfo.monthShort}
                          </div>
                          {dateInfo.isToday && (
                            <div className="text-xs text-blue-600 font-semibold mt-1">
                              Oggi
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody>
                    {timeSlots.map(timeSlot => (
                      <tr key={timeSlot.id} className="hover:bg-slate-50">
                        {/* Time Slot Info */}
                        <td className="bg-slate-100 border border-slate-300 p-3">
                          <div className="font-semibold text-slate-800">{timeSlot.name}</div>
                          <div className="text-sm text-slate-600">
                            {timeSlot.start_time} - {timeSlot.end_time}
                          </div>
                        </td>
                        
                        {/* Day Cells */}
                        {weekDates.map(dateInfo => {
                          const cellShifts = getShiftsForCell(dateInfo.date, timeSlot.id);
                          
                          return (
                            <td
                              key={dateInfo.date}
                              className={`border border-slate-300 p-2 text-center min-h-[80px] ${
                                dateInfo.isToday ? 'bg-blue-50' : 'bg-white'
                              } ${dateInfo.isWeekend ? 'bg-slate-50' : ''}`}
                            >
                              {cellShifts.length > 0 ? (
                                <div className="space-y-1">
                                  {cellShifts.map((shift, index) => {
                                    const isMyTurn = isMyShift(shift);
                                    const isOvertime = shift.overtime_hours > 0;
                                    
                                    // Colori per i turni dell'utente corrente vs altri
                                    let bgColor, textColor, borderColor;
                                    
                                    if (isMyTurn) {
                                      // I MIEI turni - evidenziati in blu
                                      bgColor = isOvertime ? 'bg-blue-200' : 'bg-blue-100';
                                      textColor = 'text-blue-900';
                                      borderColor = 'border-blue-400';
                                    } else {
                                      // Turni di altri - colore normale ma più tenue
                                      bgColor = isOvertime ? 'bg-amber-50' : 'bg-slate-100';
                                      textColor = isOvertime ? 'text-amber-700' : 'text-slate-600';
                                      borderColor = isOvertime ? 'border-amber-200' : 'border-slate-300';
                                    }
                                    
                                    return (
                                      <div
                                        key={shift.id}
                                        className={`p-2 rounded text-xs ${bgColor} ${textColor} border ${borderColor} ${
                                          isMyTurn ? 'font-bold shadow-sm' : 'font-normal'
                                        }`}
                                        title={`${shift.resource?.name || 'N/A'} - ${shift.hours}h${
                                          shift.overtime_hours > 0 ? ` (+${shift.overtime_hours}h straordinari)` : ''
                                        }${isMyTurn ? ' (TUO TURNO)' : ''}`}
                                      >
                                        <div className="font-semibold flex items-center gap-1">
                                          {isMyTurn && user?.role === 'EMPLOYEE' && (
                                            <span className="text-blue-600">👤</span>
                                          )}
                                          {isMyTurn && user?.role === 'EMPLOYEE' 
                                            ? 'TUO TURNO'
                                            : (shift.resource?.name || 'N/A')
                                          }
                                        </div>
                                        <div className="text-xs">
                                          {shift.hours}h
                                          {shift.overtime_hours > 0 && (
                                            <span className="ml-1">+{shift.overtime_hours}h</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-slate-400 text-sm py-4">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          {filteredShifts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <Calendar size={28} className="mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {filteredShifts.length}
                </p>
                <p className="text-sm text-slate-600">
                  Turni Totali
                </p>
              </div>
              
              <div className="card p-4 text-center">
                <Clock size={28} className="mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {filteredShifts.reduce((total, shift) => total + (shift.hours || 0), 0)}h
                </p>
                <p className="text-sm text-slate-600">
                  Ore di Lavoro
                </p>
              </div>
              
              <div className="card p-4 text-center">
                <AlertCircle size={28} className="mx-auto text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {filteredShifts.reduce((total, shift) => total + (shift.overtime_hours || 0), 0)}h
                </p>
                <p className="text-sm text-slate-600">
                  Ore Straordinari
                </p>
              </div>
              
              <div className="card p-4 text-center">
                <User size={28} className="mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {new Set(filteredShifts.map(s => s.resource_id)).size}
                </p>
                <p className="text-sm text-slate-600">
                  Risorse Coinvolte
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="card p-4">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Eye size={18} />
              Legenda
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Turno normale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
                <span>Con straordinari</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Giorno corrente</span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                ℹ️ <strong>Nota:</strong> Questa pagina si aggiorna automaticamente ogni 30 secondi per mostrare 
                sempre i turni più aggiornati. {user?.role === 'ADMIN' ? 'Come amministratore puoi vedere tutti i turni pubblicati.' : 'Sono visualizzati solo i turni che ti sono stati assegnati.'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicScheduleView;