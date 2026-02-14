import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Edit, RefreshCw, Save, X, Eye, Sparkles } from 'lucide-react';

interface VisionStatementCanvasProps {
  onRerender: () => void;
  onEdit: (data: any) => void;
  assetData?: any;
  sessionData?: any;
  isLocked?: boolean;
}

export function VisionStatementCanvas({ onRerender, onEdit, assetData, sessionData, isLocked = false }: VisionStatementCanvasProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Use session data if available, otherwise fall back to default data
  const defaultData = {
    vision: "To become the leading catalyst for business transformation, creating a world where technology amplifies human potential and drives sustainable prosperity for organizations of all sizes.",
    timeframe: "10 years",
    keyElements: [
      "Global leadership in business transformation",
      "Technology that amplifies human potential", 
      "Sustainable prosperity for all organization sizes",
      "Catalyst for positive change"
    ]
  };

  // Initialize with session data if available
  const sessionContent = sessionData?.aggregatedData || {};
  const initialData = {
    vision: sessionContent.vision || defaultData.vision,
    timeframe: sessionContent.timeframe || defaultData.timeframe,
    keyElements: sessionContent.keyElements || defaultData.keyElements
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
            <h3 className="text-xl font-semibold mb-2">Vision Statement Canvas</h3>
            <p className="text-muted-foreground">Your organization's aspirational future</p>
            {sessionData?.sources && (
              <p className="text-xs text-blue-600 mt-1">
                Data from: {sessionData.sources.join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Completed
            </Badge>
            {sessionData && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Session Data Applied
              </Badge>
            )}
          </div>
        </div>

        {/* Vision Statement Display */}
        <div className="relative mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 border-2 border-purple-200 dark:border-purple-700">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-4">
                <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Our Vision</h4>
                <p className="text-sm text-purple-600 dark:text-purple-400">Timeframe: {editData.timeframe}</p>
              </div>
            </div>
            
            <blockquote className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 italic border-l-4 border-purple-400 pl-6 mb-6">
              "{editData.vision}"
            </blockquote>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Key Elements</h5>
                <ul className="space-y-2">
                  {editData.keyElements.map((element, index) => (
                    <li key={index} className="flex items-start">
                      <Sparkles className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{element}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Impact Areas</h5>
                <div className="space-y-2">
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Market Position</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Leading industry transformation</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Social Impact</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Empowering human potential</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Economic Value</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Sustainable prosperity</div>
                  </div>
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
              {isLocked ? 'Locked - Cannot Edit' : 'Edit Vision Statement'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Vision Statement</DialogTitle>
              <DialogDescription>
                Define your organization's aspirational future
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Vision Statement</label>
                <Textarea
                  value={editData.vision}
                  onChange={(e) => setEditData({...editData, vision: e.target.value})}
                  placeholder="Describe your organization's aspirational future..."
                  className="min-h-24"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Timeframe</label>
                <Textarea
                  value={editData.timeframe}
                  onChange={(e) => setEditData({...editData, timeframe: e.target.value})}
                  placeholder="e.g., 5-10 years, Next decade..."
                  className="min-h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Key Elements (one per line)</label>
                <Textarea
                  value={editData.keyElements.join('\n')}
                  onChange={(e) => setEditData({...editData, keyElements: e.target.value.split('\n').filter(item => item.trim())})}
                  placeholder="List the key elements of your vision..."
                  className="min-h-24"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}