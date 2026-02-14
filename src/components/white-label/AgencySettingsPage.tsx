import React, { useState } from 'react';
import { useWhiteLabel } from '../../contexts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { 
  Palette, Globe, Mail, Phone, MapPin, Link as LinkIcon, 
  Building2, Save, Upload, Eye, Settings2 
} from 'lucide-react';
import { AgencySettings } from '../../types/white-label';

export function AgencySettingsPage() {
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

  const updateField = (field: keyof AgencySettings, value: any) => {
    setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateNestedField = (parent: keyof AgencySettings, field: string, value: any) => {
    setLocalSettings(prev => prev ? {
      ...prev,
      [parent]: { ...(prev[parent] as any), [field]: value }
    } : null);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Agency Settings</h1>
            <p className="text-muted-foreground">
              Customize your agency branding and white-label configuration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3 w-3" />
              {localSettings.plan}
            </Badge>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="white-label" className="gap-2">
              <Globe className="h-4 w-4" />
              White Label
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agency Information</CardTitle>
                <CardDescription>Basic information about your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agency Name</Label>
                    <Input
                      id="name"
                      value={localSettings.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={localSettings.slug}
                      onChange={(e) => updateField('slug', e.target.value)}
                      placeholder="your-agency"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
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
                <CardTitle>Brand Colors</CardTitle>
                <CardDescription>Customize your agency's color scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
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
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
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
                    <Label htmlFor="accentColor">Accent Color</Label>
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
                <CardTitle>Logo & Assets</CardTitle>
                <CardDescription>Upload your agency logo and branding assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-40 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50">
                      {localSettings.branding.logo ? (
                        <img src={localSettings.branding.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Logo
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
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>How clients can reach your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
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
                    <Label htmlFor="phone">Phone</Label>
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
                  <Label htmlFor="website">Website</Label>
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
                  <Label htmlFor="address">Address</Label>
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
                <CardTitle>White Label Configuration</CardTitle>
                <CardDescription>Customize the platform with your agency branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable White Label Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply your branding across the entire platform
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.whiteLabel.enabled}
                    onCheckedChange={(checked) => updateNestedField('whiteLabel', 'enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Hide Original Branding</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove all Strategy Hub branding from the platform
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.whiteLabel.hideOriginalBranding}
                    onCheckedChange={(checked) => updateNestedField('whiteLabel', 'hideOriginalBranding', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain</Label>
                  <Input
                    id="customDomain"
                    value={localSettings.whiteLabel.customDomain || ''}
                    onChange={(e) => updateNestedField('whiteLabel', 'customDomain', e.target.value)}
                    placeholder="strategy.youragency.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to configure DNS settings
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Access</CardTitle>
                <CardDescription>Manage which features are enabled for your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(localSettings.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      <p className="text-sm text-muted-foreground">
                        {key === 'pdfExport' && 'Export strategies as branded PDF reports'}
                        {key === 'clientPortal' && 'Give clients access to view their strategies'}
                        {key === 'apiAccess' && 'Integrate with external tools via API'}
                        {key === 'customTemplates' && 'Create and share custom campaign templates'}
                        {key === 'sso' && 'Single Sign-On integration'}
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
      </div>
    </div>
  );
}