import { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const today = new Date();

interface CalendarEvent {
    id: number | string;
    title: string;
    start: Date;
    end: Date;
    type: 'medication' | 'appointment' | 'other';
    notes?: string;
}

const initialEvents: CalendarEvent[] = [
    {
        id: 1,
        title: "Follow-up Appointment",
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        type: 'appointment'
    }
];

export default function CalendarView() {
    const [currentView, setCurrentView] = useState<View>(Views.MONTH);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | number | null>(null);
    const [eventTitle, setEventTitle] = useState('');
    const [eventType, setEventType] = useState<'medication' | 'appointment' | 'other'>('medication');
    const [eventNotes, setEventNotes] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');

    // Triggered when selecting an empty slot
    const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        setIsEditing(false);
        setEditingEventId(null);
        setStartDate(format(start, 'yyyy-MM-dd'));
        setStartTime(format(start, 'HH:mm'));
        setEndDate(format(end, 'yyyy-MM-dd'));
        setEndTime(format(end, 'HH:mm'));
        setIsModalOpen(true);
    };

    // Triggered when clicking/editing an existing event (from Agenda or Grid)
    const handleSelectEvent = (event: CalendarEvent) => {
        setIsEditing(true);
        setEditingEventId(event.id);
        setEventTitle(event.title);
        setEventType(event.type);
        setEventNotes(event.notes || '');
        setStartDate(format(event.start, 'yyyy-MM-dd'));
        setStartTime(format(event.start, 'HH:mm'));
        setEndDate(format(event.end, 'yyyy-MM-dd'));
        setEndTime(format(event.end, 'HH:mm'));
        setIsModalOpen(true);
    };

    // Save or Update Event
    const handleSaveEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle.trim()) return;

        const startCombined = new Date(`${startDate}T${startTime}`);
        const endCombined = new Date(`${endDate}T${endTime}`);

        if (isEditing && editingEventId) {
            // Update existing event
            setEvents(prev => prev.map(evt => 
                evt.id === editingEventId 
                    ? { ...evt, title: eventTitle, type: eventType, start: startCombined, end: endCombined, notes: eventNotes }
                    : evt
            ));
        } else {
            // Create new event
            const newEvent: CalendarEvent = {
                id: crypto.randomUUID(),
                title: eventTitle,
                start: startCombined,
                end: endCombined,
                type: eventType,
                notes: eventNotes
            };
            setEvents((prev) => [...prev, newEvent]);
        }
        closeModal();
    };

    const handleDeleteEvent = () => {
        if (editingEventId) {
            setEvents(prev => prev.filter(evt => evt.id !== editingEventId));
            closeModal();
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingEventId(null);
        setEventTitle('');
        setEventType('medication');
        setEventNotes('');
    };

    // --- CUSTOM AGENDA COMPONENT INJECTION ---
    const customComponents = {
        agenda: {
            // Customize the Date Column in Agenda
            date: ({ day, label }: { day: Date; label: string }) => {
                const dayEvents = events.filter(
                    evt => format(evt.start, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                );

                return (
                    <button
                        style={agendaDateButtonStyle}
                        onClick={() => {
                            // If there are events on this day, edit the first one. Otherwise, add a new one.
                            if (dayEvents.length > 0) {
                                handleSelectEvent(dayEvents[0]);
                            } else {
                                handleSelectSlot({ start: day, end: day });
                            }
                        }}
                        title="Click to edit/add events on this day"
                    >
                        📝 {label}
                    </button>
                );
            },
            // Customize the Event row content
            event: ({ event }: { event: CalendarEvent }) => (
                <span 
                    onClick={() => handleSelectEvent(event)} 
                    style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}
                >
                    {event.title} {event.notes ? `(${event.notes})` : ''}
                </span>
            )
        }
    };

    return (
        <div style={{ height: '100%', width: '100%', padding: '24px', position: 'relative',boxSizing: 'border-box' }}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                view={currentView}
                date={currentDate}
                onView={(view) => setCurrentView(view)}
                onNavigate={(date) => setCurrentDate(date)}
                selectable={true}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                components={customComponents} // <-- Inject Custom Renderers
            />

            {/* Custom Modal Dialog */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>
                            {isEditing ? 'Edit Entry' : 'Add Event or Medication'}
                        </h3>
                        <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* ... (Keep form inputs for Type, Title, Dates, Times, and Notes the same as your previous structure) ... */}
                            <div>
                                <label style={labelStyle}>Type</label>
                                <select value={eventType} onChange={(e) => setEventType(e.target.value as any)} style={inputStyle}>
                                    <option value="medication">💊 Medication</option>
                                    <option value="appointment">🏥 Appointment</option>
                                    <option value="other">🗓️ Other</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Title</label>
                                <input type="text" required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={inputStyle} />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}><label style={labelStyle}>Start Date</label><input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} /></div>
                                <div style={{ flex: 1 }}><label style={labelStyle}>Start Time</label><input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} /></div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}><label style={labelStyle}>End Date</label><input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} /></div>
                                <div style={{ flex: 1 }}><label style={labelStyle}>End Time</label><input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} /></div>
                            </div>

                            <div>
                                <label style={labelStyle}>Notes</label>
                                <textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} style={{ ...inputStyle, height: '60px', resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                {isEditing ? (
                                    <button type="button" onClick={handleDeleteEvent} style={deleteButtonStyle}>
                                        Delete
                                    </button>
                                ) : <div />}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={closeModal} style={cancelButtonStyle}>Cancel</button>
                                    <button type="submit" style={saveButtonStyle}>Save</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Styles ---
const agendaDateButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    font: 'inherit',
    textAlign: 'left'
};

const deleteButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 500
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    color: '#1f2937',
    fontFamily: 'sans-serif'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '4px',
    color: '#4b5563'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.95rem',
    boxSizing: 'border-box'
};

const cancelButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#4b5563',
    cursor: 'pointer',
    fontWeight: 500
};

const saveButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 500
};
