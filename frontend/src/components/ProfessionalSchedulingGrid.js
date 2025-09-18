import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Save,
  RefreshCw,
  X,
  Edit,
  ChevronLeft,
  ChevronRight,
  Palette
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfessionalSchedulingGrid = ({ currentWeek, onWeekChange }) => {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState('');
  const [extraOvertimeHours, setExtraOvertimeHours] = useState(0);
  const [showColorModal, setShowColorModal] = useState(false);
  const [timeSlotColors, setTimeSlotColors] = useState({});

  // Default colors for new time slots (moved up)
  const defaultColors = [
    '#fef3c7', // yellow-100
    '#fed7aa', // orange-100  
    '#dbeafe', // blue-100
    '#e9d5ff', // purple-100
    '#f0f9ff', // sky-100
    '#dcfce7', // green-100
    '#cffafe', // cyan-100
    '#f3f4f6', // gray-100
    '#fce7f3', // pink-100
    '#f3e8ff'  // violet-100
  ];

  // Load saved colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('timeSlotColors');
    if (savedColors) {
      setTimeSlotColors(JSON.parse(savedColors));
    }
  }, []);

  // Save colors to localStorage when changed
  useEffect(() => {
    if (Object.keys(timeSlotColors).length > 0) {
      localStorage.setItem('timeSlotColors', JSON.stringify(timeSlotColors));
    }
  }, [timeSlotColors]);

  // Generate week dates with actual date range
  const generateWeekDates = useCallback((weekNumber, year) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysFromFirstDayOfYear = (weekNumber - 1) * 7;
    const startOfWeek = new Date(firstDayOfYear.getTime() + daysFromFirstDayOfYear * 24 * 60 * 60 * 1000);
    
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(startOfWeek.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
    
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayNames = ['LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO', 'DOMENICA'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      dates.push({
        date: dateStr,
        day: dayNames[i],
        dayNum: date.getDate(),
        month: date.toLocaleDateString('it-IT', { month: 'short' }),
        fullDate: date,
        isToday: date.getTime() === today.getTime(),
        isWeekend: i >= 5 // Saturday and Sunday
      });
    }
    return dates;
  }, []);

  // Get formatted week range
  const getWeekRange = useMemo(() => {
    if (weekDates.length === 0) return '';
    
    const startDate = weekDates[0].fullDate;
    const endDate = weekDates[6].fullDate;
    
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const startMonth = startDate.toLocaleDateString('it-IT', { month: 'long' });
    const endMonth = endDate.toLocaleDateString('it-IT', { month: 'long' });
    const year = startDate.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${year}`;
    } else {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
    }
  }, [weekDates]);

  useEffect(() => {
    const dates = generateWeekDates(currentWeek.week, currentWeek.year);
    setWeekDates(dates);
  }, [currentWeek, generateWeekDates]);

  useEffect(() => {
    fetchAllData();
  }, [currentWeek, token]);

  useEffect(() => {
    // Assign default colors to time slots that don't have colors yet
    timeSlots.forEach((timeSlot, index) => {
      if (!timeSlotColors[timeSlot.id]) {
        setTimeSlotColors(prev => ({
          ...prev,
          [timeSlot.id]: defaultColors[index % defaultColors.length]
        }));
      }
    });
  }, [timeSlots, timeSlotColors, defaultColors]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resourcesRes, timeSlotsRes, shiftsRes] = await Promise.all([
        axios.get(`${API}/resources`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/timeslots`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/shifts?week=${currentWeek.week}&year=${currentWeek.year}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setResources(resourcesRes.data);
      setTimeSlots(timeSlotsRes.data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Errore nel caricamento dei dati: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Group shifts by date and time slot
  const getShiftsForCell = useCallback((date, timeSlotId) => {
    return shifts.filter(s => s.date === date && s.time_slot_id === timeSlotId);
  }, [shifts]);

  // Get color for time slot
  const getTimeSlotColor = (timeSlotId) => {
    return timeSlotColors[timeSlotId] || '#f1f5f9'; // default to slate-100
  };

  // Generate CSS style for time slot
  const getTimeSlotStyle = (timeSlotId) => {
    const color = getTimeSlotColor(timeSlotId);
    return {
      backgroundColor: color,
      borderColor: adjustColorBrightness(color, -20)
    };
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (color, amount) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const handleCellClick = (date, timeSlotId) => {
    setSelectedCell({ date, timeSlotId });
    setShowAddModal(true);
  };

  const addShiftToCell = async () => {
    if (!selectedResource || !selectedCell) return;

    try {
      const response = await axios.post(`${API}/shifts`, {
        resource_id: selectedResource,
        time_slot_id: selectedCell.timeSlotId,
        date: selectedCell.date,
        week_number: currentWeek.week,
        year: currentWeek.year,
        extra_overtime_hours: extraOvertimeHours || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const resource = resources.find(r => r.id === selectedResource);
      const timeSlot = timeSlots.find(ts => ts.id === selectedCell.timeSlotId);
      
      const enrichedShift = {
        ...response.data,
        resource,
        time_slot: timeSlot
      };

      setShifts(prev => [...prev, enrichedShift]);
      toast.success(`${resource?.name} assegnato al turno${extraOvertimeHours > 0 ? ` con ${extraOvertimeHours}h straordinari` : ''}`);
      
      setShowAddModal(false);
      setSelectedResource('');
      setExtraOvertimeHours(0);
      setSelectedCell(null);
    } catch (error) {
      console.error('Failed to create shift:', error);
      toast.error(error.response?.data?.detail || 'Errore nell\'assegnazione del turno');
    }
  };

  const removeShift = async (shiftId) => {
    try {
      await axios.delete(`${API}/shifts/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShifts(prev => prev.filter(s => s.id !== shiftId));
      toast.success('Turno rimosso');
    } catch (error) {
      console.error('Failed to delete shift:', error);
      toast.error('Errore nella rimozione del turno');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="loading"></div>
          <span className="text-slate-600">Caricamento pianificazione turni...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold text-slate-800">
            Pianificazione Turni Professionale
          </h3>
          <button
            onClick={fetchAllData}
            className="btn btn-secondary btn-sm"
            title="Aggiorna dati"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowColorModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Palette size={16} />
            Colori Fasce
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onWeekChange(prev => ({ ...prev, week: prev.week - 1 }))}
            className="btn btn-secondary"
          >
            <ChevronLeft size={20} />
            Precedente
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">
              {getWeekRange} {currentWeek.year}
            </h2>
          </div>
          
          <button 
            onClick={() => onWeekChange(prev => ({ ...prev, week: prev.week + 1 }))}
            className="btn btn-secondary"
          >
            Successiva
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Professional Scheduling Table */}
      <div className="card overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: '13px' }}>
            {/* Header Row */}
            <thead>
              <tr>
                <th className="bg-slate-600 text-white font-bold p-3 text-left border border-slate-500 min-w-[180px]">
                  FASCE ORARIE
                </th>
                {weekDates.map(dateInfo => (
                  <th key={dateInfo.date} className={`font-bold p-3 text-center border border-slate-500 min-w-[120px] ${
                    dateInfo.isToday ? 'bg-blue-200 text-blue-900' : 'bg-yellow-200 text-yellow-900'
                  }`}>
                    <div className="font-bold text-sm">
                      {dateInfo.day}
                    </div>
                    <div className="text-xs">
                      {dateInfo.dayNum}-{dateInfo.month}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {timeSlots.map(timeSlot => {
                
                return (
                  <tr key={timeSlot.id}>
                    {/* Time Slot Label */}
                    <td 
                      className="font-bold p-4 border border-slate-400 text-slate-800"
                      style={getTimeSlotStyle(timeSlot.id)}
                    >
                      <div className="font-bold text-sm">
                        {timeSlot.name.toUpperCase()}
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        {timeSlot.start_time} - {timeSlot.end_time}
                      </div>
                    </td>
                    
                    {/* Day Cells */}
                    {weekDates.map(dateInfo => {
                      const cellShifts = getShiftsForCell(dateInfo.date, timeSlot.id);
                      
                      return (
                        <td
                          key={dateInfo.date}
                          className={`border border-slate-400 p-2 cursor-pointer hover:bg-slate-50 min-h-[60px] ${
                            dateInfo.isWeekend ? 'bg-slate-100 bg-opacity-50' : 'bg-white'
                          }`}
                          style={getTimeSlotStyle(timeSlot.id)}
                          onClick={() => handleCellClick(dateInfo.date, timeSlot.id)}
                          title="Click per assegnare persone a questo turno"
                        >
                          <div className="space-y-1">
                            {cellShifts.map((shift, index) => (
                              <div
                                key={shift.id}
                                className="group relative flex items-center justify-between bg-white bg-opacity-70 rounded px-2 py-1 text-xs font-semibold border"
                              >
                                <span className="text-slate-800">
                                  {shift.resource?.name?.toUpperCase() || 'N/A'}
                                  {shift.overtime_hours > 0 && (
                                    <span className="text-red-600 ml-1">
                                      +{shift.overtime_hours}h
                                      {shift.extra_overtime_hours > 0 && (
                                        <span className="text-xs"> (extra: {shift.extra_overtime_hours}h)</span>
                                      )}
                                    </span>
                                  )}
                                  {shift.overtime_hours === 0 && shift.extra_overtime_hours > 0 && (
                                    <span className="text-orange-600 ml-1">+{shift.extra_overtime_hours}h extra</span>
                                  )}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeShift(shift.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 transition-opacity"
                                  title="Rimuovi"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            
                            {/* Add Button */}
                            {cellShifts.length === 0 && (
                              <div className="text-center py-2">
                                <Plus size={16} className="text-slate-400 mx-auto opacity-50" />
                              </div>
                            )}
                            
                            {cellShifts.length > 0 && (
                              <div className="text-center">
                                <Plus size={14} className="text-slate-500 mx-auto opacity-60 hover:opacity-100" />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <User size={24} className="mx-auto text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{resources.length}</p>
          <p className="text-sm text-slate-600">Risorse Disponibili</p>
        </div>
        
        <div className="card p-4 text-center">
          <Calendar size={24} className="mx-auto text-green-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{shifts.length}</p>
          <p className="text-sm text-slate-600">Turni Assegnati</p>
        </div>
        
        <div className="card p-4 text-center">
          <Clock size={24} className="mx-auto text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">
            {shifts.reduce((sum, s) => sum + (s.hours || 0), 0)}h
          </p>
          <p className="text-sm text-slate-600">Ore Totali</p>
        </div>
        
        <div className="card p-4 text-center">
          <AlertTriangle size={24} className="mx-auto text-orange-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">
            {shifts.reduce((sum, s) => sum + (s.overtime_hours || 0), 0)}h
          </p>
          <p className="text-sm text-slate-600">Straordinari</p>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <h4 className="font-bold text-slate-800 mb-3">Legenda Colori Fasce Orarie</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timeSlots.map(timeSlot => (
            <div key={timeSlot.id} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 border-2 border-slate-400 rounded"
                style={{ backgroundColor: getTimeSlotColor(timeSlot.id) }}
              ></div>
              <span className="text-sm">{timeSlot.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">
          💡 <strong>Istruzioni:</strong> Clicca su una cella per assegnare persone al turno. 
          Passa il mouse sui nomi per vedere il pulsante di rimozione.
        </p>
      </div>

      {/* Add Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Aggiungi Persona al Turno
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleziona Risorsa:
              </label>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="form-select w-full"
              >
                <option value="">Seleziona una risorsa...</option>
                {resources.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} ({resource.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ore Straordinari Extra:
              </label>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={extraOvertimeHours}
                onChange={(e) => setExtraOvertimeHours(parseFloat(e.target.value) || 0)}
                className="form-input w-full"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ore straordinarie aggiuntive oltre al turno normale (opzionale)
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedResource('');
                  setExtraOvertimeHours(0);
                  setSelectedCell(null);
                }}
                className="btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={addShiftToCell}
                disabled={!selectedResource}
                className="btn btn-primary"
              >
                <Plus size={16} />
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Modal */}
      {showColorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Personalizza Colori Fasce Orarie
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {timeSlots.map(timeSlot => (
                <div key={timeSlot.id} className="flex items-center gap-3 p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{timeSlot.name}</div>
                    <div className="text-xs text-slate-600">
                      {timeSlot.start_time} - {timeSlot.end_time}
                    </div>
                  </div>
                  <input
                    type="color"
                    value={getTimeSlotColor(timeSlot.id)}
                    onChange={(e) => setTimeSlotColors(prev => ({
                      ...prev,
                      [timeSlot.id]: e.target.value
                    }))}
                    className="w-12 h-8 border border-slate-300 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => {
                  // Reset to default colors
                  const resetColors = {};
                  timeSlots.forEach((timeSlot, index) => {
                    resetColors[timeSlot.id] = defaultColors[index % defaultColors.length];
                  });
                  setTimeSlotColors(resetColors);
                }}
                className="btn btn-secondary"
              >
                Ripristina Default
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowColorModal(false)}
                  className="btn btn-secondary"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalSchedulingGrid;