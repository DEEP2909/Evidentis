export type AdvocateRole =
  | "admin"
  | "senior_advocate"
  | "partner"
  | "junior_advocate"
  | "advocate"
  | "paralegal"
  | "client";

export interface RoleCapabilities {
  canAccessAdmin: boolean;
  canAccessBilling: boolean;
  canAccessAnalytics: boolean;
  canAccessAllMatters: boolean;
  canAccessTemplates: boolean;
  canAccessBareActs: boolean;
  canAccessNyayAssist: boolean;
  canAccessResearch: boolean;
  canCreateMatter: boolean;
  canArchiveMatter: boolean;
  canShareMatter: boolean;
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canExportDocuments: boolean;
  canRunAIAnalysis: boolean;
  canApproveRedlines: boolean;
  canInviteMembers: boolean;
  canChangeRoles: boolean;
  canManagePlaybooks: boolean;
  dashboardKpiSet: "admin" | "senior" | "junior" | "paralegal";
}

export const ROLE_CAPABILITIES: Record<AdvocateRole, RoleCapabilities> = {
  admin: {
    canAccessAdmin: true,
    canAccessBilling: true,
    canAccessAnalytics: true,
    canAccessAllMatters: true,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: true,
    canArchiveMatter: true,
    canShareMatter: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: true,
    canInviteMembers: true,
    canChangeRoles: true,
    canManagePlaybooks: true,
    dashboardKpiSet: "admin",
  },
  senior_advocate: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: true,
    canAccessAllMatters: true,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: true,
    canArchiveMatter: true,
    canShareMatter: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: true,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: true,
    dashboardKpiSet: "senior",
  },
  partner: {
    canAccessAdmin: false,
    canAccessBilling: true,
    canAccessAnalytics: true,
    canAccessAllMatters: true,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: true,
    canArchiveMatter: true,
    canShareMatter: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: true,
    canInviteMembers: true,
    canChangeRoles: false,
    canManagePlaybooks: true,
    dashboardKpiSet: "senior",
  },
  junior_advocate: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "junior",
  },
  advocate: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "junior",
  },
  paralegal: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: false,
    canAccessBareActs: false,
    canAccessNyayAssist: false,
    canAccessResearch: false,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canExportDocuments: false,
    canRunAIAnalysis: false,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "paralegal",
  },
  client: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: false,
    canAccessBareActs: false,
    canAccessNyayAssist: false,
    canAccessResearch: false,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canExportDocuments: false,
    canRunAIAnalysis: false,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "paralegal",
  },
};

export function getCaps(role: AdvocateRole): RoleCapabilities {
  return ROLE_CAPABILITIES[role] ?? ROLE_CAPABILITIES.junior_advocate;
}
