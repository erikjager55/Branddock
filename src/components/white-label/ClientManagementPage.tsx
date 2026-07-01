import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWhiteLabel } from '../../contexts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Plus, Building2, Mail, Phone, Globe, ExternalLink, 
  MoreVertical, Edit2, Trash2, Eye, FileText, Calendar 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Client } from '../../types/white-label';
import { useFormat } from '@/lib/ui-i18n/format';

export function ClientManagementPage() {
  const { t } = useTranslation('white-label');
  const { formatRelative } = useFormat();
  const { clients, addClient, updateClient, removeClient } = useWhiteLabel();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const activeClients = clients.filter(c => c.status === 'active');
  const pausedClients = clients.filter(c => c.status === 'paused');

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">{t('clients.title')}</h1>
            <p className="text-muted-foreground">
              {t('clients.subtitle')}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('clients.addClient')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('clients.stats.totalClients')}</CardDescription>
              <CardTitle className="text-3xl">{clients.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('clients.stats.active')}</CardDescription>
              <CardTitle className="text-3xl text-green-600">{activeClients.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('clients.stats.totalProjects')}</CardDescription>
              <CardTitle className="text-3xl">
                {clients.reduce((sum, c) => sum + c.projectsCount, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('clients.stats.totalStrategies')}</CardDescription>
              <CardTitle className="text-3xl">
                {clients.reduce((sum, c) => sum + c.strategiesCount, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Clients Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={client.logo} />
                      <AvatarFallback>
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription className="text-xs">{client.industry}</CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedClient(client)}>
                        <Eye className="h-3 w-3 mr-2" />
                        {t('clients.card.viewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="h-3 w-3 mr-2" />
                        {t('clients.card.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(t('clients.card.removeConfirm', { name: client.name }))) {
                            removeClient(client.id);
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {t('clients.card.remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary">
                        {client.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    <div>{t('clients.card.projects', { count: client.projectsCount })}</div>
                    <div>{t('clients.card.strategies', { count: client.strategiesCount })}</div>
                  </div>
                  <Badge variant={
                    client.status === 'active' ? 'default' : 
                    client.status === 'paused' ? 'secondary' : 'outline'
                  }>
                    {client.status}
                  </Badge>
                </div>

                {client.lastActivity && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('clients.card.lastActive')} {formatRelative(new Date(client.lastActivity))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Client Modal */}
        <AddClientModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={(clientData) => {
            addClient(clientData);
            setShowAddModal(false);
          }}
        />

        {/* Client Detail Modal */}
        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </div>
    </div>
  );
}

function AddClientModal({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projectsCount' | 'strategiesCount'>) => void;
}) {
  const { t } = useTranslation('white-label');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    industry: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      agencyId: 'agency-1',
      name: formData.name,
      email: formData.email,
      industry: formData.industry || undefined,
      website: formData.website || undefined,
      contactPerson: {
        name: formData.contactName,
        email: formData.contactEmail,
        phone: formData.contactPhone || undefined
      },
      status: 'active' as const,
      portalAccess: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('clients.add.title')}</DialogTitle>
          <DialogDescription>
            {t('clients.add.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('clients.add.companyName')}</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('clients.add.companyEmail')}</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">{t('clients.add.industry')}</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">{t('clients.add.website')}</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">{t('clients.add.primaryContact')}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">{t('clients.add.contactName')}</Label>
                <Input
                  id="contactName"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">{t('clients.add.contactEmail')}</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">{t('clients.add.contactPhone')}</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('clients.add.cancel')}
            </Button>
            <Button type="submit">
              {t('clients.add.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientDetailModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const { t } = useTranslation('white-label');
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={client.logo} />
              <AvatarFallback>{client.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            {client.name}
          </DialogTitle>
          <DialogDescription>{client.industry}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>{t('clients.detail.projects')}</CardDescription>
                <CardTitle className="text-2xl">{client.projectsCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>{t('clients.detail.strategies')}</CardDescription>
                <CardTitle className="text-2xl">{client.strategiesCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">{t('clients.detail.contactInfo')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.contactPerson.email}</span>
              </div>
              {client.contactPerson.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.contactPerson.phone}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={client.portalAccess ? 'default' : 'secondary'}>
              {t('clients.detail.portalAccess', { status: client.portalAccess ? t('clients.detail.enabled') : t('clients.detail.disabled') })}
            </Badge>
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
              {client.status}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}