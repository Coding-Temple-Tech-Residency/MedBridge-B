import type { FORM_CONFIG } from "../config/formRegistry";


export interface FormFactoryConfig {
    config: keyof typeof FORM_CONFIG;
};



export interface SelectField {
    label:string;
    value: string;
}

export interface FormField {
    name: string;
    type: string;
    label: string;
    required?: boolean;
    options?: SelectField[]

}



