import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InteractiveSchedulingGrid = ({ currentWeek, onWeekChange }) => {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [draggedResource, setDraggedResource] = useState(null);
  const [weekDates, setWeekDates] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [resourceStats, setResourceStats] = useState({});

  // Generate week dates
  useEffect(() => {
    const dates = generateWeekDates(currentWeek.week, currentWeek.year);
    setWeekDates(dates);
  }, [currentWeek]);

  // Fetch data when week changes
  useEffect(() => {
    fetchAllData();
  }, [currentWeek, token]);

  // Calculate resource stats and conflicts
  useEffect(() => {
    calculateResourceStats();
    detectConflicts();
  }, [shifts, resources]);

  const generateWeekDates = (weekNumber, year) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysFromFirstDayOfYear = (weekNumber - 1) * 7;
    const startOfWeek = new Date(firstDayOfYear.getTime() + daysFromFirstDayOfYear * 24 * 60 * 60 * 1000);
    
    // Adjust to Monday as start of week
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(startOfWeek.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('it-IT', { weekday: 'short' }),
        dayNum: date.getDate()
      });
    }
    return dates;
  };

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
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const calculateResourceStats = useCallback(() => {
    const stats = {};
    resources.forEach(resource => {
      const resourceShifts = shifts.filter(s => s.resource_id === resource.id);
      const totalHours = resourceShifts.reduce((sum, shift) => sum + shift.hours, 0);
      const overtimeHours = resourceShifts.reduce((sum, shift) => sum + shift.overtime_hours, 0);
      
      stats[resource.id] = {
        totalHours,
        overtimeHours,
        shiftsCount: resourceShifts.length,
        isOverLimit: totalHours > resource.weekly_hour_limit,
        utilizationPercent: Math.round((totalHours / resource.weekly_hour_limit) * 100)
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

  const getShiftForCell = (resourceId, date, timeSlotId) => {
    return shifts.find(s => 
      s.resource_id === resourceId && 
      s.date === date && 
      s.time_slot_id === timeSlotId
    );
  };

  const handleCellClick = async (resourceId, date, timeSlotId) => {
    const existingShift = getShiftForCell(resourceId, date, timeSlotId);
    
    if (existingShift) {
      // Remove shift
      if (window.confirm('Rimuovere questo turno?')) {
        await deleteShift(existingShift.id);
      }
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
      toast.success('Turno creato con successo');
    } catch (error) {
      console.error('Failed to create shift:', error);
      toast.error(error.response?.data?.detail || 'Errore nella creazione del turno');
    }
  };

  const deleteShift = async (shiftId) => {
    try {
      await axios.delete(`${API}/shifts/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShifts(prev => prev.filter(s => s.id !== shiftId));
      toast.success('Turno eliminato con successo');
    } catch (error) {
      console.error('Failed to delete shift:', error);
      toast.error('Errore nell\'eliminazione del turno');
    }
  };

  const exportToJSON = () => {
    const data = {
      week: currentWeek.week,
      year: currentWeek.year,
      exported_at: new Date().toISOString(),
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
        total_hours: shifts.reduce((sum, s) => sum + s.hours, 0),
        total_overtime: shifts.reduce((sum, s) => sum + s.overtime_hours, 0),
        resources_used: [...new Set(shifts.map(s => s.resource_id))].length
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Griglia Pianificazione Interattiva
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
            onClick={exportToJSON}
            className="btn btn-secondary btn-sm"
          >
            <Download size={16} />
            JSON
          </button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="card p-4 border-warning-300 bg-warning-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-warning-600" />
            <h4 className="font-semibold text-warning-800">
              Conflitti Rilevati ({conflicts.length})
            </h4>
          </div>
          <div className="space-y-1">
            {conflicts.map((conflict, index) => (
              <p key={index} className="text-sm text-warning-700">
                {conflict.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Resource Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <User size={20} className="text-primary-600" />
            <div>
              <p className="text-sm text-slate-600">Risorse Attive</p>
              <p className="text-2xl font-bold text-slate-800">{resources.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-success-600" />
            <div>
              <p className="text-sm text-slate-600">Turni Programmati</p>
              <p className="text-2xl font-bold text-slate-800">{shifts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-slate-600">Ore Totali</p>
              <p className="text-2xl font-bold text-slate-800">
                {shifts.reduce((sum, s) => sum + s.hours, 0)}h
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning-600" />
            <div>
              <p className="text-sm text-slate-600">Straordinari</p>
              <p className="text-2xl font-bold text-slate-800">
                {shifts.reduce((sum, s) => sum + s.overtime_hours, 0)}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Scheduling Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header */}
            <thead>
              <tr>
                <th className="sticky left-0 bg-slate-100 border border-slate-200 p-3 text-left font-semibold min-w-[200px]">
                  Risorsa
                </th>
                {weekDates.map(dateInfo => (
                  <th key={dateInfo.date} className="bg-slate-100 border border-slate-200 p-3 text-center min-w-[120px]">
                    <div className="text-sm font-semibold text-slate-800">
                      {dateInfo.day}
                    </div>
                    <div className="text-xs text-slate-600">
                      {dateInfo.dayNum}
                    </div>
                  </th>
                ))}
                <th className="bg-slate-100 border border-slate-200 p-3 text-center min-w-[100px]">
                  Totale
                </th>
              </tr>
            </thead>
            
            <tbody>
              {timeSlots.map(timeSlot => (
                <React.Fragment key={timeSlot.id}>
                  {/* Time Slot Header */}
                  <tr className="bg-slate-50">
                    <td colSpan={weekDates.length + 2} className="border border-slate-200 p-2 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        {timeSlot.name} ({timeSlot.start_time} - {timeSlot.end_time})
                      </div>
                    </td>
                  </tr>
                  
                  {/* Resource Rows for this Time Slot */}
                  {resources.map(resource => {
                    const stats = resourceStats[resource.id] || {};
                    
                    return (
                      <tr key={`${timeSlot.id}-${resource.id}`} className="hover:bg-slate-50">
                        {/* Resource Info */}
                        <td className="sticky left-0 bg-white border border-slate-200 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800">{resource.name}</p>
                              <p className="text-xs text-slate-600">{resource.email}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs px-2 py-1 rounded ${
                                stats.isOverLimit ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'
                              }`}>
                                {stats.totalHours || 0}h/{resource.weekly_hour_limit}h
                              </div>
                              {stats.utilizationPercent && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {stats.utilizationPercent}%
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
                              className={`border border-slate-200 p-1 text-center cursor-pointer transition-colors ${
                                shift 
                                  ? hasConflict 
                                    ? 'bg-error-100 hover:bg-error-200' 
                                    : shift.overtime_hours > 0
                                      ? 'bg-warning-100 hover:bg-warning-200'
                                      : 'bg-primary-100 hover:bg-primary-200'
                                  : 'bg-white hover:bg-slate-100'
                              }`}
                              onClick={() => handleCellClick(resource.id, dateInfo.date, timeSlot.id)}
                              title={shift 
                                ? `${shift.hours}h${shift.overtime_hours > 0 ? ` (+${shift.overtime_hours}h)` : ''} - Click per rimuovere`
                                : 'Click per assegnare turno'
                              }
                            >
                              {shift && (
                                <div className="text-xs">
                                  <div className="font-semibold">
                                    {shift.hours}h
                                  </div>
                                  {shift.overtime_hours > 0 && (
                                    <div className="text-warning-700">
                                      +{shift.overtime_hours}h
                                    </div>
                                  )}
                                  {hasConflict && (
                                    <AlertTriangle size={12} className="inline text-error-600" />
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        
                        {/* Total Hours */}
                        <td className="border border-slate-200 p-3 text-center bg-slate-50">
                          <div className="text-sm font-semibold text-slate-800">
                            {stats.totalHours || 0}h
                          </div>
                          {stats.overtimeHours > 0 && (
                            <div className="text-xs text-warning-600">
                              +{stats.overtimeHours}h
                            </div>
                          )}
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

      {/* Legend */}
      <div className="card p-4">
        <h4 className="font-semibold text-slate-800 mb-3">Legenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary-100 border border-primary-300 rounded"></div>
            <span>Turno normale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-warning-100 border border-warning-300 rounded"></div>
            <span>Con straordinari</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-error-100 border border-error-300 rounded"></div>
            <span>Conflitto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-slate-300 rounded"></div>
            <span>Libero</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-2">
          💡 Clicca su una cella per assegnare/rimuovere turni
        </p>
      </div>
    </div>
  );
};

export default InteractiveSchedulingGrid;