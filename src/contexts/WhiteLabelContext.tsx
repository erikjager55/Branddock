import React, { createContext, useContext, useState, useCallback } from 'react';
import { AgencySettings, Client, PDFExportSettings } from '../types/white-label';

interface WhiteLabelContextType {
  // Agency Settings
  agencySettings: AgencySettings | null;
  updateAgencySettings: (settings: Partial<AgencySettings>) => void;
  
  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projectsCount' | 'strategiesCount'>) => void;
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  removeClient: (clientId: string) => void;
  
  // PDF Export
  defaultPDFSettings: PDFExportSettings;
  updatePDFSettings: (settings: Partial<PDFExportSettings>) => void;
  
  // White Label Mode
  isWhiteLabelMode: boolean;
  toggleWhiteLabelMode: () => void;
}

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
    id: 'agency-1',
    name: 'Creative Minds Agency',
    slug: 'creative-minds',
    description: 'Full-service digital marketing and strategy consultancy',
    
    branding: {
      logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=80&fit=crop',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor: '#ec4899'
    },
    
    contact: {
      email: 'hello@creativeminds.agency',
      phone: '+1 (555) 123-4567',
      website: 'https://creativeminds.agency',
      address: '123 Innovation Street, San Francisco, CA 94102'
    },
    
    whiteLabel: {
      enabled: true,
      hideOriginalBranding: true,
      customDomain: 'strategy.creativeminds.agency'
    },
    
    features: {
      pdfExport: true,
      clientPortal: true,
      apiAccess: true,
      customTemplates: true,
      sso: false
    },
    
    plan: 'professional',
    maxClients: 25,
    maxUsers: 10,
    
    createdAt: '2024-01-01',
    updatedAt: new Date().toISOString()
  });

  const [clients, setClients] = useState<Client[]>([
    {
      id: 'client-1',
      agencyId: 'agency-1',
      name: 'TechStart Inc.',
      email: 'contact@techstart.com',
      logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      industry: 'Technology',
      website: 'https://techstart.com',
      contactPerson: {
        name: 'Alex Johnson',
        email: 'alex@techstart.com',
        phone: '+1 (555) 234-5678'
      },
      branding: {
        primaryColor: '#3b82f6',
        logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop'
      },
      status: 'active',
      portalAccess: true,
      projectsCount: 3,
      strategiesCount: 12,
      lastActivity: '2024-12-26T14:30:00Z',
      createdAt: '2024-03-15',
      updatedAt: '2024-12-26T14:30:00Z'
    },
    {
      id: 'client-2',
      agencyId: 'agency-1',
      name: 'GreenEarth Organics',
      email: 'info@greenearth.com',
      logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=100&h=100&fit=crop',
      industry: 'Consumer Goods',
      website: 'https://greenearth.com',
      contactPerson: {
        name: 'Maria Garcia',
        email: 'maria@greenearth.com'
      },
      branding: {
        primaryColor: '#10b981'
      },
      status: 'active',
      portalAccess: true,
      projectsCount: 2,
      strategiesCount: 8,
      lastActivity: '2024-12-25T09:15:00Z',
      createdAt: '2024-04-01',
      updatedAt: '2024-12-25T09:15:00Z'
    },
    {
      id: 'client-3',
      agencyId: 'agency-1',
      name: 'FinanceFlow Solutions',
      email: 'hello@financeflow.com',
      industry: 'Finance',
      website: 'https://financeflow.com',
      contactPerson: {
        name: 'Robert Chen',
        email: 'robert@financeflow.com',
        phone: '+1 (555) 345-6789'
      },
      status: 'active',
      portalAccess: false,
      projectsCount: 1,
      strategiesCount: 5,
      lastActivity: '2024-12-20T16:45:00Z',
      createdAt: '2024-05-10',
      updatedAt: '2024-12-20T16:45:00Z'
    }
  ]);

  const [defaultPDFSettings, setDefaultPDFSettings] = useState<PDFExportSettings>({
    template: 'professional',
    includeAgencyBranding: true,
    includeClientBranding: true,
    includeCoverPage: true,
    includeTableOfContents: true,
    includeExecutiveSummary: true,
    pageNumbering: true,
    colorScheme: 'color'
  });

  const [isWhiteLabelMode, setIsWhiteLabelMode] = useState(false);

  const updateAgencySettings = useCallback((updates: Partial<AgencySettings>) => {
    setAgencySettings(prev => prev ? {
      ...prev,
      ...updates,
      branding: updates.branding ? { ...prev.branding, ...updates.branding } : prev.branding,
      contact: updates.contact ? { ...prev.contact, ...updates.contact } : prev.contact,
      whiteLabel: updates.whiteLabel ? { ...prev.whiteLabel, ...updates.whiteLabel } : prev.whiteLabel,
      features: updates.features ? { ...prev.features, ...updates.features } : prev.features,
      updatedAt: new Date().toISOString()
    } : null);
  }, []);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projectsCount' | 'strategiesCount'>) => {
    const newClient: Client = {
      ...clientData,
      id: `client-${Date.now()}`,
      projectsCount: 0,
      strategiesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setClients(prev => [...prev, newClient]);
  }, []);

  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    setClients(prev => 
      prev.map(client => 
        client.id === clientId 
          ? { ...client, ...updates, updatedAt: new Date().toISOString() }
          : client
      )
    );
  }, []);

  const removeClient = useCallback((clientId: string) => {
    setClients(prev => prev.filter(client => client.id !== clientId));
  }, []);

  const updatePDFSettings = useCallback((updates: Partial<PDFExportSettings>) => {
    setDefaultPDFSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleWhiteLabelMode = useCallback(() => {
    setIsWhiteLabelMode(prev => !prev);
  }, []);

  return (
    <WhiteLabelContext.Provider
      value={{
        agencySettings,
        updateAgencySettings,
        clients,
        addClient,
        updateClient,
        removeClient,
        defaultPDFSettings,
        updatePDFSettings,
        isWhiteLabelMode,
        toggleWhiteLabelMode
      }}
    >
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext);
  if (!context) {
    throw new Error('useWhiteLabel must be used within WhiteLabelProvider');
  }
  return context;
}
