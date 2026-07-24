import { useQuery } from "@tanstack/react-query";
import { fetchPublicBranding } from "../../features/settings/app-settings.api";

// Site-wide customization (logo, login wallpaper, home hero carousel).
// Public endpoint, so the hook works on the login page too.
export function useBranding() {
  const { data } = useQuery({
    queryKey: ["public-branding"],
    queryFn: fetchPublicBranding,
    staleTime: 5 * 60 * 1000
  });
  return data;
}
