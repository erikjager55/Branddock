import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWhiteLabel } from '../../contexts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import {
  Palette, Globe, Mail, Phone, MapPin,
  Building2, Save, Upload, Settings2, Briefcase
} from 'lucide-react';
import { PageHeader } from '../shared/PageHeader';
import { PageContainer } from '../shared/PageContainer';
import { useUIState } from '../../contexts/UIStateContext';
import { AgencySettings } from '../../types/white-label';
import { WorkspacesTab } from '@/features/settings/components/workspaces/WorkspacesTab';

export function AgencySettingsPage() {
  const { t } = useTranslation('white-label');
  const { setActiveSection } = useUIState();
  const { agencySettings, updateAgencySettings } = useWhiteLabel();
  const [localSettings, setLocalSettings] = useState(agencySettings);
  const [isSaving, setIsSaving] = useState(false);

  if (!localSettings) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateAgencySettings(localSettings);
    setIsSaving(false);
  };

  const updateField = <K extends keyof AgencySettings>(field: K, value: AgencySettings[K]) => {
    setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateNestedField = (parent: 'branding' | 'contact' | 'whiteLabel' | 'features', field: string, value: unknown) => {
    setLocalSettings(prev => prev ? {
      ...prev,
      [parent]: { ...(prev[parent] as Record<string, unknown>), [field]: value }
    } : null);
  };

  return (
    <PageContainer>
      <PageHeader
        icon={Building2}
        iconBg="bg-gray-100"
        iconColor="text-gray-600"
        title={t('header.title')}
        subtitle={t('header.subtitle')}
        backLabel={t('header.back')}
        onBack={() => setActiveSection('dashboard')}
        primaryAction={{
          label: isSaving ? t('header.saving') : t('header.save'),
          icon: Save,
          onClick: handleSave,
          disabled: isSaving,
        }}
      />

        <Tabs defaultValue="workspaces" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="workspaces" className="gap-2">
              <Briefcase className="h-4 w-4" />
              {t('tabs.workspaces')}
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              {t('tabs.branding')}
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <Mail className="h-4 w-4" />
              {t('tabs.contact')}
            </TabsTrigger>
            <TabsTrigger value="white-label" className="gap-2">
              <Globe className="h-4 w-4" />
              {t('tabs.whiteLabel')}
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {t('tabs.features')}
            </TabsTrigger>
          </TabsList>

          {/* Workspaces Tab */}
          <TabsContent value="workspaces" className="space-y-6">
            <WorkspacesTab />
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('branding.info.title')}</CardTitle>
                <CardDescription>{t('branding.info.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('branding.info.nameLabel')}</Label>
                    <Input
                      id="name"
                      value={localSettings.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">{t('branding.info.slugLabel')}</Label>
                    <Input
                      id="slug"
                      value={localSettings.slug}
                      onChange={(e) => updateField('slug', e.target.value)}
                      placeholder={t('branding.info.slugPlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('branding.info.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    value={localSettings.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('branding.colors.title')}</CardTitle>
                <CardDescription>{t('branding.colors.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">{t('branding.colors.primary')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="primaryColor"
                        value={localSettings.branding.primaryColor}
                        onChange={(e) => updateNestedField('branding', 'primaryColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={localSettings.branding.primaryColor}
                        onChange={(e) => updateNestedField('branding', 'primaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">{t('branding.colors.secondary')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="secondaryColor"
                        value={localSettings.branding.secondaryColor}
                        onChange={(e) => updateNestedField('branding', 'secondaryColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={localSettings.branding.secondaryColor}
                        onChange={(e) => updateNestedField('branding', 'secondaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">{t('branding.colors.accent')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="accentColor"
                        value={localSettings.branding.accentColor}
                        onChange={(e) => updateNestedField('branding', 'accentColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={localSettings.branding.accentColor}
                        onChange={(e) => updateNestedField('branding', 'accentColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('branding.logo.title')}</CardTitle>
                <CardDescription>{t('branding.logo.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('branding.logo.primaryLabel')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-40 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50">
                      {localSettings.branding.logo ? (
                        <img src={localSettings.branding.logo} alt={t('branding.logo.alt')} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      {t('branding.logo.upload')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('contact.title')}</CardTitle>
                <CardDescription>{t('contact.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('contact.email')}</Label>
                    <div className="flex gap-2">
                      <Mail className="h-5 w-5 mt-2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={localSettings.contact.email}
                        onChange={(e) => updateNestedField('contact', 'email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('contact.phone')}</Label>
                    <div className="flex gap-2">
                      <Phone className="h-5 w-5 mt-2 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={localSettings.contact.phone || ''}
                        onChange={(e) => updateNestedField('contact', 'phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t('contact.website')}</Label>
                  <div className="flex gap-2">
                    <Globe className="h-5 w-5 mt-2 text-muted-foreground" />
                    <Input
                      id="website"
                      value={localSettings.contact.website || ''}
                      onChange={(e) => updateNestedField('contact', 'website', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t('contact.address')}</Label>
                  <div className="flex gap-2">
                    <MapPin className="h-5 w-5 mt-2 text-muted-foreground" />
                    <Textarea
                      id="address"
                      value={localSettings.contact.address || ''}
                      onChange={(e) => updateNestedField('contact', 'address', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* White Label Tab */}
          <TabsContent value="white-label" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('whiteLabel.title')}</CardTitle>
                <CardDescription>{t('whiteLabel.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('whiteLabel.enableLabel')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('whiteLabel.enableHelp')}
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.whiteLabel.enabled}
                    onCheckedChange={(checked) => updateNestedField('whiteLabel', 'enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('whiteLabel.hideLabel')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('whiteLabel.hideHelp')}
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.whiteLabel.hideOriginalBranding}
                    onCheckedChange={(checked) => updateNestedField('whiteLabel', 'hideOriginalBranding', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customDomain">{t('whiteLabel.domainLabel')}</Label>
                  <Input
                    id="customDomain"
                    value={localSettings.whiteLabel.customDomain || ''}
                    onChange={(e) => updateNestedField('whiteLabel', 'customDomain', e.target.value)}
                    placeholder={t('whiteLabel.domainPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('whiteLabel.domainHelp')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('features.title')}</CardTitle>
                <CardDescription>{t('features.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(localSettings.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="capitalize">{t(`features.names.${key}`, { defaultValue: key.replace(/([A-Z])/g, ' $1').trim() })}</Label>
                      <p className="text-sm text-muted-foreground">
                        {key === 'pdfExport' && t('features.descriptions.pdfExport')}
                        {key === 'clientPortal' && t('features.descriptions.clientPortal')}
                        {key === 'apiAccess' && t('features.descriptions.apiAccess')}
                        {key === 'customTemplates' && t('features.descriptions.customTemplates')}
                        {key === 'sso' && t('features.descriptions.sso')}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => updateNestedField('features', key, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageContainer>
  );
}
