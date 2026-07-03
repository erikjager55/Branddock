import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Edit, RefreshCw, Save, X, Users, Star, Crown, Target } from 'lucide-react';

interface Archetype {
  name: string;
  match: number;
  traits: string[];
  motivation: string;
  shadow?: string;
}

interface BrandArchetypeData {
  primaryArchetype: Archetype;
  secondaryArchetype: Archetype;
}

type BrandArchetypeAggregated = {
  primaryArchetype?: Archetype;
  secondaryArchetype?: Archetype;
  allArchetypes?: Archetype[];
};

interface BrandArchetypeCanvasProps {
  onRerender: () => void;
  onEdit: (data: BrandArchetypeData) => void;
  assetData?: Partial<BrandArchetypeData>;
  sessionData?: { aggregatedData?: BrandArchetypeAggregated; sources?: string[] };
  isLocked?: boolean;
}

export function BrandArchetypeCanvas({ onRerender, onEdit, assetData, sessionData, isLocked = false }: BrandArchetypeCanvasProps) {
  const { t } = useTranslation('canvases');
  const [isEditing, setIsEditing] = useState(false);
  
  // Use session data if available, otherwise fall back to default data
  const defaultData = {
    primaryArchetype: {
      name: "The Creator",
      match: 85,
      traits: ["innovative", "artistic", "imaginative", "transformational"],
      motivation: "To create something of enduring value",
      shadow: "Perfectionism, over-engineering"
    },
    secondaryArchetype: {
      name: "The Magician",
      match: 72,
      traits: ["visionary", "transformational", "charismatic"],
      motivation: "To transform reality and make dreams come true"
    }
  };

  // Initialize with session data if available
  const sessionContent: BrandArchetypeAggregated = sessionData?.aggregatedData || {};
  const initialData: BrandArchetypeData = {
    primaryArchetype: sessionContent.primaryArchetype || defaultData.primaryArchetype,
    secondaryArchetype: sessionContent.secondaryArchetype || sessionContent.allArchetypes?.[1] || defaultData.secondaryArchetype
  };

  const [editData, setEditData] = useState(initialData);

  const handleSave = () => {
    onEdit(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const getArchetypeColor = (name: string) => {
    const colors: Record<string, string> = {
      "The Creator": "purple",
      "The Magician": "blue",
      "The Sage": "green",
      "The Hero": "red",
      "The Innocent": "yellow",
      "The Explorer": "orange"
    };
    return colors[name] || "gray";
  };

  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">{t('archetype.title')}</h3>
            <p className="text-muted-foreground">{t('archetype.subtitle')}</p>
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

        {/* Archetype Display */}
        <div className="space-y-6 mb-8">
          {/* Primary Archetype */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-4">
                  <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">{t('archetype.primary')}</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">{editData.primaryArchetype.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{editData.primaryArchetype.match}%</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">{t('archetype.match')}</div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">{t('archetype.coreMotivation')}</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{editData.primaryArchetype.motivation}</p>

                <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">{t('archetype.keyTraits')}</h5>
                <div className="flex flex-wrap gap-2">
                  {editData.primaryArchetype.traits.map((trait: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                {editData.primaryArchetype.shadow && (
                  <>
                    <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">{t('archetype.shadowSide')}</h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{editData.primaryArchetype.shadow}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Archetype */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-4">
                  <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{t('archetype.secondary')}</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{editData.secondaryArchetype.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{editData.secondaryArchetype.match}%</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">{t('archetype.match')}</div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t('archetype.coreMotivation')}</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{editData.secondaryArchetype.motivation}</p>

                <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t('archetype.keyTraits')}</h5>
                <div className="flex flex-wrap gap-2">
                  {editData.secondaryArchetype.traits.map((trait: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                      {trait}
                    </Badge>
                  ))}
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
              {isLocked ? t('status.lockedCannotEdit') : t('archetype.editButton')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('archetype.editTitle')}</DialogTitle>
              <DialogDescription>
                {t('archetype.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-4">{t('archetype.primary')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('archetype.nameLabel')}</label>
                    <Textarea
                      value={editData.primaryArchetype.name}
                      onChange={(e) => setEditData({...editData, primaryArchetype: {...editData.primaryArchetype, name: e.target.value}})}
                      placeholder={t('archetype.namePlaceholderPrimary')}
                      className="min-h-12"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('archetype.matchLabel')}</label>
                    <Textarea
                      value={editData.primaryArchetype.match.toString()}
                      onChange={(e) => setEditData({...editData, primaryArchetype: {...editData.primaryArchetype, match: parseInt(e.target.value) || 0}})}
                      placeholder="85"
                      className="min-h-12"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">{t('archetype.coreMotivation')}</label>
                  <Textarea
                    value={editData.primaryArchetype.motivation}
                    onChange={(e) => setEditData({...editData, primaryArchetype: {...editData.primaryArchetype, motivation: e.target.value}})}
                    placeholder={t('archetype.motivationPlaceholder')}
                    className="min-h-16"
                  />
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">{t('archetype.traitsLabel')}</label>
                  <Textarea
                    value={editData.primaryArchetype.traits.join(', ')}
                    onChange={(e) => setEditData({...editData, primaryArchetype: {...editData.primaryArchetype, traits: e.target.value.split(',').map(v => v.trim()).filter(v => v)}})}
                    placeholder={t('archetype.traitsPlaceholderPrimary')}
                    className="min-h-16"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">{t('archetype.secondary')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('archetype.nameLabel')}</label>
                    <Textarea
                      value={editData.secondaryArchetype.name}
                      onChange={(e) => setEditData({...editData, secondaryArchetype: {...editData.secondaryArchetype, name: e.target.value}})}
                      placeholder={t('archetype.namePlaceholderSecondary')}
                      className="min-h-12"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('archetype.matchLabel')}</label>
                    <Textarea
                      value={editData.secondaryArchetype.match.toString()}
                      onChange={(e) => setEditData({...editData, secondaryArchetype: {...editData.secondaryArchetype, match: parseInt(e.target.value) || 0}})}
                      placeholder="72"
                      className="min-h-12"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">{t('archetype.coreMotivation')}</label>
                  <Textarea
                    value={editData.secondaryArchetype.motivation}
                    onChange={(e) => setEditData({...editData, secondaryArchetype: {...editData.secondaryArchetype, motivation: e.target.value}})}
                    placeholder={t('archetype.motivationPlaceholder')}
                    className="min-h-16"
                  />
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">{t('archetype.traitsLabel')}</label>
                  <Textarea
                    value={editData.secondaryArchetype.traits.join(', ')}
                    onChange={(e) => setEditData({...editData, secondaryArchetype: {...editData.secondaryArchetype, traits: e.target.value.split(',').map(v => v.trim()).filter(v => v)}})}
                    placeholder={t('archetype.traitsPlaceholderSecondary')}
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