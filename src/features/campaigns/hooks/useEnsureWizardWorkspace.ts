import { useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCampaignWizardStore } from "../stores/useCampaignWizardStore";

/**
 * Ensures the persisted campaign wizard state belongs to the currently
 * active workspace. If a mismatch is detected (e.g. user switched workspace
 * since the wizard state was saved to localStorage), the wizard state is
 * reset to prevent draft data from leaking across workspace boundaries.
 *
 * Should be called from any component that reads from useCampaignWizardStore
 * after the user might have switched workspace — currently:
 * - CampaignWizardPage (the wizard itself)
 * - ActiveCampaignsPage (renders DraftCampaignBanner from store state)
 *
 * Defense-in-depth alongside clearAllStorage() in OrganizationSwitcher,
 * which also clears the persisted wizard key on switch.
 */
export function useEnsureWizardWorkspace() {
  const { workspaceId, isLoading } = useWorkspace();

  useEffect(() => {
    if (isLoading || !workspaceId) return;

    const store = useCampaignWizardStore.getState();
    const storedWorkspaceId = store.workspaceId;

    if (storedWorkspaceId && storedWorkspaceId !== workspaceId) {
      // Workspace mismatch — wipe wizard state to prevent cross-workspace
      // draft leakage. After reset, stamp the new workspace fingerprint.
      store.resetWizard();
      useCampaignWizardStore.getState().setWorkspaceId(workspaceId);
      return;
    }

    if (storedWorkspaceId !== workspaceId) {
      // First-time stamp (storedWorkspaceId was null).
      store.setWorkspaceId(workspaceId);
    }
  }, [workspaceId, isLoading]);
}
