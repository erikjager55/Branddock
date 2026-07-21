// Canonical (source-of-truth) English UI strings — `consistent-models-registry` namespace.
// Render-edge translations for the data-driven constant registries in
// `src/features/consistent-models/constants/model-constants.ts`. The constant
// file stays the English source-of-truth; these keys mirror the STABLE
// enum / slug identifiers used at each render site.
const ns = {
  // Render-edge: TYPE_CONFIG label + description (ModelTypeBadge, ModelFilterBar
  // pills, CreateModelModal type selector), keyed on ConsistentModelType.
  // Only the types visible in the UI — STYLE/BRAND_STYLE/VOICE/SOUND_EFFECT are
  // in HIDDEN_MODEL_TYPES and never rendered.
  type: {
    PERSON: {
      label: 'Model',
      description: 'Train on faces and people for consistent portrait generation',
    },
    PRODUCT: {
      label: 'Product',
      description: 'Train on product photos for consistent product imagery',
    },
    OBJECT: {
      label: 'Object',
      description: 'Train on specific objects for consistent representation',
    },
    PHOTOGRAPHY: {
      label: 'Photography',
      description: 'Train on photography styles for consistent photo aesthetics',
    },
    ILLUSTRATION: {
      label: 'Illustration',
      description: 'Train on illustration styles for consistent visual language',
    },
  },
  // Render-edge: STATUS_CONFIG label (ModelStatusBadge), keyed on ConsistentModelStatus.
  status: {
    DRAFT: 'Draft',
    UPLOADING: 'Uploading',
    TRAINING: 'Training',
    TRAINING_FAILED: 'Failed',
    READY: 'Ready',
    ARCHIVED: 'Archived',
  },
  // Render-edge: STATUS_FILTER_OPTIONS (ModelFilterBar status Select), keyed on
  // the status value ('' -> `all`).
  statusFilter: {
    all: 'All Statuses',
    DRAFT: 'Draft',
    TRAINING: 'Training',
    READY: 'Ready',
    ARCHIVED: 'Archived',
  },
  // Render-edge: GENERATION_PRESETS label (GenerateSection size buttons), keyed
  // on the preset key.
  preset: {
    square: 'Square (1:1)',
    portrait: 'Portrait (3:4)',
    landscape: 'Landscape (4:3)',
    wide: 'Wide (3:2)',
  },
  // Render-edge: WIZARD_STEPS_* labels (ModelWizardStepper), keyed by step slug.
  // Only the reachable step sets: own-images, synthetic, illustration-trainable.
  wizardStep: {
    upload: 'Upload',
    trainingShowcase: 'Training & Showcase',
    generateReferences: 'Generate References',
    showcase: 'Showcase',
    uploadCurate: 'Upload & Curate',
    aiStyleAnalysis: 'AI Style Analysis',
  },
  // Render-edge: TYPE_GENERATION_FIELDS label / placeholder / option labels
  // (GenerateReferencesSection synthetic flow), keyed on ConsistentModelType +
  // field key + option value. Only the trainable non-illustration types reach
  // this screen (PERSON / PRODUCT / OBJECT / PHOTOGRAPHY).
  field: {
    PERSON: {
      gender: {
        label: 'Gender',
        placeholder: 'Select gender',
        options: { male: 'Male', female: 'Female', 'non-binary': 'Non-binary' },
      },
      age: {
        label: 'Age Range',
        placeholder: 'Select age range',
        options: { '20s': '20s', '30s': '30s', '40s': '40s', '50s': '50s', '60s': '60+' },
      },
      ethnicity: {
        label: 'Ethnicity',
        placeholder: 'Select ethnicity',
        options: {
          caucasian: 'Caucasian',
          black: 'Black',
          asian: 'Asian',
          hispanic: 'Hispanic / Latino',
          'middle-eastern': 'Middle Eastern',
          'south-asian': 'South Asian',
          mixed: 'Mixed',
        },
      },
      hairColor: {
        label: 'Hair Color',
        placeholder: 'Select hair color',
        options: {
          black: 'Black',
          'dark-brown': 'Dark Brown',
          'light-brown': 'Light Brown',
          blonde: 'Blonde',
          red: 'Red / Auburn',
          gray: 'Gray / Silver',
          bald: 'Bald / Shaved',
        },
      },
      hairStyle: {
        label: 'Hair Style',
        placeholder: 'Select hair style',
        options: {
          short: 'Short',
          medium: 'Medium length',
          long: 'Long',
          curly: 'Curly',
          wavy: 'Wavy',
          straight: 'Straight',
          'buzz-cut': 'Buzz cut',
          ponytail: 'Ponytail / Up',
        },
      },
      build: {
        label: 'Build',
        placeholder: 'Select build',
        options: { slim: 'Slim', average: 'Average', athletic: 'Athletic', stocky: 'Stocky / Broad' },
      },
      clothing: {
        label: 'Clothing Style',
        placeholder: 'e.g. business suit, casual shirt, turtleneck',
      },
      distinctiveFeatures: {
        label: 'Distinctive Features',
        placeholder: 'e.g. glasses, beard, freckles, dimples, scar on left cheek',
      },
      expression: {
        label: 'Default Expression',
        placeholder: 'Select expression',
        options: {
          neutral: 'Neutral',
          'friendly-smile': 'Friendly smile',
          confident: 'Confident / Serious',
          approachable: 'Approachable / Warm',
          professional: 'Professional / Composed',
        },
      },
      skinDetails: {
        label: 'Skin & Complexion',
        placeholder: 'e.g. fair skin, warm undertone, light tan, dark complexion',
      },
      avoid: {
        label: "Don'ts",
        placeholder: 'What should not be shown (e.g. tattoos, piercings, hats)',
      },
    },
    PRODUCT: {
      productDescription: {
        label: 'Product Description',
        placeholder: 'Describe the product (shape, material, color, dimensions)',
      },
      textAndLabels: {
        label: 'Text & Labels on Product',
        placeholder:
          "Exact text, brand name, or labels that must appear on the product (e.g. 'ACME Co' on front, nutrition label on back)",
      },
      logoPlacement: {
        label: 'Logo Placement',
        placeholder: 'Where the logo appears (e.g. centered on front, top-left corner, embossed on lid)',
      },
      materialTexture: {
        label: 'Material & Texture',
        placeholder: 'e.g. matte black aluminum, glossy glass, kraft paper, brushed steel',
      },
      colorAccuracy: {
        label: 'Critical Colors',
        placeholder: 'Exact colors that must be accurate (e.g. Pantone 2925 C blue cap, white body)',
      },
      setting: {
        label: 'Setting',
        placeholder: 'Select a setting',
        options: {
          'white-background': 'White Background',
          lifestyle: 'Lifestyle',
          'in-use': 'In Use',
          flatlay: 'Flatlay',
        },
      },
      angles: {
        label: 'Angles',
        placeholder: 'Select an angle',
        options: {
          front: 'Front View',
          '45-degree': '45°',
          'top-down': 'Top Down',
          'detail-closeup': 'Detail Close-up',
        },
      },
      scaleReference: {
        label: 'Scale Reference',
        placeholder: 'Size context (e.g. fits in one hand, 30cm tall, desktop-sized)',
      },
      avoid: {
        label: "Don'ts",
        placeholder: 'What should not be visible (e.g. no competitor logos, no wrong color variants)',
      },
    },
    OBJECT: {
      objectDescription: {
        label: 'Object Description',
        placeholder: 'Describe the object (shape, material, size, weight)',
      },
      surfaceDetails: {
        label: 'Surface Details',
        placeholder: 'e.g. engraved text, printed logo, embossed pattern, serial number',
      },
      materialFinish: {
        label: 'Material & Finish',
        placeholder: 'e.g. polished chrome, raw wood, matte ceramic, transparent glass',
      },
      setting: {
        label: 'Setting',
        placeholder: 'Select a setting',
        options: {
          'white-background': 'White Background',
          'in-context': 'In Context',
          isolated: 'Isolated',
          'scale-reference': 'Scale Reference',
        },
      },
      lighting: {
        label: 'Lighting',
        placeholder: 'Select lighting',
        options: { studio: 'Studio', natural: 'Natural', dramatic: 'Dramatic', soft: 'Soft' },
      },
      scaleContext: {
        label: 'Scale Context',
        placeholder: 'e.g. palm-sized, desktop-sized, person-height, room-filling',
      },
      avoid: { label: "Don'ts", placeholder: 'What should not be shown' },
    },
    PHOTOGRAPHY: {
      subject: { label: 'Subject', placeholder: 'Subject of the photos' },
      photoStyle: {
        label: 'Photo Style',
        placeholder: 'Select a style',
        options: {
          portrait: 'Portrait',
          landscape: 'Landscape',
          macro: 'Macro',
          street: 'Street',
          product: 'Product Photography',
        },
      },
      lighting: {
        label: 'Lighting',
        placeholder: 'Select lighting',
        options: {
          natural: 'Natural',
          studio: 'Studio',
          'golden-hour': 'Golden Hour',
          'high-key': 'High-key',
          'low-key': 'Low-key',
        },
      },
      colorGrading: {
        label: 'Color Grading',
        placeholder: 'e.g. warm tones, desaturated, high contrast, film emulation (Portra 400)',
      },
      postProcessing: {
        label: 'Post-Processing Style',
        placeholder: 'e.g. grain, vignette, split toning, clean retouching',
      },
      depthOfField: {
        label: 'Depth of Field',
        placeholder: 'Select depth of field',
        options: {
          shallow: 'Shallow (blurred background)',
          medium: 'Medium',
          deep: 'Deep (everything sharp)',
        },
      },
      avoid: {
        label: "Don'ts",
        placeholder: 'What to avoid (e.g. no HDR look, no over-saturated colors)',
      },
    },
  },
} as const;

export default ns;
