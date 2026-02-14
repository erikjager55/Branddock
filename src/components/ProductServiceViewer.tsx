import React, { useState } from 'react';
import { ArrowLeft, Package, DollarSign, Target, CheckCircle2, Lightbulb, Users, TrendingUp, Edit, Plus, Check, X, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ProductServiceData } from './ProductServiceAnalyzer';
import { usePersonas } from '../contexts';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

interface ProductServiceViewerProps {
  data: ProductServiceData;
  onBack: () => void;
  onSave?: (updatedData: ProductServiceData) => void;
}

export function ProductServiceViewer({ data, onBack, onSave }: ProductServiceViewerProps) {
  const { personas } = usePersonas();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ProductServiceData>(data);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(data.personaIds || []);
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);

  const handleSave = () => {
    const finalData = {
      ...editedData,
      personaIds: selectedPersonaIds.length > 0 ? selectedPersonaIds : undefined,
    };
    
    if (onSave) {
      onSave(finalData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setSelectedPersonaIds(data.personaIds || []);
    setIsEditing(false);
  };

  const currentData = isEditing ? editedData : data;

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Terug
            </Button>
            <div className="ml-auto">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Bewerken
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Annuleren
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    className="gap-2 bg-primary"
                  >
                    <Save className="h-4 w-4" />
                    Opslaan
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editedData.name}
                      onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                      className="text-2xl font-semibold h-auto py-1 px-2 bg-background"
                    />
                    <Input
                      value={editedData.category}
                      onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                      className="text-sm px-2 py-1 bg-background"
                      placeholder="Categorie"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-semibold mb-1">{currentData.name}</h1>
                    <p className="text-muted-foreground">
                      {currentData.category}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="space-y-8">
          {/* Source Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Analysebron</div>
                  <div className="font-medium">{data.source}</div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  Geanalyseerd
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Description & Pricing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Beschrijving
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedData.description}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                    className="w-full h-40"
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed">
                    {data.description}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Prijsmodel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Model</div>
                    <div className="font-semibold">{data.pricing.model}</div>
                  </div>
                  {data.pricing.price && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Prijs</div>
                      <div className="text-2xl font-bold text-primary">
                        {data.pricing.price}
                        {data.pricing.model.toLowerCase().includes('maand') && (
                          <span className="text-base text-muted-foreground">/maand</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          {data.features && data.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Features & Kenmerken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {data.benefits && data.benefits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Voordelen & Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Audience & Use Cases */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target Personas - Interactive with edit option */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Doelgroep (Persona's)
                  </CardTitle>
                  <Dialog open={showPersonaDialog} onOpenChange={setShowPersonaDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="h-4 w-4" />
                        {selectedPersonaIds.length > 0 ? 'Bewerken' : 'Toevoegen'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Selecteer Doelgroep Persona's</DialogTitle>
                        <DialogDescription>
                          Kies één of meerdere persona's die de doelgroep vormen voor dit product/service
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        {personas.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">
                              Je hebt nog geen persona's aangemaakt
                            </p>
                            <Button variant="outline" onClick={() => setShowPersonaDialog(false)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Ga naar Persona's sectie
                            </Button>
                          </div>
                        ) : (
                          personas.map((persona) => {
                            const isSelected = selectedPersonaIds.includes(persona.id);
                            return (
                              <button
                                key={persona.id}
                                onClick={() => {
                                  setSelectedPersonaIds(prev =>
                                    isSelected
                                      ? prev.filter(id => id !== persona.id)
                                      : [...prev, persona.id]
                                  );
                                }}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? 'bg-primary text-white' : 'bg-muted'
                                  }`}>
                                    {isSelected ? (
                                      <Check className="h-5 w-5" />
                                    ) : (
                                      <Users className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold">{persona.name}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {persona.demographics.age || 'N/A'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {persona.tagline}
                                    </p>
                                    {persona.demographics.occupation && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {persona.demographics.occupation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setShowPersonaDialog(false)}>
                          Annuleren
                        </Button>
                        <Button onClick={() => setShowPersonaDialog(false)}>
                          <Check className="h-4 w-4 mr-2" />
                          Toepassen ({selectedPersonaIds.length})
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {selectedPersonaIds.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPersonaIds.map(personaId => {
                      const persona = personas.find(p => p.id === personaId);
                      if (!persona) return null;
                      return (
                        <div
                          key={personaId}
                          className="flex items-start gap-3 p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{persona.name}</h4>
                              {persona.demographics.age && (
                                <Badge variant="outline" className="text-xs">
                                  {persona.demographics.age}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                              {persona.tagline}
                            </p>
                            {persona.demographics.occupation && (
                              <p className="text-xs text-muted-foreground">
                                {persona.demographics.occupation}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Nog geen persona's gekoppeld
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPersonaDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Voeg Persona's Toe
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Use Cases */}
            {data.useCases && data.useCases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Use Cases & Toepassingen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.useCases.map((useCase, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-sm">{useCase}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Specifications */}
          {data.specifications && data.specifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Specificaties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.specifications.map((spec, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="text-sm text-muted-foreground">{spec.key}</span>
                      <span className="text-sm font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Images */}
          {data.images && data.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Product Afbeeldingen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.images.map((image, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={image}
                        alt={`${data.name} - afbeelding ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Competitors */}
          {data.competitors && data.competitors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Concurrenten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.competitors.map((competitor, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-1">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}