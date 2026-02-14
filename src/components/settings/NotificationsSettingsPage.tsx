import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Bell,
  Mail,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Save,
} from 'lucide-react';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: any;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export function NotificationsSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'comments',
      title: 'Comments',
      description: 'Get notified when someone comments on your work',
      icon: MessageSquare,
      email: true,
      push: true,
      inApp: true,
    },
    {
      id: 'team',
      title: 'Team Activity',
      description: 'Updates about team members and collaborators',
      icon: Users,
      email: true,
      push: false,
      inApp: true,
    },
    {
      id: 'research',
      title: 'Research Updates',
      description: 'New research insights and completed studies',
      icon: TrendingUp,
      email: false,
      push: false,
      inApp: true,
    },
    {
      id: 'deadlines',
      title: 'Deadlines & Reminders',
      description: 'Upcoming deadlines and scheduled reminders',
      icon: Calendar,
      email: true,
      push: true,
      inApp: true,
    },
    {
      id: 'completed',
      title: 'Task Completions',
      description: 'When tasks or projects are marked as complete',
      icon: CheckCircle2,
      email: false,
      push: false,
      inApp: true,
    },
  ]);

  const handleToggle = (id: string, type: 'email' | 'push' | 'inApp') => {
    setSettings(settings.map(setting =>
      setting.id === id
        ? { ...setting, [type]: !setting[type] }
        : setting
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">
            Choose how you want to be notified about activity and updates
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Alerts</p>
                <p className="text-2xl font-bold">
                  {settings.filter(s => s.email).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Push Alerts</p>
                <p className="text-2xl font-bold">
                  {settings.filter(s => s.push).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In-App</p>
                <p className="text-2xl font-bold">
                  {settings.filter(s => s.inApp).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Notification Settings */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
            
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr,100px,100px,100px] gap-4 pb-3 border-b text-sm text-muted-foreground">
                <div>Type</div>
                <div className="text-center">Email</div>
                <div className="text-center">Push</div>
                <div className="text-center">In-App</div>
              </div>

              {/* Settings Rows */}
              {settings.map((setting) => {
                const Icon = setting.icon;
                return (
                  <div
                    key={setting.id}
                    className="grid grid-cols-[1fr,100px,100px,100px] gap-4 py-4 border-b last:border-0 items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{setting.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={setting.email}
                        onChange={() => handleToggle(setting.id, 'email')}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={setting.push}
                        onChange={() => handleToggle(setting.id, 'push')}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={setting.inApp}
                        onChange={() => handleToggle(setting.id, 'inApp')}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Digest Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Email Digest</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Receive a summary of notifications instead of individual emails
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="radio" name="digest" defaultChecked className="w-4 h-4" />
              <div>
                <div className="font-semibold">Real-time</div>
                <div className="text-sm text-muted-foreground">
                  Get notified immediately
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="radio" name="digest" className="w-4 h-4" />
              <div>
                <div className="font-semibold">Daily digest</div>
                <div className="text-sm text-muted-foreground">
                  Once per day at 9:00 AM
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="radio" name="digest" className="w-4 h-4" />
              <div>
                <div className="font-semibold">Weekly digest</div>
                <div className="text-sm text-muted-foreground">
                  Every Monday at 9:00 AM
                </div>
              </div>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline">Reset to Defaults</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}