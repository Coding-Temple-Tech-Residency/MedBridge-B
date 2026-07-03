import {useState} from 'react';
import {Calendar, dateFnsLocalizer, Views, type View} from 'react-big-calendar';
import {format, parse, startOfWeek, getDay} from 'date-fns';
import {enUS} from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'en-US': enUS,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales
});

const today = new Date();

const dummyEvents = [
    {
        id: 1,
        title: "Follow-up Appointment",
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
    },
    {
        id: 2,
        title: "Lunch",
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0),
    },
];

export default function CalendarView() {

    const [currentView, setCurrentView] = useState<View>(Views.MONTH);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    return (
        <div style={{ height: '100%', width: '100%'}}>
            <Calendar
                localizer={localizer}
                events={dummyEvents}
                startAccessor="start"
                endAccessor="end"
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                view={currentView}
                date={currentDate}
                onView={(view) => setCurrentView(view)}
                onNavigate={(date) => setCurrentDate(date)}
            />
        </div>
    );
}
