import { useForm } from "react-hook-form";

export const useSignupForm = () => {
  const { control, handleSubmit, errors } = useForm();
  return { control, handleSubmit, errors };
};
