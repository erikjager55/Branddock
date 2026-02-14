  const renderInProgressView = () => {
    const selectedWorkshop = scheduledWorkshops.find(w => w.id === selectedWorkshopId);
    
    // Empty State - No workshops scheduled
    if (scheduledWorkshops.length === 0) {
      return (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">No Workshops Scheduled</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    You've purchased {purchasedWorkshops} workshop{purchasedWorkshops !== 1 ? 's' : ''} but haven't scheduled any sessions yet. 
                    Schedule your first workshop to get started.
                  </p>
                </div>
                <Button onClick={() => setShowScheduleDialog(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule First Workshop
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Get workshop assets for selected workshop
    const workshopAssets = selectedWorkshop?.assets?.map(assetId => 
      availableAssets.find(a => a.id === assetId)
    ).filter(Boolean) || [];
    
    // Initialize selected asset tab if not set
    if (!selectedAssetTab && workshopAssets.length > 0) {
      setSelectedAssetTab(workshopAssets[0]?.id || null);
    }
    
    return (
      <div className="space-y-6">
        {/* Save Toast Notification */}
        {showSaveToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardContent className="p-4 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Progress saved successfully
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session Control Bar - Sticky at top */}
        <Card className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Session Timer */}
                {sessionStartTime && !sessionPaused && (
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Session Time</p>
                      <p className="text-sm font-medium">{getSessionDuration()}</p>
                    </div>
                  </div>
                )}
                
                {/* Last Saved */}
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{formatLastSavedTime()}</p>
                  </div>
                </div>
                
                {/* Asset Count */}
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {workshopAssets.length} asset{workshopAssets.length !== 1 ? 's' : ''} in this workshop
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!sessionPaused ? (
                  <>
                    <Button size="sm" variant="outline" onClick={handlePauseSession}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSaveAndExit}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Save & Exit
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={handleResumeSession}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume Session
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workshop Selector - Compact */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <Label className="text-sm font-medium whitespace-nowrap">Current Workshop:</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 max-w-md justify-between">
                      {selectedWorkshop ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{selectedWorkshop.date}</span>
                          <Badge variant="outline" className="ml-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {selectedWorkshop.time}
                          </Badge>
                        </div>
                      ) : (
                        <span>Select a workshop session</span>
                      )}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[400px]">
                    {scheduledWorkshops.map(workshop => (
                      <DropdownMenuItem 
                        key={workshop.id}
                        onClick={() => setSelectedWorkshopId(workshop.id)}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{workshop.date} at {workshop.time}</span>
                          {selectedWorkshopId === workshop.id && (
                            <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleDialog(true)}
                disabled={scheduledWorkshops.length >= purchasedWorkshops}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Workshop
              </Button>
            </div>
            
            {/* Asset Badges - Show which assets this workshop covers */}
            {selectedWorkshop && workshopAssets.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Assets covered in this workshop:</p>
                <div className="flex flex-wrap gap-2">
                  {workshopAssets.map((asset) => {
                    if (!asset) return null;
                    const Icon = asset.icon;
                    return (
                      <Badge key={asset.id} variant="outline" className="flex items-center space-x-1 px-3 py-1">
                        <Icon className="h-3 w-3" />
                        <span>{asset.name}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facilitator Card - If workshop has facilitator */}
        {selectedWorkshop?.hasFacilitator && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">Facilitator-Led Workshop</CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300 mt-1">
                    Professional facilitator assigned to guide your session
                  </CardDescription>
                </div>
                {selectedWorkshop.meetingLink && (
                  <Button size="sm" asChild>
                    <a href={selectedWorkshop.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedWorkshop.facilitatorName}
                  </p>
                  {selectedWorkshop.facilitatorEmail && (
                    <a 
                      href={`mailto:${selectedWorkshop.facilitatorEmail}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 mt-1"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{selectedWorkshop.facilitatorEmail}</span>
                    </a>
                  )}
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    Your facilitator will guide you through each step, manage timing, and help resolve conflicts during the session.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Workshop Progress</p>
                  <p className="font-medium">Step {currentStep} of {totalSteps}</p>
                </div>
                <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                
                {/* Step Indicators - Make them clickable */}
                <div className="flex justify-between mt-4">
                  {workshopSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(stepNumber)}
                        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ width: `${100 / totalSteps}%` }}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                            isCurrent
                              ? 'bg-primary text-white shadow-lg scale-110'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          }`}
                        >
                          {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                        </div>
                        <p className={`text-xs text-center mt-2 max-w-[80px] ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                          {step.title.split(' ')[0]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary text-white">
                    Step {currentStep}
                  </span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{currentStepData.duration}</span>
                  </Badge>
                </div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video Tutorial */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Video Tutorial</h3>
              </div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={currentStepData.videoUrl}
                  title={`${currentStepData.title} Tutorial`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>

            <Separator />

            {/* Text Explanation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Overview</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStepData.textExplanation}
              </p>
            </div>

            <Separator />

            {/* Step-by-Step Guide */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Step-by-Step Guide</h3>
              </div>
              <ol className="space-y-3">
                {currentStepData.guide.map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Separator />

            {/* Multi-Asset Results Organization */}
            {workshopAssets.length > 1 ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Save className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Document Your Results by Asset</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  This workshop covers {workshopAssets.length} brand assets. Organize your results for each asset separately.
                </p>
                
                <Tabs value={selectedAssetTab || undefined} onValueChange={setSelectedAssetTab}>
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${workshopAssets.length}, 1fr)` }}>
                    {workshopAssets.map((asset) => {
                      if (!asset) return null;
                      const Icon = asset.icon;
                      return (
                        <TabsTrigger key={asset.id} value={asset.id} className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{asset.name}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  {workshopAssets.map((asset) => {
                    if (!asset) return null;
                    return (
                      <TabsContent key={asset.id} value={asset.id} className="space-y-4 mt-4">
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {currentStepData.resultPrompt} (for {asset.name})
                          </p>
                          <Textarea
                            placeholder={`Enter your results for ${asset.name}...`}
                            value={assetResults[asset.id]?.[currentStepData.id] || ''}
                            onChange={(e) => {
                              setAssetResults(prev => ({
                                ...prev,
                                [asset.id]: {
                                  ...prev[asset.id],
                                  [currentStepData.id]: e.target.value
                                }
                              }));
                            }}
                            className="min-h-[200px]"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{assetResults[asset.id]?.[currentStepData.id]?.length || 0} characters (suggested: 100-500)</span>
                            <Button size="sm" variant="outline" onClick={handleSaveProgress}>
                              <Save className="h-3 w-3 mr-2" />
                              Save Progress
                            </Button>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <h3 className="font-medium text-sm">Backburner Items</h3>
                          <p className="text-sm text-muted-foreground">
                            Document items to revisit later for {asset.name}:
                          </p>
                          <Textarea
                            placeholder={`Enter backburner items for ${asset.name}...`}
                            value={assetBackburners[asset.id]?.[currentStepData.id] || ''}
                            onChange={(e) => {
                              setAssetBackburners(prev => ({
                                ...prev,
                                [asset.id]: {
                                  ...prev[asset.id],
                                  [currentStepData.id]: e.target.value
                                }
                              }));
                            }}
                            className="min-h-[150px]"
                          />
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            ) : (
              /* Single Asset Results */
              <>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Save className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Document Your Results</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentStepData.resultPrompt}
                  </p>
                  <Textarea
                    placeholder="Enter your results and insights here..."
                    value={stepResults[currentStepData.id] || ''}
                    onChange={(e) => handleStepResultChange(currentStepData.id, e.target.value)}
                    className="min-h-[200px]"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stepResults[currentStepData.id]?.length || 0} characters (suggested: 100-500)</span>
                    <Button size="sm" variant="outline" onClick={handleSaveProgress}>
                      <Save className="h-3 w-3 mr-2" />
                      Save Progress
                    </Button>
                  </div>
                </div>

                {/* Backburner Field */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Save className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Backburner Items</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Document any items to revisit later:
                  </p>
                  <Textarea
                    placeholder="Enter backburner items here..."
                    value={stepBackburners[currentStepData.id] || ''}
                    onChange={(e) => handleStepBackburnerChange(currentStepData.id, e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Step
              </Button>
              <Button
                onClick={currentStep === totalSteps ? () => setShowCompletionPreview(true) : handleNextStep}
              >
                {currentStep === totalSteps ? 'Review & Complete' : 'Next Step'}
                {currentStep < totalSteps && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips - Dynamic based on current step */}
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm">Tips for This Step</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Watch the video tutorial first to understand the step objectives</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Follow the guide sequentially for best results</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Progress auto-saves every few minutes - use Save buttons for manual saves</span>
              </li>
              {workshopAssets.length > 1 && (
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Remember to document results for each asset using the tabs above</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };
