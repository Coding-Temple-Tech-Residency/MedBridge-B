import { useState } from "react";
import type { FormField } from "../types/form";



// helper function to initalize a empty slate for form config fields. 
const createInitialValues = (fields: FormField[]) =>
    fields.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {} as Record<string, string>);



// helper function rest field interaction of  user. 
const createInitialTouched = (fields: FormField[]) =>
    fields.reduce((acc, f) => ({ ...acc, [f.name]: false }), {} as Record<string, boolean>);


// Universal, configuration-driven state engine that dynamically tracks 
// input values,user interactions and validation errors from any form
// in the application without hardcoding specific fields. 
export const useForm = (fieldList: FormField[]) => {

    const [values, setValues] = useState(() => createInitialValues(fieldList))
    const [touched, setTouched] = useState(() => createInitialTouched(fieldList))
    const [errors, setErrors] = useState<Record<string, string>>({});




    const changeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setValues((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        setTouched((prev) => ({
            ...prev,
            [name]: true
        }))
    }


    //handler that resets all form field states. 
    const resetHandler = () => {
        setValues(createInitialValues(fieldList))
        setTouched(createInitialTouched(fieldList))
        setErrors({})
    }




    return { values, setValues, touched, errors, changeHandler, blurHandler, resetHandler }

}