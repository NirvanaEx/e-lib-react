import React from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "./auth.api";
import { useAuth } from "../../shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../shared/ui/ToastProvider";

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await login(values);
      setAuth(data.accessToken, data.user);
      navigate("/user/files");
    } catch (_err) {
      showToast({ message: "Login failed", severity: "error" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 2
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Sign in
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            margin="normal"
            label="Login"
            {...register("login")}
            error={!!errors.login}
            helperText={errors.login?.message}
          />
          <TextField
            fullWidth
            margin="normal"
            type="password"
            label="Password"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button fullWidth variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 2 }}>
            Sign in
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
