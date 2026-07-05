import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Edit, RefreshCw, Save, X, Target, Users, Zap, Heart } from 'lucide-react';

interface MissionStatementData {
  mission: string;
  components: { who: string; what: string; how: string; why: string };
}

type MissionStatementAggregated = {
  mission?: string;
  keyComponents?: Partial<MissionStatementData["components"]>;
};

interface MissionStatementCanvasProps {
  onRerender: () => void;
  onEdit: (data: MissionStatementData) => void;
  assetData?: Partial<MissionStatementData>;
  sessionData?: { aggregatedData?: MissionStatementAggregated; sources?: string[] };
  isLocked?: boolean;
}

export function MissionStatementCanvas({ onRerender, onEdit, assetData, sessionData, isLocked = false }: MissionStatementCanvasProps) {
  const { t } = useTranslation('canvases');
  const [isEditing, setIsEditing] = useState(false);
  
  // Use session data if available, otherwise fall back to default data
  const defaultData = {
    mission: "We empower mid-market businesses to thrive in the digital age by delivering innovative technology solutions that seamlessly blend human insight with artificial intelligence, creating meaningful connections and sustainable growth.",
    components: {
      who: "Mid-market businesses",
      what: "Innovative technology solutions",
      how: "Blending human insight with AI",
      why: "To create meaningful connections and sustainable growth"
    }
  };

  // Initialize with session data if available
  const sessionContent: MissionStatementAggregated = sessionData?.aggregatedData || {};
  const initialData: MissionStatementData = {
    mission: sessionContent.mission || defaultData.mission,
    components: { ...defaultData.components, ...sessionContent.keyComponents }
  };

  const [editData, setEditData] = useState(initialData);

  const handleSave = () => {
    onEdit(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">{t('mission.title')}</h3>
            <p className="text-muted-foreground">{t('mission.subtitle')}</p>
            {sessionData?.sources && (
              <p className="text-xs text-blue-600 mt-1">
                {t('common.dataFrom', { sources: sessionData.sources.join(', ') })}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {t('status.completed')}
            </Badge>
            {sessionData && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {t('status.sessionDataApplied')}
              </Badge>
            )}
          </div>
        </div>

        {/* Mission Statement Display */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border-2 border-green-200 dark:border-green-700">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-4">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">{t('mission.ourMission')}</h4>
                <p className="text-sm text-green-600 dark:text-green-400">{t('mission.purposeInAction')}</p>
              </div>
            </div>
            
            <blockquote className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 italic border-l-4 border-green-400 pl-6 mb-8">
              "{editData.mission}"
            </blockquote>

            {/* Mission Components */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="font-semibold text-green-900 dark:text-green-100">{t('mission.who')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{editData.components.who}</p>
                </div>
                
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Zap className="h-4 w-4 text-orange-600 mr-2" />
                    <span className="font-semibold text-green-900 dark:text-green-100">{t('mission.what')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{editData.components.what}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Target className="h-4 w-4 text-green-600 mr-2" />
                    <span className="font-semibold text-green-900 dark:text-green-100">{t('mission.how')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{editData.components.how}</p>
                </div>
                
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Heart className="h-4 w-4 text-red-600 mr-2" />
                    <span className="font-semibold text-green-900 dark:text-green-100">{t('mission.why')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{editData.components.why}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={isLocked}>
              <Edit className="h-4 w-4 mr-2" />
              {isLocked ? t('status.lockedCannotEdit') : t('mission.editButton')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('mission.editTitle')}</DialogTitle>
              <DialogDescription>
                {t('mission.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('mission.missionLabel')}</label>
                <Textarea
                  value={editData.mission}
                  onChange={(e) => setEditData({...editData, mission: e.target.value})}
                  placeholder={t('mission.missionPlaceholder')}
                  className="min-h-24"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('mission.whoLabel')}</label>
                  <Textarea
                    value={editData.components.who}
                    onChange={(e) => setEditData({...editData, components: {...editData.components, who: e.target.value}})}
                    placeholder={t('mission.whoPlaceholder')}
                    className="min-h-16"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('mission.whatLabel')}</label>
                  <Textarea
                    value={editData.components.what}
                    onChange={(e) => setEditData({...editData, components: {...editData.components, what: e.target.value}})}
                    placeholder={t('mission.whatPlaceholder')}
                    className="min-h-16"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('mission.howLabel')}</label>
                  <Textarea
                    value={editData.components.how}
                    onChange={(e) => setEditData({...editData, components: {...editData.components, how: e.target.value}})}
                    placeholder={t('mission.howPlaceholder')}
                    className="min-h-16"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('mission.whyLabel')}</label>
                  <Textarea
                    value={editData.components.why}
                    onChange={(e) => setEditData({...editData, components: {...editData.components, why: e.target.value}})}
                    placeholder={t('mission.whyPlaceholder')}
                    className="min-h-16"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                {t('actions.cancel')}
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {t('actions.saveChanges')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}