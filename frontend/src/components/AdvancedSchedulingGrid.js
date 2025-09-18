import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedSchedulingGrid = ({ currentWeek, onWeekChange }) => {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [weekDates, setWeekDates] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [resourceStats, setResourceStats] = useState({});
  const [filterResource, setFilterResource] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Generate week dates with better formatting
  const generateWeekDates = useCallback((weekNumber, year) => {
    // Calculate the first day of the week (Monday)
    const firstDayOfYear = new Date(year, 0, 1);
    const daysFromFirstDayOfYear = (weekNumber - 1) * 7;
    const startOfWeek = new Date(firstDayOfYear.getTime() + daysFromFirstDayOfYear * 24 * 60 * 60 * 1000);
    
    // Adjust to Monday as start of week
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
        day: date.toLocaleDateString('it-IT', { weekday: 'short' }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString('it-IT', { month: 'short' }),
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return dates;
  }, []);

  // Generate week dates when week changes
  useEffect(() => {
    const dates = generateWeekDates(currentWeek.week, currentWeek.year);
    setWeekDates(dates);
  }, [currentWeek, generateWeekDates]);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, [currentWeek, token]);

  // Calculate statistics
  useEffect(() => {
    calculateResourceStats();
    detectConflicts();
  }, [shifts, resources]);

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

  const calculateResourceStats = useCallback(() => {
    const stats = {};
    resources.forEach(resource => {
      const resourceShifts = shifts.filter(s => s.resource_id === resource.id);
      const totalHours = resourceShifts.reduce((sum, shift) => sum + (shift.hours || 0), 0);
      const overtimeHours = resourceShifts.reduce((sum, shift) => sum + (shift.overtime_hours || 0), 0);
      
      stats[resource.id] = {
        totalHours,
        overtimeHours,
        shiftsCount: resourceShifts.length,
        isOverLimit: totalHours > resource.weekly_hour_limit,
        utilizationPercent: Math.round((totalHours / resource.weekly_hour_limit) * 100),
        efficiency: totalHours > 0 ? Math.round((totalHours / (resourceShifts.length * 8)) * 100) : 0
      };
    });
    setResourceStats(stats);
  }, [shifts, resources]);

  const detectConflicts = useCallback(() => {
    const conflictList = [];
    
    // Check for same resource, same date conflicts
    shifts.forEach((shift, index) => {
      const conflicting = shifts.slice(index + 1).find(s => 
        s.resource_id === shift.resource_id && s.date === shift.date
      );
      if (conflicting) {
        conflictList.push({
          type: 'duplicate',
          shift1: shift,
          shift2: conflicting,
          message: `${shift.resource?.name || 'Risorsa'} ha più turni nello stesso giorno (${shift.date})`
        });
      }
    });

    // Check for minimum rest hours violations
    shifts.forEach((shift, index) => {
      const resource = resources.find(r => r.id === shift.resource_id);
      if (!resource) return;

      const minRestHours = resource.min_rest_hours || 12;
      const shiftDate = new Date(shift.date);
      const shiftStartTime = shift.time_slot?.start_time;
      const shiftEndTime = shift.time_slot?.end_time;

      if (!shiftStartTime || !shiftEndTime) return;

      // Check other shifts from the same resource
      shifts.forEach((otherShift, otherIndex) => {
        if (index === otherIndex || otherShift.resource_id !== shift.resource_id) return;

        const otherDate = new Date(otherShift.date);
        const otherStartTime = otherShift.time_slot?.start_time;
        const otherEndTime = otherShift.time_slot?.end_time;

        if (!otherStartTime || !otherEndTime) return;

        // Create datetime objects for comparison
        const shiftStart = new Date(`${shift.date}T${shiftStartTime}`);
        let shiftEnd = new Date(`${shift.date}T${shiftEndTime}`);
        const otherStart = new Date(`${otherShift.date}T${otherStartTime}`);
        let otherEnd = new Date(`${otherShift.date}T${otherEndTime}`);

        // Handle overnight shifts
        if (shiftEnd <= shiftStart) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }
        if (otherEnd <= otherStart) {
          otherEnd.setDate(otherEnd.getDate() + 1);
        }

        // Calculate time between shifts
        const timeBetween1 = Math.abs((shiftStart - otherEnd) / (1000 * 60 * 60));
        const timeBetween2 = Math.abs((otherStart - shiftEnd) / (1000 * 60 * 60));
        const minTimeBetween = Math.min(timeBetween1, timeBetween2);

        if (minTimeBetween < minRestHours && minTimeBetween > 0) {
          conflictList.push({
            type: 'rest_hours',
            shift1: shift,
            shift2: otherShift,
            minRestHours,
            actualHours: minTimeBetween,
            message: `${resource.name}: solo ${minTimeBetween.toFixed(1)}h di riposo tra turni (minimo ${minRestHours}h)`
          });
        }
      });
    });

    setConflicts(conflictList);
  }, [shifts, resources]);

  const getShiftForCell = useCallback((resourceId, date, timeSlotId) => {
    return shifts.find(s => 
      s.resource_id === resourceId && 
      s.date === date && 
      s.time_slot_id === timeSlotId
    );
  }, [shifts]);

  const handleCellClick = async (resourceId, date, timeSlotId, event) => {
    // Prevent multiple clicks
    if (event.detail > 1) return;
    
    const existingShift = getShiftForCell(resourceId, date, timeSlotId);
    
    if (existingShift) {
      // Remove shift
      await deleteShift(existingShift.id);
    } else {
      // Add shift
      await createShift(resourceId, timeSlotId, date);
    }
  };

  const createShift = async (resourceId, timeSlotId, date) => {
    try {
      const response = await axios.post(`${API}/shifts`, {
        resource_id: resourceId,
        time_slot_id: timeSlotId,
        date: date,
        week_number: currentWeek.week,
        year: currentWeek.year
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add the shift with enriched data
      const resource = resources.find(r => r.id === resourceId);
      const timeSlot = timeSlots.find(ts => ts.id === timeSlotId);
      
      const enrichedShift = {
        ...response.data,
        resource,
        time_slot: timeSlot
      };

      setShifts(prev => [...prev, enrichedShift]);
      toast.success('Turno assegnato con successo');
    } catch (error) {
      console.error('Failed to create shift:', error);
      toast.error(error.response?.data?.detail || 'Errore nell\'assegnazione del turno');
    }
  };

  const deleteShift = async (shiftId) => {
    try {
      await axios.delete(`${API}/shifts/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShifts(prev => prev.filter(s => s.id !== shiftId));
      toast.success('Turno rimosso con successo');
    } catch (error) {
      console.error('Failed to delete shift:', error);
      toast.error('Errore nella rimozione del turno');
    }
  };

  const exportToJSON = () => {
    const data = {
      week: currentWeek.week,
      year: currentWeek.year,
      exported_at: new Date().toISOString(),
      period: {
        start_date: weekDates[0]?.date,
        end_date: weekDates[6]?.date
      },
      shifts: shifts.map(shift => ({
        resource_name: shift.resource?.name,
        resource_email: shift.resource?.email,
        date: shift.date,
        time_slot_name: shift.time_slot?.name,
        start_time: shift.time_slot?.start_time,
        end_time: shift.time_slot?.end_time,
        hours: shift.hours,
        overtime_hours: shift.overtime_hours
      })),
      summary: {
        total_shifts: shifts.length,
        total_hours: shifts.reduce((sum, s) => sum + (s.hours || 0), 0),
        total_overtime: shifts.reduce((sum, s) => sum + (s.overtime_hours || 0), 0),
        resources_used: [...new Set(shifts.map(s => s.resource_id))].length,
        coverage_percentage: Math.round((shifts.length / (resources.length * timeSlots.length * 7)) * 100)
      },
      conflicts: conflicts.map(c => c.message)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pianificazione_settimana_${currentWeek.week}_${currentWeek.year}.json`;
    a.click();
    
    window.URL.revokeObjectURL(url);
    toast.success('Pianificazione esportata in JSON');
  };

  // Filter resources based on search
  const filteredResources = useMemo(() => {
    let filtered = resources;
    
    if (filterResource) {
      filtered = filtered.filter(resource => 
        resource.name.toLowerCase().includes(filterResource.toLowerCase()) ||
        resource.email.toLowerCase().includes(filterResource.toLowerCase())
      );
    }
    
    if (showConflictsOnly) {
      const conflictResourceIds = new Set();
      conflicts.forEach(conflict => {
        conflictResourceIds.add(conflict.shift1.resource_id);
        conflictResourceIds.add(conflict.shift2.resource_id);
      });
      filtered = filtered.filter(resource => conflictResourceIds.has(resource.id));
    }
    
    return filtered;
  }, [resources, filterResource, showConflictsOnly, conflicts]);

  const getCellStyles = (shift, hasConflict, dateInfo) => {
    let baseClasses = "border border-slate-300 p-1 text-center cursor-pointer transition-all duration-200 ";
    
    if (dateInfo.isToday) {
      baseClasses += "ring-2 ring-blue-400 ";
    }
    
    if (dateInfo.isWeekend) {
      baseClasses += "bg-slate-50 ";
    }
    
    if (shift) {
      if (hasConflict) {
        baseClasses += "bg-red-100 hover:bg-red-200 text-red-800 ";
      } else if (shift.overtime_hours > 0) {
        baseClasses += "bg-amber-100 hover:bg-amber-200 text-amber-800 ";
      } else {
        baseClasses += "bg-green-100 hover:bg-green-200 text-green-800 ";
      }
    } else {
      baseClasses += "bg-white hover:bg-blue-50 hover:border-blue-400 ";
    }
    
    return baseClasses;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="loading"></div>
          <span className="text-slate-600">Caricamento pianificazione...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-slate-800">
            Pianificazione Avanzata
          </h3>
          <button
            onClick={fetchAllData}
            className="btn btn-secondary btn-sm"
            title="Aggiorna dati"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca risorsa..."
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="form-input pl-10 pr-4 py-2 text-sm w-48"
            />
          </div>
          
          <button
            onClick={() => setShowConflictsOnly(!showConflictsOnly)}
            className={`btn btn-sm ${showConflictsOnly ? 'btn-warning' : 'btn-secondary'}`}
          >
            <Filter size={16} />
            {showConflictsOnly ? 'Mostra Tutti' : 'Solo Conflitti'}
          </button>
          
          <div className="flex items-center gap-1">
            <button onClick={exportToJSON} className="btn btn-secondary btn-sm">
              <Download size={16} />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="card p-4 border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800 mb-2">
                ⚠️ {conflicts.length} Conflitti Rilevati
              </h4>
              <div className="space-y-1">
                {conflicts.slice(0, 3).map((conflict, index) => (
                  <p key={index} className="text-sm text-red-700">
                    • {conflict.message}
                  </p>
                ))}
                {conflicts.length > 3 && (
                  <p className="text-sm text-red-600 font-medium">
                    ... e altri {conflicts.length - 3} conflitti
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            <div>
              <p className="text-xs text-slate-600">Risorse</p>
              <p className="text-lg font-bold text-slate-800">{filteredResources.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-green-600" />
            <div>
              <p className="text-xs text-slate-600">Turni</p>
              <p className="text-lg font-bold text-slate-800">{shifts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-purple-600" />
            <div>
              <p className="text-xs text-slate-600">Ore Totali</p>
              <p className="text-lg font-bold text-slate-800">
                {shifts.reduce((sum, s) => sum + (s.hours || 0), 0)}h
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <div>
              <p className="text-xs text-slate-600">Straordinari</p>
              <p className="text-lg font-bold text-slate-800">
                {shifts.reduce((sum, s) => sum + (s.overtime_hours || 0), 0)}h
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <div>
              <p className="text-xs text-slate-600">Conflitti</p>
              <p className="text-lg font-bold text-slate-800">{conflicts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-teal-600" />
            <div>
              <p className="text-xs text-slate-600">Copertura</p>
              <p className="text-lg font-bold text-slate-800">
                {Math.round((shifts.length / (resources.length * timeSlots.length * 7)) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Scheduling Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white">
            {/* Header */}
            <thead>
              <tr>
                <th className="sticky left-0 bg-slate-200 border-r-2 border-slate-300 p-3 text-left font-bold min-w-[220px] z-10">
                  <div className="flex items-center gap-2">
                    <User size={18} />
                    Risorsa
                  </div>
                </th>
                {weekDates.map(dateInfo => (
                  <th key={dateInfo.date} className={`bg-slate-100 border border-slate-300 p-3 text-center min-w-[140px] ${
                    dateInfo.isToday ? 'bg-blue-100 font-bold' : ''
                  } ${dateInfo.isWeekend ? 'bg-slate-50' : ''}`}>
                    <div className="text-sm font-bold text-slate-800">
                      {dateInfo.day}
                    </div>
                    <div className="text-lg font-bold text-slate-700">
                      {dateInfo.dayNum}
                    </div>
                    <div className="text-xs text-slate-500">
                      {dateInfo.month}
                    </div>
                    {dateInfo.isToday && (
                      <div className="text-xs text-blue-600 font-semibold mt-1">
                        Oggi
                      </div>
                    )}
                  </th>
                ))}
                <th className="bg-slate-200 border border-slate-300 p-3 text-center min-w-[120px] font-bold">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={16} />
                    Totale
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {timeSlots.map(timeSlot => (
                <React.Fragment key={timeSlot.id}>
                  {/* Time Slot Header */}
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td colSpan={weekDates.length + 2} className="p-3 font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-slate-600" />
                        <span className="text-lg">{timeSlot.name}</span>
                        <span className="text-sm text-slate-500 ml-2">
                          ({timeSlot.start_time} - {timeSlot.end_time})
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Resource Rows for this Time Slot */}
                  {filteredResources.map((resource, resourceIndex) => {
                    const stats = resourceStats[resource.id] || {};
                    
                    return (
                      <tr key={`${timeSlot.id}-${resource.id}`} className={`hover:bg-slate-50 ${
                        resourceIndex % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                      }`}>
                        {/* Resource Info */}
                        <td className="sticky left-0 bg-white border-r-2 border-slate-300 p-3 z-10">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 truncate">{resource.name}</p>
                              <p className="text-xs text-slate-600 truncate">{resource.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  stats.isOverLimit 
                                    ? 'bg-red-100 text-red-700' 
                                    : stats.utilizationPercent > 80
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-green-100 text-green-700'
                                }`}>
                                  {stats.totalHours || 0}h/{resource.weekly_hour_limit}h
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right ml-2">
                              <div className="text-xs text-slate-500">
                                {stats.utilizationPercent || 0}%
                              </div>
                              {stats.shiftsCount > 0 && (
                                <div className="text-xs text-slate-400">
                                  {stats.shiftsCount} turni
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Day Cells */}
                        {weekDates.map(dateInfo => {
                          const shift = getShiftForCell(resource.id, dateInfo.date, timeSlot.id);
                          const hasConflict = conflicts.some(c => 
                            (c.shift1.resource_id === resource.id && c.shift1.date === dateInfo.date) ||
                            (c.shift2.resource_id === resource.id && c.shift2.date === dateInfo.date)
                          );
                          
                          return (
                            <td
                              key={dateInfo.date}
                              className={getCellStyles(shift, hasConflict, dateInfo)}
                              onClick={(e) => handleCellClick(resource.id, dateInfo.date, timeSlot.id, e)}
                              onMouseEnter={() => setHoveredCell(`${resource.id}-${dateInfo.date}-${timeSlot.id}`)}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={shift 
                                ? `${resource.name} - ${shift.hours}h${shift.overtime_hours > 0 ? ` (+${shift.overtime_hours}h straordinari)` : ''}\nClick per rimuovere`
                                : `Assegna ${resource.name} a ${timeSlot.name}\nClick per assegnare`
                              }
                            >
                              {shift ? (
                                <div className="text-sm">
                                  <div className="font-bold">
                                    {shift.hours}h
                                  </div>
                                  {shift.overtime_hours > 0 && (
                                    <div className="text-xs font-semibold">
                                      +{shift.overtime_hours}h
                                    </div>
                                  )}
                                  {hasConflict && (
                                    <AlertTriangle size={14} className="inline mt-1" />
                                  )}
                                </div>
                              ) : (
                                <div className={`text-4xl font-light transition-opacity ${
                                  hoveredCell === `${resource.id}-${dateInfo.date}-${timeSlot.id}` ? 'opacity-50' : 'opacity-0'
                                }`}>
                                  +
                                </div>
                              )}
                            </td>
                          );
                        })}
                        
                        {/* Total Hours Column */}
                        <td className="border border-slate-300 p-3 text-center bg-slate-100">
                          <div className="text-sm">
                            <div className="font-bold text-slate-800">
                              {stats.totalHours || 0}h
                            </div>
                            {stats.overtimeHours > 0 && (
                              <div className="text-xs text-amber-600 font-semibold">
                                +{stats.overtimeHours}h
                              </div>
                            )}
                            {stats.shiftsCount > 0 && (
                              <div className="text-xs text-slate-500 mt-1">
                                {stats.shiftsCount} turni
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="card p-6">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Eye size={18} />
          Legenda e Istruzioni
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded flex items-center justify-center">
              <span className="text-xs font-bold text-green-800">8h</span>
            </div>
            <span className="text-sm">Turno normale</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-amber-100 border-2 border-amber-300 rounded flex items-center justify-center">
              <span className="text-xs font-bold text-amber-800">+2h</span>
            </div>
            <span className="text-sm">Con straordinari</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded flex items-center justify-center">
              <AlertTriangle size={12} className="text-red-600" />
            </div>
            <span className="text-sm">Conflitto</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white border-2 border-slate-300 rounded flex items-center justify-center">
              <span className="text-xs text-slate-400">+</span>
            </div>
            <span className="text-sm">Disponibile</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
          <div>
            <h5 className="font-semibold text-slate-700 mb-2">💡 Come utilizzare:</h5>
            <ul className="space-y-1">
              <li>• <strong>Click</strong> su una cella per assegnare/rimuovere turni</li>
              <li>• <strong>Hover</strong> per vedere dettagli del turno</li>
              <li>• Le celle <strong>blu</strong> indicano il giorno corrente</li>
              <li>• I weekend hanno sfondo <strong>grigio chiaro</strong></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-slate-700 mb-2">⚠️ Indicatori:</h5>
            <ul className="space-y-1">
              <li>• <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Rosso</span> = Superamento limite orario</li>
              <li>• <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Giallo</span> = Utilizzo > 80%</li>
              <li>• <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Verde</span> = Utilizzo normale</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSchedulingGrid;