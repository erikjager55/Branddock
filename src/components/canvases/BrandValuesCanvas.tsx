import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Edit, RefreshCw, Save, X, Heart, Star, Target, Users, CheckCircle } from 'lucide-react';

interface BrandValuesCanvasProps {
  onRerender: () => void;
  onEdit: (data: any) => void;
  assetData?: any;
  sessionData?: any;
  isLocked?: boolean;
}

export function BrandValuesCanvas({ onRerender, onEdit, assetData, sessionData, isLocked = false }: BrandValuesCanvasProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Use session data if available, otherwise fall back to default data
  const defaultData = {
    values: [
      { 
        name: "Innovation", 
        description: "Continuously pushing boundaries to create breakthrough solutions", 
        behaviors: ["Experimenting with new technologies", "Challenging status quo", "Encouraging creative thinking"] 
      },
      { 
        name: "Human-Centricity", 
        description: "Putting people first in everything we design and build", 
        behaviors: ["User research and testing", "Inclusive design practices", "Empathy-driven decisions"] 
      },
      { 
        name: "Integrity", 
        description: "Acting with honesty, transparency, and ethical principles", 
        behaviors: ["Transparent communication", "Ethical business practices", "Honest feedback and reporting"] 
      },
      { 
        name: "Excellence", 
        description: "Delivering the highest quality in every interaction and solution", 
        behaviors: ["Continuous improvement", "Attention to detail", "Exceeding expectations"] 
      },
      { 
        name: "Collaboration", 
        description: "Working together to achieve more than we could alone", 
        behaviors: ["Cross-functional teamwork", "Open communication", "Shared success celebration"] 
      }
    ]
  };

  // Initialize with session data if available
  const sessionContent = sessionData?.aggregatedData || {};
  const initialData = {
    values: sessionContent.values || defaultData.values
  };

  const [editData, setEditData] = useState(initialData);

  const handleSave = () => {
    onEdit(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const getValueColor = (index: number) => {
    const colors = ['bg-blue-50 border-blue-200', 'bg-green-50 border-green-200', 'bg-purple-50 border-purple-200', 'bg-orange-50 border-orange-200', 'bg-pink-50 border-pink-200'];
    return colors[index % colors.length];
  };

  const getValueIconColor = (index: number) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-pink-600'];
    return colors[index % colors.length];
  };

  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">Core Values Canvas</h3>
            <p className="text-muted-foreground">Your organization's fundamental beliefs and principles</p>
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

        {/* Values Display */}
        <div className="space-y-6 mb-8">
          <div className="grid gap-6">
            {editData.values.map((value: any, index: number) => (
              <div key={index} className={`rounded-2xl p-6 border-2 ${getValueColor(index)}`}>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 shadow-sm">
                    <Heart className={`h-6 w-6 ${getValueIconColor(index)}`} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Core Value #{index + 1}</p>
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{value.description}</p>
                
                {value.behaviors && value.behaviors.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Behaviors & Actions
                    </h5>
                    <ul className="space-y-2">
                      {value.behaviors.map((behavior: string, behaviorIndex: number) => (
                        <li key={behaviorIndex} className="flex items-start">
                          <div className="h-2 w-2 rounded-full bg-gray-400 mt-2 mr-3 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{behavior}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {value.frequency && value.frequency > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Confirmed in {value.frequency} sessions
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={isLocked}>
              <Edit className="h-4 w-4 mr-2" />
              {isLocked ? 'Locked - Cannot Edit' : 'Edit Core Values'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Core Values</DialogTitle>
              <DialogDescription>
                Define your organization's fundamental beliefs and guiding principles
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {editData.values.map((value: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Value #{index + 1}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Value Name</label>
                      <Textarea
                        value={value.name}
                        onChange={(e) => {
                          const newValues = [...editData.values];
                          newValues[index] = {...newValues[index], name: e.target.value};
                          setEditData({...editData, values: newValues});
                        }}
                        placeholder="e.g., Innovation"
                        className="min-h-12"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <Textarea
                        value={value.description}
                        onChange={(e) => {
                          const newValues = [...editData.values];
                          newValues[index] = {...newValues[index], description: e.target.value};
                          setEditData({...editData, values: newValues});
                        }}
                        placeholder="What does this value mean to your organization?"
                        className="min-h-16"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Behaviors & Actions (one per line)</label>
                    <Textarea
                      value={value.behaviors?.join('\n') || ''}
                      onChange={(e) => {
                        const newValues = [...editData.values];
                        newValues[index] = {...newValues[index], behaviors: e.target.value.split('\n').filter(b => b.trim())};
                        setEditData({...editData, values: newValues});
                      }}
                      placeholder="How does this value show up in daily behavior?"
                      className="min-h-20"
                    />
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditData({
                      ...editData, 
                      values: [...editData.values, { name: '', description: '', behaviors: [] }]
                    });
                  }}
                >
                  Add Another Value
                </Button>
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