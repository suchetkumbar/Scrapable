import { useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  CheckCircle2,
  Globe,
  Play,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import heroBg from "@/assets/hero-bg.jpg";
import GlowInput from "@/components/GlowInput";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { apiBaseUrl, phaseLabel } from "@/lib/config";

const URL_STORAGE_KEY = "scrapable_phase0_url";

const Index = () => {
  const [savedUrl, setSavedUrl] = useState(
    () => localStorage.getItem(URL_STORAGE_KEY) || ""
  );
  const healthQuery = useBackendHealth();

  const backendLabel = healthQuery.isPending
    ? "Checking"
    : healthQuery.isSuccess
      ? "Connected"
      : "Offline";

  const playwrightLabel = healthQuery.isPending
    ? "Waiting"
    : healthQuery.data?.playwright.installed
      ? "Installed"
      : "Pending setup";

  const handleQueueUrl = (url: string) => {
    localStorage.setItem(URL_STORAGE_KEY, url);
    setSavedUrl(url);
    toast.success("URL saved for Phase 1", {
      description: "The target has been validated and stored locally.",
    });
  };

  return (
    <div className="min-h-screen bg-background bg-mesh relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="absolute top-20 left-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-glow-blue/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 px-6 py-16 md:py-20">
        <section className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {phaseLabel} foundation ready for frontend + backend work
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Scrapable</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The workspace is now split into dedicated frontend, backend, and
              shared layers with local API wiring, CORS setup, and Playwright
              runtime support prepared for Phase 1.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-12"
          >
            <GlowInput
              onSubmit={handleQueueUrl}
              placeholder="Paste a target URL to validate and save for Phase 1..."
              buttonLabel="Queue URL"
              loadingLabel="Saving..."
            />
            <p className="text-center text-xs text-muted-foreground mt-4">
              {savedUrl
                ? `Last validated target: ${savedUrl}`
                : "No target URL saved yet. Queue one now and it will be kept locally for the scraping phase."}
            </p>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-12"
          >
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Boxes className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Workspace Layout</h2>
              </div>
              <p className="text-2xl font-semibold text-foreground">Structured</p>
              <p className="text-sm text-muted-foreground mt-2">
                `frontend/`, `backend/`, and `shared/` are now separated for
                phase-by-phase development.
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Backend API</h2>
              </div>
              <p className="text-2xl font-semibold text-foreground">{backendLabel}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {healthQuery.isSuccess
                  ? `${healthQuery.data.service} is responding at ${apiBaseUrl}.`
                  : "Run the backend setup scripts, then start the API from the workspace root."}
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Play className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Playwright</h2>
              </div>
              <p className="text-2xl font-semibold text-foreground">{playwrightLabel}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {healthQuery.data?.playwright.browser
                  ? `Configured browser: ${healthQuery.data.playwright.browser}.`
                  : "Backend runtime will verify the Chromium install once setup is complete."}
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">CORS + Env</h2>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {healthQuery.data?.allowed_origins.length || 2} origins
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Shared environment values now control the frontend API base URL
                and backend origin allowlist.
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-[1.4fr,0.9fr] gap-6 mt-10"
          >
            <div className="glass-strong rounded-3xl p-6 md:p-7">
              <div className="flex items-center gap-3 mb-5">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Phase 0 Status</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p>Frontend and backend are now decoupled into dedicated top-level workspaces.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p>FastAPI exposes a health endpoint and backend runtime metadata through the shared API layer.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p>React now reads its API base URL from shared env configuration and can verify backend availability.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p>The root workspace can boot both services from one command once backend dependencies are installed.</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 md:p-7">
              <h2 className="text-xl font-semibold mb-5">Foundation Details</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">API Base URL</p>
                  <p className="font-mono text-foreground break-all">{apiBaseUrl}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Health Endpoint</p>
                  <p className="font-mono text-foreground">{apiBaseUrl}/system/health</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Playwright Path</p>
                  <p className="font-mono text-foreground break-all">
                    {healthQuery.data?.playwright.executable_path ||
                      "Available after Playwright setup runs."}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Unlock</p>
                  <p className="text-foreground">
                    Phase 1 will connect real Playwright scraping behind this
                    foundation.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </section>
      </main>
    </div>
  );
};

export default Index;
