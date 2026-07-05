// Canonical (source-of-truth) English UI strings — `brand-asset-detail` namespace.
const brandAssetDetail = {
  shared: {
    add: 'Add',
    addItem: 'Add item',
    notSet: 'Not set',
    notYetFilledIn: 'Not yet filled in',
    notYetDefined: 'Not yet defined',
    noItemsYet: 'No items yet',
    cancel: 'Cancel',
  },
  page: {
    noAssetSelected: 'No asset selected',
    notFound: 'Asset not found',
    backToBrand: 'Back to Your Brand',
    saved: 'Brand asset saved successfully',
  },
  header: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    whatIs: 'What is {{name}}?',
    fallbackDescription:
      '{{name}} is a {{category}} brand asset that defines a key element of your brand identity.',
    categoryLabel: 'Category:',
    researchLabel: 'Research:',
    researchValue: 'AI Exploration available for strategic analysis',
    versionLabel: 'Version Controlled:',
    versionValue: 'Full history of changes with lock/unlock protection',
    categories: {
      PURPOSE: 'Purpose',
      FOUNDATION: 'Foundation',
      STRATEGY: 'Strategy',
      COMMUNICATION: 'Communication',
      PERSONALITY: 'Personality',
      CORE: 'Core',
      NARRATIVE: 'Narrative',
      CULTURE: 'Culture',
    },
  },
  quickActions: {
    title: 'Quick Actions',
    exportPdf: 'Export PDF',
  },
  completeness: {
    title: 'Asset Completeness',
    sectionsFilled: '{{filled}}/{{total}} sections filled',
  },
  research: {
    title: 'Research',
    free: 'FREE',
    aiExploration: {
      label: 'AI Exploration',
      description:
        'AI-assisted analysis and ideation for brand strategy and positioning',
      start: 'Start Exploration',
      continue: 'Continue',
      view: 'View Report',
    },
  },
  aiExploration: {
    pageTitle: 'AI Brand Asset Exploration',
    pageDescription: 'Answer questions to validate and strengthen this brand asset',
    backLabel: 'Back to Brand Asset',
  },
  proofPointsGuidance: {
    essence:
      'List evidence that proves your brand identity is genuine (e.g. founding principles, heritage, consistent behaviors). For customer-facing proof, see Brand Promise.',
    promise:
      'List verifiable proof that you deliver on your promise (e.g. guarantees, certifications, statistics). For identity evidence, see Brand Essence.',
    story:
      'List milestones and achievements that support your brand narrative (e.g. awards, pivotal moments, growth metrics).',
    socialRelevancy:
      'List evidence of your social/environmental impact (e.g. certifications, impact reports, partnerships). For broader brand proof, see Brand Promise.',
  },
  companionValues: {
    identityLabel:
      'These describe who your brand IS at its core. Compare with {{companion}} (what you deliver).',
    commitmentLabel:
      'These articulate what you deliver to customers. Compare with {{companion}} (who you are).',
    notDefined: 'Not yet defined — fill in {{companion}} first.',
    fields: {
      functional: 'Functional',
      emotional: 'Emotional',
      selfExpressive: 'Self-Expressive',
    },
  },
  swot: {
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    opportunities: 'Opportunities',
    threats: 'Threats',
  },
  esg: {
    environmental: 'Environmental',
    social: 'Social',
    governance: 'Governance',
    impact: '{{level}} impact',
  },
  purposeKompas: {
    impact: '{{level}} impact',
    people: {
      label: 'People',
      description: 'Healthy lifestyles, self-development and personal growth',
    },
    environment: {
      label: 'Environment',
      description: 'Sustainability, CO₂ reduction and circular production',
    },
    society: {
      label: 'Society',
      description: 'Fighting inequality, community and social impact',
    },
  },
  purposeStatement: {
    title: 'Purpose Statement',
    subtitle: 'The reason your organization exists',
    editPlaceholder: "Describe the '{{layer}}'...",
    layers: {
      why: {
        label: 'Why',
        description: 'Describe why your organization exists. This goes beyond profit.',
      },
      how: {
        label: 'How',
        description: 'Describe how you do this in your own unique way.',
      },
      impact: {
        label: 'Impact',
        description:
          'Describe the impact your purpose has on people, environment, and society.',
      },
    },
  },
  purposeWheel: {
    startWithWhy: 'Start With Why',
    statement: {
      title: 'Purpose Statement',
      subtitle: 'The core reason your organization exists',
      placeholder: 'Define your purpose statement...',
    },
    impact: {
      title: 'Impact Type',
      subtitle:
        'How your organization makes a difference in the world (IDEO Inner Wheel)',
      descLabel: 'How does this impact look for your organization?',
      descPlaceholder:
        'Describe how this impact looks for your organization in practice...',
    },
    impactTypes: {
      enablePotential:
        "Helping people and communities unlock capabilities they didn't know they had",
      reduceFriction:
        'Removing barriers and making things easier, simpler, more accessible',
      fosterProsperity:
        'Creating economic opportunity and sustainable growth for all stakeholders',
      encourageExploration:
        'Inspiring curiosity, discovery and new ways of thinking about the world',
      kindleHappiness:
        "Creating joy, connection and meaningful moments in people's lives",
    },
    mechanism: {
      title: 'Mechanism',
      subtitle: 'How you deliver on your purpose (IDEO Outer Wheel)',
      selectLabel: 'Select your mechanism category',
      descLabel: 'Describe how this mechanism works for your organization',
      descPlaceholder:
        'Describe through what unique means you achieve your impact...',
    },
    pressureTest: {
      title: 'Pressure Test',
      subtitle: 'Validating your purpose against reality',
      considerLabel: 'Consider these questions',
      placeholder: 'Answer the pressure test questions above...',
    },
    questions: {
      q1: 'What would the world lose if your organization ceased to exist?',
      q2: 'What would this purpose unlock for your employees?',
      q3: 'Which decisions would be different if everyone truly lived this purpose?',
    },
  },
  goldenCircle: {
    startWithWhy: 'Start With Why',
    ariaLabel: 'Golden Circle: WHY (innermost), HOW (middle), WHAT (outermost ring)',
    rings: {
      what: {
        subtitle: 'Proof & Offering',
        helper: 'Products and services as tangible proof of your WHY',
      },
      how: {
        subtitle: 'Differentiating Approach',
        helper: 'Principles and values that bring your WHY to life',
      },
      why: {
        subtitle: 'Core Belief',
        helper: 'Your purpose, belief, drive — never about products',
      },
    },
    coherence: {
      strong: 'Strong coherence',
      partial: 'Partially filled',
      weak: 'Incomplete',
      strongDetail:
        'WHY, HOW and WHAT are fully filled in and aligned with each other.',
      partialDetail:
        'Not all rings are fully filled in. Complete all three for a strong Golden Circle.',
      weakDetail: 'The Golden Circle is still mostly empty. Start with your WHY.',
    },
    panel: {
      statement: 'Statement',
      details: 'Details',
      statementPlaceholder: 'Enter your {{ring}} statement...',
      detailsPlaceholder: 'Elaborate on your {{ring}}...',
      notFilled: 'Not yet filled in',
    },
  },
  brandEssence: {
    companion: 'Brand Promise',
    examples: 'Examples',
    core: {
      title: 'Brand Essence',
      subtitle:
        'The single most defining thought about your brand — timeless, in 1-3 words',
      statementLabel: 'Essence Statement (adj-adj-noun format)',
      statementPlaceholder: 'e.g. Authentic Athletic Performance',
      narrativePlaceholder:
        'Explain in 2-3 sentences what this essence means for your brand...',
      empty: 'Define your brand essence...',
    },
    benefits: {
      title: 'Benefits',
      subtitle: 'What your brand delivers across three dimensions',
      functional: {
        label: 'Functional Benefit',
        description: 'What tangible quality is inseparable from your brand identity?',
        placeholder: 'Describe the tangible value your brand delivers...',
      },
      emotional: {
        label: 'Emotional Benefit',
        description: 'What feeling is intrinsically part of who you are?',
        placeholder: 'Describe the feeling your brand evokes...',
      },
      selfExpressive: {
        label: 'Self-Expressive Benefit',
        description:
          'What does your brand enable people to express about themselves?',
        placeholder:
          'Describe how customers express their identity through your brand...',
      },
    },
    discriminator: {
      title: 'Discriminator',
      subtitle:
        'The single most compelling reason to choose your brand over competitors',
      formula: '“Only [your brand] can _____ because _____.”',
      placeholder: 'Only [brand] can... because...',
      empty: 'Define what makes your brand the only choice...',
    },
    audience: {
      title: 'Audience Insight',
      subtitle: 'The deep human truth that connects your brand to its audience',
      hint: 'Not who they are, but why they need it — the underlying tension, desire, or unmet need.',
      placeholder:
        'Describe the deep human truth that connects your brand to its audience...',
      empty: 'Describe the deep human truth...',
    },
    evidence: {
      title: 'Evidence',
      subtitle: 'Concrete proof that your brand essence is real',
      proofPoints: 'Proof Points',
      proofPlaceholder: 'Add a proof point...',
      proofEmpty: 'No proof points defined yet',
      attributes: 'Brand Attributes',
      attrPlaceholder: 'Add a brand attribute...',
      attrEmpty: 'No attributes defined yet',
    },
    validation: {
      title: 'Validation Score',
      subtitle: 'Rate your brand essence against 6 key criteria',
      criteria: {
        unique: {
          label: 'Unique',
          description: 'Is it ownable and distinctive to your brand?',
        },
        intangible: {
          label: 'Intangible',
          description: 'Is it beyond a product feature or functional claim?',
        },
        meaningful: {
          label: 'Meaningful',
          description: 'Does it resonate deeply with your audience?',
        },
        authentic: {
          label: 'Authentic',
          description: 'Does it reflect the true reality of your brand?',
        },
        enduring: {
          label: 'Enduring',
          description: 'Will it remain relevant for 10+ years?',
        },
        scalable: {
          label: 'Scalable',
          description: 'Does it work across markets and categories?',
        },
      },
    },
  },
  brandPromise: {
    companion: 'Brand Essence',
    examples: 'Examples',
    statement: {
      title: 'Brand Promise',
      subtitle: 'The commitment your brand makes to every customer, every time',
      label: 'Promise Statement',
      placeholder: 'The core promise your brand makes...',
      oneLinerLabel: 'One-Liner',
      oneLinerPlaceholder: 'Distill to a single tagline...',
      empty: 'Define your brand promise...',
    },
    value: {
      title: 'Value Architecture',
      subtitle: 'Three layers of value your promise delivers (Aaker model)',
      functional: {
        label: 'Functional Value',
        description: 'What tangible value do you guarantee to deliver?',
        placeholder: 'Describe the tangible, measurable benefit...',
      },
      emotional: {
        label: 'Emotional Value',
        description: 'What feeling do you commit to creating for customers?',
        placeholder: 'Describe the feeling your promise creates...',
      },
      selfExpressive: {
        label: 'Self-Expressive Value',
        description: 'How do you help customers express their desired identity?',
        placeholder: 'Describe how customers express their identity...',
      },
    },
    audience: {
      title: 'Audience & Need',
      subtitle: 'Who you serve and the deep need your promise addresses',
      targetLabel: 'Target Audience',
      targetDescription: 'Who is this promise for?',
      targetPlaceholder: 'Describe your primary target audience...',
      hint: 'Go beyond demographics — what is the deeper, unmet need your promise fulfills?',
      needPlaceholder: 'The deep underlying need your promise addresses...',
      needEmpty: 'Define the core customer need...',
    },
    differentiator: {
      title: 'Differentiator',
      subtitle: "What makes your promise unique — Neumeier's Onlyness Test",
      label: 'Differentiator',
      description: 'What sets your promise apart from competitors?',
      placeholder: 'Describe what makes your promise unique...',
      formula: '“Only [your brand] can _____ because _____.”',
      onlynessPlaceholder: 'Only [brand] can... because...',
      onlynessEmpty: 'Complete the Onlyness Statement...',
    },
    evidence: {
      title: 'Evidence',
      subtitle: 'Concrete proof that your promise is real and measurable',
      proofPoints: 'Proof Points',
      proofPlaceholder: 'Add a proof point...',
      proofEmpty: 'No proof points defined yet',
      outcomes: 'Measurable Outcomes',
      outcomesHint: 'Specific, quantifiable results that demonstrate promise delivery',
      outcomesPlaceholder: 'Add a measurable outcome...',
      outcomesEmpty: 'No measurable outcomes defined yet',
    },
  },
  missionVision: {
    addIndicator: 'Add indicator',
    mission: {
      title: 'Mission Statement',
      subtitle: 'Why your organization exists and what it does',
      label: 'Mission Statement',
      placeholder: 'Your full mission statement (1-3 sentences)...',
      oneLinerLabel: 'One-Liner',
      oneLinerPlaceholder: 'Fits on a T-shirt...',
      empty: 'Define your mission...',
      druckerQuote: '“Peter Drucker: A mission must fit on a T-shirt.”',
      examplesToggle: 'Mission Examples',
    },
    components: {
      title: 'Mission Components',
      subtitle: 'The building blocks: for whom, what, and how differently',
      forWhom: {
        label: 'For Whom',
        description: 'Who do you serve?',
        placeholder: 'Describe your primary audience...',
      },
      whatWeDo: {
        label: 'What We Do',
        description: 'What do you do?',
        placeholder: 'Describe your core activity...',
      },
      howWeDoIt: {
        label: 'How We Do It',
        description: 'How do you do it differently?',
        placeholder: 'Describe your unique approach...',
      },
      hint: 'A strong mission answers three questions: For whom? What? How differently?',
    },
    vision: {
      title: 'Vision Statement',
      subtitle: 'The destination: where you are working toward',
      label: 'Vision Statement',
      placeholder: 'Your aspirational future state (1-3 sentences)...',
      timeHorizonLabel: 'Time Horizon',
      timeHorizonSelect: 'Select a time horizon...',
      bhagLabel: 'Bold Aspiration (BHAG)',
      bhagPlaceholder: 'Big Hairy Audacious Goal (Collins & Porras)...',
      empty: 'Define your vision...',
      timeHorizonView: 'Time Horizon:',
      bhagView: 'BHAG',
      examplesToggle: 'Vision Examples',
    },
    future: {
      title: 'Envisioned Future',
      subtitle: 'Collins & Porras: a vivid description of success',
      desiredLabel: 'Desired Future State',
      desiredDescription: 'A vivid description of what success looks like',
      desiredPlaceholder:
        'Paint a vivid picture of the future when your organization has fully succeeded...',
      indicatorsLabel: 'Success Indicators',
      indicatorsHint: 'Concrete, measurable signals that your vision is becoming reality',
      indicatorsPlaceholder: 'Add a success indicator...',
      indicatorsEmpty: 'No success indicators defined yet',
      stakeholderLabel: 'Stakeholder Benefit',
      stakeholderDescription: 'Who benefits and how?',
      stakeholderPlaceholder: 'Describe who benefits from your vision and how...',
    },
    impact: {
      title: 'Impact & Alignment',
      subtitle: 'The bridge between today and tomorrow',
      goalLabel: 'Impact Goal',
      goalDescription: 'Measurable impact today',
      goalPlaceholder: 'What measurable impact are you making right now?',
      valuesLabel: 'Values Alignment',
      valuesDescription: 'How mission/vision reinforce core values',
      valuesPlaceholder:
        'How do your mission and vision reinforce your core values?',
      tensionLabel: 'Mission-Vision Tension',
      tensionDescription: 'Creative tension between present and future',
      tensionPlaceholder:
        'What is the creative tension between what you do today and where you are going?',
    },
  },
  brandHouse: {
    intro: {
      title: 'BrandHouse Value Model',
      body: 'Every brand needs at least five core values, organized in three categories. Start by inventorying values with your team (4-6 people), then cluster and select through consensus. For each value, ask: is it a prerequisite (table stakes) or truly distinguishing? Only distinguishing values belong here.',
    },
    roots: {
      title: 'Roots',
      badge: 'Anchor Values',
      subtitle:
        'The foundation your organization is built on — values already proven through daily actions',
      info: 'Roots are the foundational principles of your organization. They are already embedded in how you operate today. Think of what your team would say when asked: “What do we stand for, no matter what?”',
      value1Label: 'Root Value 1',
      value1NamePlaceholder: 'e.g. Integrity, Reliability, Quality...',
      value2Label: 'Root Value 2',
      value2NamePlaceholder: 'e.g. Transparency, Craftsmanship, Care...',
      descriptionPlaceholder:
        'How is this value visible in everyday actions? Give concrete examples...',
    },
    wings: {
      title: 'Wings',
      badge: 'Aspiration Values',
      subtitle: 'Values that give direction to the movement your brand wants to make',
      info: 'Wings represent your direction and ambition. They require active effort and conscious investment. These are the values that pull you forward — where you want to grow, not just where you are today.',
      value1Label: 'Wing Value 1',
      value1NamePlaceholder: 'e.g. Innovation, Boldness, Sustainability...',
      value2Label: 'Wing Value 2',
      value2NamePlaceholder: 'e.g. Inclusivity, Thought Leadership...',
      descriptionPlaceholder:
        'What concrete steps are you taking to grow into this value?...',
    },
    fire: {
      title: 'Fire',
      badge: 'Own Value',
      subtitle:
        'The one value that most distinctively describes how your organization does things',
      info: 'Fire is your most distinguishing characteristic — the value that makes your brand unmistakably yours. If a competitor adopted all your other values, this is the one they could never replicate authentically.',
      ownLabel: 'Own Value',
      ownNamePlaceholder: 'e.g. Playfulness, Precision, Empowerment...',
      ownDescriptionPlaceholder:
        'Why is this the one value no competitor could authentically copy?...',
      ownEmpty: 'Define your own value...',
    },
    tension: {
      label: 'Value Tension',
      hint: 'Great value sets have productive tension. How do your roots, wings, and fire balance each other? Where do they create a healthy pull in different directions?',
      placeholder:
        "e.g. Our root of Reliability keeps our wing of Innovation grounded — we move fast but never ship anything we're not proud of...",
      empty: 'Describe the tension between your values...',
    },
  },
  brandArchetype: {
    selection: {
      title: 'Brand Archetype',
      subtitle: "Your brand's narrative identity based on the 12 Jungian archetypes",
      hideGuide: 'Hide guide',
      whatAre: 'What are archetypes?',
      subLabel: 'Sub-archetype Variant',
      subSelect: 'Select variant...',
      variant: 'Variant: {{variant}}',
    },
    callout: {
      title: 'Select an archetype to unlock your brand profile',
      body: 'Choose an archetype above to see your brand profile. Each archetype comes with pre-filled psychology and positioning data that you can customize.',
    },
    psychology: {
      title: 'Core Psychology',
      subtitle: 'The fundamental desires, fears, and strategies of your archetype',
      coreDesire: {
        label: 'Core Desire',
        description: 'The fundamental human need your brand fulfills',
        placeholder: 'What deep human desire does your brand fulfill?',
      },
      coreFear: {
        label: 'Core Fear',
        description: 'What your brand stands against and protects from',
        placeholder: 'What fear does your brand help people overcome?',
      },
      brandGoal: {
        label: 'Brand Goal',
        description: "The ultimate aim from this archetype's perspective",
        placeholder: "What is your brand's ultimate goal?",
      },
      strategy: {
        label: 'Strategy',
        description: 'How your brand achieves its goal',
        placeholder: 'How does your brand reach its goal?',
      },
      giftTalent: {
        label: 'Gift / Talent',
        description: 'The unique gift your brand brings to the world',
        placeholder: 'What unique talent does your brand offer?',
      },
      shadowWeakness: {
        label: 'Shadow / Weakness',
        description: 'The pitfall when the archetype is overdone',
        placeholder:
          'What risks exist when your brand personality is pushed too far?',
      },
    },
    action: {
      title: 'Archetype in Action',
      subtitle:
        'How the archetype drives marketing, CX, content, and storytelling',
      fieldsDefined: '{{count}} of 4 fields defined',
      marketingExpression: {
        label: 'Marketing Expression',
        description: 'How the archetype manifests in campaigns and advertising',
        placeholder: 'How does the archetype show in your marketing?',
      },
      customerExperience: {
        label: 'Customer Experience',
        description: 'How the archetype shapes customer interactions',
        placeholder: 'How does the archetype influence customer experience?',
      },
      contentStrategy: {
        label: 'Content Strategy',
        description: 'What types of content this archetype creates',
        placeholder: 'What content fits your archetype?',
      },
      storytellingApproach: {
        label: 'Storytelling Approach',
        description: 'The narrative role and recurring themes',
        placeholder: 'How does your archetype shape the stories you tell?',
      },
    },
    reference: {
      title: 'Reference & Positioning',
      subtitle: 'Competitive landscape and brand examples sharing your archetype',
      examplesLabel: 'Brand Examples',
      examplesPlaceholder: 'Add a reference brand...',
      examplesEmpty: 'No reference brands added',
      positioningLabel: 'Positioning Approach',
      positioningSelect: 'Select approach...',
      positioningEmpty: 'Select a positioning approach...',
      competitiveLabel: 'Competitive Landscape',
      competitiveDescription:
        'Which archetypes do your competitors use and how do you differentiate?',
      competitivePlaceholder: "Describe your competitors' archetype positions...",
    },
    modal: {
      title: 'Switch Archetype?',
      body1:
        'Changing archetype will update all fields with new reference data. Any custom edits will be overwritten.',
      body2:
        'The Archetype in Action field and Competitive Landscape will be preserved as they are brand-specific.',
      cancel: 'Cancel',
      confirm: 'Switch & Update Fields',
    },
  },
  brandPersonality: {
    dimensions: {
      title: 'Brand Personality Dimensions',
      subtitle:
        "Score each of Aaker's 5 personality dimensions (1-5) to define your brand's character",
      dominant: 'Dominant Personality',
      collapseInfo: 'Collapse {{label}} info',
      expandInfo: 'Expand {{label}} info',
    },
    traits: {
      title: 'Core Personality Traits',
      subtitle: '3-5 defining traits with "We Are / But Never" guard rails',
      namePlaceholder: 'Trait name...',
      descriptionPlaceholder: 'Describe this trait...',
      weAreThis: 'We Are This',
      weArePlaceholder: 'Concrete examples...',
      butNever: 'But Never That',
      butNeverPlaceholder: 'Guard rails...',
      add: 'Add trait',
      empty: 'Define 3-5 core personality traits...',
    },
    spectrum: {
      title: 'Personality Spectrum',
      subtitle: 'Position your brand on 7 personality dimensions (drag sliders)',
    },
    visual: {
      title: 'Visual Personality Expression',
      subtitle: 'How personality translates to visual design decisions',
      guidanceFor: 'Visual guidance for {{label}} brands',
      color: 'Color',
      typography: 'Typography',
      imagery: 'Imagery',
      colorLabel: 'Color Direction',
      colorPlaceholder: "Describe your brand's color personality direction...",
      typographyLabel: 'Typography Direction',
      typographyPlaceholder: "Describe your brand's typography personality...",
      imageryLabel: 'Imagery Direction',
      imageryPlaceholder: "Describe your brand's imagery style...",
    },
  },
  brandStory: {
    guide: {
      hide: 'Hide storytelling guide',
      show: 'Storytelling frameworks',
      corePrinciple: 'Core Principle',
      corePrincipleBody:
        'The customer is the hero, not the brand. The brand is the guide/mentor that helps the hero achieve transformation.',
    },
    cards: {
      c1: { title: 'Origin & Belief', subtitle: 'The foundation — why the brand exists' },
      c2: {
        title: 'The World We See',
        subtitle: 'The tension — which problem does the brand solve?',
      },
      c3: {
        title: 'The Brand as Guide',
        subtitle: "The role — how the brand positions itself in the customer's story",
      },
      c4: {
        title: 'Transformation & Resolution',
        subtitle: 'The promise — life after the brand',
      },
      c5: {
        title: 'Narrative Toolkit',
        subtitle: 'The instruments — how the brand tells its story',
      },
      c6: {
        title: 'Evidence & Milestones',
        subtitle: 'The proof — why the story is credible',
      },
      c7: {
        title: 'Story Expressions',
        subtitle: 'The output — how the story is communicated',
      },
    },
    summary: {
      notStarted: 'Not started',
      problemLayers: '{{count}}/3 problem layers defined',
      role: 'Role: {{role}}',
      themes: '{{count}} themes',
      messages: '{{count}} messages',
      evidenceItems: '{{count}} evidence items',
      elevatorDefined: 'Elevator pitch defined',
    },
    fields: {
      originStory: {
        label: 'Origin Story',
        placeholder:
          'Tell the founding narrative — what moment, problem, or conviction brought this brand into being?',
      },
      founderMotivation: {
        label: 'Founder Motivation',
        placeholder:
          'What personal drive pushed the founder(s) to start this? (Simmons\' "Why I Am Here")',
      },
      coreBelief: {
        label: 'Core Belief Statement',
        placeholder: 'The fundamental belief about the world this brand is built on',
      },
      worldContext: {
        label: 'World Context',
        placeholder:
          'What external forces (political, economic, social, technological) make this brand relevant right now?',
      },
      threeLayer: 'StoryBrand Three-Layer Problem Framework',
      externalProblem: {
        label: 'External Problem',
        placeholder: 'The visible, tangible problem your customer faces',
      },
      internalProblem: {
        label: 'Internal Problem',
        placeholder: 'The emotional experience — frustration, doubt, fear, overwhelm',
      },
      philosophicalProblem: {
        label: 'Philosophical Problem',
        placeholder:
          'Why this matters on a human or societal level — the bigger injustice',
      },
      stakes: {
        label: 'Stakes — Cost of Inaction',
        placeholder:
          'What happens if the problem is NOT solved? What are the consequences of doing nothing?',
      },
      brandRoleLabel: 'Brand Role',
      empathy: {
        label: 'Empathy Statement',
        placeholder: "How does the brand show understanding for the customer's struggle?",
      },
      authority: {
        label: 'Authority Credentials',
        placeholder:
          'What gives the brand credibility to help — track record, approach, certifications?',
      },
      transformation: {
        label: 'Transformation Promise',
        placeholder:
          'What specific change does the customer experience? Describe the before vs. after.',
      },
      successVision: {
        label: 'Customer Success Vision',
        placeholder:
          'Paint a vivid, sensory picture of the customer\'s life after transformation — the "new normal".',
      },
      abt: {
        label: 'ABT Statement',
        placeholder:
          "[Context] AND [setup]. BUT [problem/tension]. THEREFORE [brand's role and impact].",
      },
      narrativeArcLabel: 'Narrative Arc',
      themes: {
        label: 'Brand Themes',
        hint: '(2-4 thematic territories)',
        placeholder: 'Add a theme and press Enter...',
      },
      emotional: {
        label: 'Emotional Territory',
        hint: '(emotions the story evokes)',
        placeholder: 'Add an emotion and press Enter...',
      },
      keyMessages: {
        label: 'Key Narrative Messages',
        hint: '(3-5 recurring messages)',
        placeholder: 'Add a key message and press Enter...',
      },
      proofPoints: {
        label: 'Proof Points',
        hint: '(testimonials, data, awards)',
        placeholder: 'Add a proof point...',
      },
      valuesInAction: {
        label: 'Values in Action',
        hint: '(stories where values were demonstrated)',
        placeholder:
          'Describe a moment where your values were proven through action...',
      },
      milestones: {
        label: 'Brand Milestones',
        hint: '(key moments in the brand journey)',
        placeholder: 'A milestone — launch, pivot, achievement, challenge overcome...',
      },
      elevator: {
        label: 'Elevator Pitch',
        placeholder:
          'The 30-second version of your brand story — clear, memorable, action-oriented.',
      },
      manifesto: {
        label: 'Brand Manifesto',
        placeholder:
          'The long-form, emotionally charged version — the brand manifesto that could inspire employees and customers alike.',
      },
      audienceAdaptations: {
        label: 'Audience Adaptations',
        hint: 'Notes on how the story adapts for different audiences',
        placeholder: 'How the story resonates with {{audience}}...',
      },
    },
  },
  transformativeGoals: {
    mtp: {
      title: 'Massive Transformative Purpose',
      subtitle: 'The overarching ambition that drives everything your brand does',
      statementLabel: 'MTP Statement',
      statementPlaceholder:
        "e.g. Accelerate the world's transition to sustainable energy",
      characters: '{{count}}/150 characters',
      narrativeLabel: 'Narrative',
      narrativePlaceholder:
        "Why this purpose matters, who it serves, and what world you're building...",
      empty: 'Define your Massive Transformative Purpose...',
      examples: 'MTP Examples',
    },
    goals: {
      title: 'Transformative Goals',
      subtitle: 'Concrete, measurable commitments that operationalize your MTP',
      addGoal: 'Add Goal',
    },
    authenticity: {
      title: 'Authenticity Assessment',
      subtitle:
        'Evaluate how well your goals align with your brand (Collins + Ismail)',
      criteria: {
        ambition: { label: 'Ambition', question: 'Is it bold enough to inspire?' },
        authenticity: { label: 'Authenticity', question: 'Does it match brand DNA?' },
        clarity: { label: 'Clarity', question: 'Can anyone understand it?' },
        measurability: { label: 'Measurability', question: 'Can progress be tracked?' },
        integration: { label: 'Integration', question: 'Does it drive strategy?' },
        longevity: { label: 'Longevity', question: 'Will it endure 10+ years?' },
      },
    },
    stakeholder: {
      title: 'Stakeholder Impact',
      subtitle:
        'Map how each stakeholder group contributes to and benefits from transformation',
      roleLabel: 'Role',
      rolePlaceholder: 'e.g. Ambassadors & executors',
      impactLabel: 'Expected Impact',
      impactPlaceholder: 'e.g. Culture, motivation, retention',
      roleView: 'Role',
      impactView: 'Impact',
      empty: 'Define role and expected impact...',
    },
    integration: {
      title: 'Brand Integration',
      subtitle:
        'How transformative goals drive positioning, campaigns, and internal culture',
      positioningLabel: 'Positioning Link',
      positioningDescription:
        'How do these goals strengthen your market positioning?',
      positioningPlaceholder: 'Describe how goals reinforce positioning...',
      internalLabel: 'Internal Activation',
      internalDescription: 'How do employees become ambassadors of transformation?',
      internalPlaceholder: 'Describe internal activation strategy...',
      commThemesLabel: 'Communication Themes',
      commThemesPlaceholder: 'Add a communication theme...',
      commThemesEmpty: 'No communication themes defined',
      campaignLabel: 'Campaign Directions',
      campaignPlaceholder: 'Add a campaign direction...',
      campaignEmpty: 'No campaign directions defined',
    },
    about: {
      title: 'About Transformative Goals',
      body: "Transformative Goals bridge the gap between brand purpose and actionable strategy. Based on Jim Collins' BHAG framework, Salim Ismail's Massive Transformative Purpose, and Jim Stengel's Brand Ideal research. Brands with a clear transformative purpose grow 2-4x faster (Stengel 50 study), and 72% of consumers expect companies to drive positive social and environmental outcomes (EY).",
      frameworksLabel: 'Key Frameworks',
      frameworksValue:
        'BHAG (Collins), MTP (Ismail), Brand Ideal (Stengel), Moonshot Thinking (Google X)',
      connectionsLabel: 'Connection to Other Assets',
      connectionsValue:
        'Purpose Statement (foundation), Mission/Vision (expression), Brand Values (alignment)',
    },
    domains: {
      PEOPLE: 'People',
      PLANET: 'Planet',
      PROSPERITY: 'Prosperity',
    },
    timeframes: {
      SHORT: { label: 'Short-term', description: '1-3 years' },
      MEDIUM: { label: 'Medium-term', description: '3-10 years' },
      LONG: { label: 'Long-term', description: '10-25 years' },
      ASPIRATIONAL: { label: 'Aspirational', description: 'Ongoing horizon' },
    },
    goalCard: {
      goalNumber: 'Goal {{number}}',
      titleLabel: 'Title',
      titlePlaceholder: 'e.g. Zero Waste Production',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'What this goal entails...',
      impactDomainLabel: 'Impact Domain',
      timeframeLabel: 'Timeframe',
      timeframeYearPlaceholder: '2030',
      commitmentLabel: 'Measurable Commitment',
      commitmentPlaceholder: 'e.g. 99% of waste recycled by 2030',
      theoryLabel: 'Theory of Change',
      theoryPlaceholder: 'How brand activity creates this impact...',
      progressLabel: 'Current Progress ({{progress}}%)',
      milestonesLabel: 'Milestones',
      milestoneTargetPlaceholder: 'Milestone target...',
      sdgLabel: 'UN SDG Alignment',
      sdgCrossRef:
        'SDG alignment here links goals to global impact. For evidence-backed SDG commitments, see Social Relevancy.',
      removeGoal: 'Remove this goal',
      markAchieved: 'Mark milestone as achieved',
      markNotAchieved: 'Mark milestone as not achieved',
      commitmentView: 'Measurable Commitment',
      theoryView: 'Theory of Change',
      progressView: 'Progress',
      milestonesView: 'Milestones',
      sdgsView: 'SDGs:',
      sdgTag: 'SDG {{number}}',
    },
  },
  socialRelevancy: {
    grandTotal: {
      title: 'Social Relevancy Score',
      total: 'Total',
    },
    foundation: {
      title: 'Social Impact Foundation',
      subtitle: 'Why does this brand care about social impact?',
      impactStatementLabel: 'Impact Statement',
      impactStatementPlaceholder:
        'One powerful sentence: why does this brand care about social impact?',
      impactNarrativeLabel: 'Impact Narrative',
      impactNarrativePlaceholder:
        'The backstory: what was the trigger, founding moment, or evolution that led to this commitment?',
      activismLabel: 'Brand Activism Level',
      activismHint: '(Kotler & Sarkar)',
      activismEmpty: 'Not yet selected',
      referenceShow: 'Show Reference Frameworks',
      referenceHide: 'Hide Reference Frameworks',
    },
    pillar: {
      scoreLabel: 'Score:',
      evidenceLabel: 'Evidence',
      evidencePlaceholder: 'Concrete evidence supporting this score...',
      noEvidence: 'No evidence provided',
      targetLabel: 'Improvement target',
      targetPlaceholder: 'Specific goal...',
      timelineLabel: 'Timeline',
      timelinePlaceholder: 'e.g. Q4 2026',
      reflectionLabel: 'Pillar Reflection',
      reflectionPlaceholder: 'Free reflection on your {{pillar}} impact as a whole...',
      noReflection: 'No reflection yet',
    },
    authenticity: {
      title: 'Authenticity & Evidence',
      subtitle: 'Are the claims credible?',
      scoreSummary: 'Authenticity score: {{score}}%',
      walkTheTalk: 'Walk-the-Talk Assessment',
      overall: 'Overall authenticity:',
      proofLabel: 'Proof Points',
      proofPlaceholder: 'Add a concrete proof point...',
      proofEmpty: 'No proof points yet',
      certLabel: 'Certifications',
      certPlaceholder: 'Type certification and press Enter (e.g. B Corp, ISO 14001)',
      antiGreenLabel: 'Anti-Greenwashing Statement',
      antiGreenHint: '(honest acknowledgment of shortcomings)',
      antiGreenPlaceholder:
        'Where does the brand fall short? What are you honest about?',
    },
    activation: {
      title: 'Activation & Communication',
      subtitle: 'How is impact communicated and anchored?',
      sdgCrossRef:
        'For how your transformative goals map to SDGs, see Transformative Goals.',
      sdgLabel: 'UN Sustainable Development Goals',
      sdgHint: '(max 3 recommended)',
      sdgWarning:
        'Consider focusing on max 3 SDGs for clearer impact (SDG Compass)',
      commLabel: 'Communication Principles',
      commPlaceholder: 'Add a communication principle...',
      commEmpty: 'No communication principles defined',
      stakeholdersLabel: 'Key Stakeholders',
      stakeholdersPlaceholder: 'Type stakeholder and press Enter',
      channelsLabel: 'Activation Channels',
      channelsPlaceholder: 'Type channel and press Enter',
      annualLabel: 'Annual Commitment',
      annualPlaceholder: 'Concrete, measurable commitment for this year...',
    },
    scoreAria: 'Score {{n}}',
  },
} as const;

export default brandAssetDetail;
