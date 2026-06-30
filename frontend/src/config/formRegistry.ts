import type { FormField } from "../types/form";



export const FORM_CONFIG: Record<string, FormField[]> = {
    
    registration: [
        {name: "email", type:"text", label:"Email Address", required: true },
        {name: "password", type:"password", label:"Password", required: true },
        {name: "fullName", type:"text", label:"Full Name", required: true },
    ],

    login: [
        {name: "email", type: "text", label:"Email Address", required: true },
        {name: "password", type: "password", label:"Password", required: true },
    ],

}