import { toaster } from "@/components/ui/toaster";

interface ApiCallOptions {
  loadingTitle?: string;
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  onSuccessData?: (data: any) => void;
  suppressToast?: boolean; // falls man nur Fehler möchte
}

export async function apiCall<T = any>(
  input: RequestInfo | URL,
  init: RequestInit,
  opts: ApiCallOptions = {}
): Promise<T | null> {
  const {
    loadingTitle = "Bitte warten…",
    successTitle = "Erfolg",
    successDescription,
    errorTitle = "Fehler",
    errorDescription = "Aktion fehlgeschlagen",
    onSuccessData,
    suppressToast,
  } = opts;

  const loadingId = toaster.create({ title: loadingTitle, type: "loading" });
  try {
    const res = await fetch(input, init);
    let data: any = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    }
    if (!res.ok) {
      if (!suppressToast) {
        toaster.create({
          title: errorTitle,
            description: data?.message || errorDescription,
            type: "error",
          });
      }
      return null;
    }
    if (onSuccessData) onSuccessData(data);
    if (!suppressToast) {
      toaster.create({
        title: successTitle,
        description: successDescription,
        type: "success",
      });
    }
    return data as T;
  } catch (e: any) {
    if (!suppressToast) {
      toaster.create({ title: errorTitle, description: errorDescription, type: "error" });
    }
    return null;
  } finally {
    toaster.dismiss(loadingId);
  }
}
