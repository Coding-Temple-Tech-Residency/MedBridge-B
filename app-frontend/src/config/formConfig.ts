import type { FormField } from "../types/form";



export const FORM_CONFIG: Record<string, FormField[]> = {

    registration: [
        { name: "email", type: "text", label: "Email Address", required: true },
        { name: "password", type: "password", label: "Password", required: true },
        { name: "fullName", type: "text", label: "Full Name", required: true },
    ],

    login: [
        { name: "email", type: "text", label: "Email Address", required: true },
        { name: "password", type: "password", label: "Password", required: true },
    ],

    reminder: [
        {
            name: "reminder_type",
            type: "select",
            label: "Type",
            required: true,
            options: [
                { label: "💊 Medication", value: "medication" },
                { label: "🏥 Appointment", value: "appointment" },
                { label: "📝 Other", value: "other" },
            ],
        },
        {
            name: "title",
            type: "text",
            label: "Title",
            required: true,
        },
        {
            name: "startDate",
            type: "date",
            label: "Start Date",
            required: true,
        },
        {
            name: "startTime",
            type: "time",
            label: "Start Time",
            required: true,
        },
        {
            name: "endDate",
            type: "date",
            label: "End Date",
            required: true,
        },
        {
            name: "endTime",
            type: "time",
            label: "End Time",
            required: true,
        },
        {
            name: "notes",
            type: "textarea",
            label: "Instructions / Notes",
            required: false,
        },
    ],
    
    medication: [
        {
            name: "name",
            type: "text",
            label: "Medication Name",
            required: true,
        },
        {
            name: "dosage",
            type: "text",
            label: "Dosage (e.g., 500mg)",
            required: false,
        },
        {
            name: "frequency",
            type: "text",
            label: "Frequency (e.g., Once daily, Every 8 hours)",
            required: false,
        },
        {
            name: "route",
            type: "text",
            label: "Route (e.g., Oral, Topical)",
            required: false,
        },
        {
            name: "start_date",
            type: "date",
            label: "Start Date",
            required: true,
        },
        {
            name: "end_date",
            type: "date",
            label: "End Date",
            required: false,
        },
        {
            name: "prescribing_provider",
            type: "text",
            label: "Prescribing Provider",
            required: false,
        },
        {
            name: "reason",
            type: "text",
            label: "Reason / Condition",
            required: false,
        },
        {
            name: "notes",
            type: "textarea",
            label: "Instructions / Notes",
            required: false,
        },
    ],


}