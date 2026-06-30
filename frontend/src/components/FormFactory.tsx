import { useLogin } from "../api/auth.queries";
import { useRegister } from "../api/auth.queries";
import { FORM_CONFIG } from "../config/formRegistry";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { useForm } from "../hooks/useForm";
import type { LoginRequest, RegisterRequest } from "../types/auth";
import type { FormFactoryConfig } from "../types/form";





export const FormFactory = ({ config }: FormFactoryConfig) => {

    const fields = FORM_CONFIG[config];
    const { values,
        touched,
        errors,
        changeHandler,
        blurHandler,
    } = useForm(fields);

    const { mutate: login, isPending: isLogingIn, error: loginError } = useLogin();
    const { mutate: register, isPending: isRegistering, error: registerError } = useRegister()
    const activeError = config === "login" ? loginError : registerError
    const isLoading = config === "login" ? isLogingIn : isRegistering;
    const { closeModal } = useModal();
    const { login: saveSession } = useAuth();

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        switch (config) {
            case "login":
                login(values as unknown as LoginRequest, {
                    onSuccess: (data) => {
                        if(data.access_token){
                            saveSession(data.access_token, data.user_id)
                        }
                    }
                });
                break;

            case "registration":
                register(values as unknown as RegisterRequest, {
                    onSuccess: () => {
                        closeModal();
                    }
                });
                break;

            default:
                break;
        }
    }



    return (
        <form className="form" onSubmit={handleSubmit}>
            {activeError && (
                <div className="server-error-banner" style={{ color: "red", marginBottom: "16px", fontWeight: "bold" }}>
                    ⚠️ {activeError.message}
                </div>
            )}

            {fields.map((field) => (
                <div
                    key={field.name}
                    className="form-field"
                >
                    <div className="label">
                        <label htmlFor={field.name}>{field.label}</label>

                    </div>
                    <div className="input">
                        {field.type === "select" ? (
                            <select
                                id={field.name}
                                name={field.name}
                                value={values[field.name] || ""}
                                onChange={changeHandler}
                                onBlur={blurHandler}
                                disabled={isLoading}
                            >
                                {field.options?.map((option) => (
                                    <option key={option.label} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                id={field.name}
                                type={field.type}
                                name={field.name}
                                value={values[field.name] || ""}
                                onChange={changeHandler}
                                onBlur={blurHandler}
                                disabled={isLoading}
                            />

                        )}

                    </div>
                    {
                        touched[field.name] && errors[field.name] &&
                        <span className="error">Error: {errors[field.name]} </span>
                    }
                </div>
            ))}
            <button
                type="submit"
                className="submit-button"
                disabled={isLoading}>
                {isLoading ? "Authenticating..." : config === "login" ? "Sign In" : "Register"}
            </button>
        </form>

    )


}