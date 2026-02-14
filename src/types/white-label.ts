// White Label & Agency Types

export interface AgencySettings {
  id: string;
  name: string;
  slug: string; // for custom domain
  description?: string;
  
  // Branding
  branding: {
    logo: string; // URL or base64
    logoLight?: string; // for dark backgrounds
    favicon?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    customCSS?: string;
  };
  
  // Contact
  contact: {
    email: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  
  // White Label Settings
  whiteLabel: {
    enabled: boolean;
    customDomain?: string;
    hideOriginalBranding: boolean;
    customFooter?: string;
    customEmailTemplate?: string;
  };
  
  // Features
  features: {
    pdfExport: boolean;
    clientPortal: boolean;
    apiAccess: boolean;
    customTemplates: boolean;
    sso: boolean;
  };
  
  // Subscription
  plan: 'starter' | 'professional' | 'enterprise';
  maxClients: number;
  maxUsers: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  logo?: string;
  industry?: string;
  website?: string;
  
  // Contact person
  contactPerson: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Client-specific branding for reports
  branding?: {
    primaryColor?: string;
    logo?: string;
  };
  
  // Access
  status: 'active' | 'paused' | 'archived';
  portalAccess: boolean;
  
  // Stats
  projectsCount: number;
  strategiesCount: number;
  lastActivity?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PDFExportSettings {
  template: 'professional' | 'minimal' | 'branded' | 'custom';
  includeAgencyBranding: boolean;
  includeClientBranding: boolean;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  includeExecutiveSummary: boolean;
  watermark?: string;
  customHeader?: string;
  customFooter?: string;
  pageNumbering: boolean;
  colorScheme: 'color' | 'grayscale';
}
