/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConstellationGenerationResult, BridgeResult } from '../types/constellation';

export const PRESET_CONSTELLATIONS: Record<string, ConstellationGenerationResult> = {
  'black holes': {
    subject: 'Black Holes',
    description:
      'Black holes are some of the most mysterious and fascinating objects in the universe. They are regions in space where the gravitational pull is so strong that nothing, not even light, can escape from them. Black holes can form in various ways, but they all share the same basic properties: a singularity at the center and an event horizon that marks the point of no return.',
    quiz: {
      question: 'What is a black hole?',
      options: [
        'A region in space where gravity is so strong that nothing can escape from it',
        'A type of star that emits a lot of light',
        'A hole in the ground that leads to another dimension',
        'A type of galaxy that is very bright',
      ],
      answerIndex: 0,
      explanation:
        'A black hole has gravity so intense that its escape velocity exceeds the speed of light.',
    },
    concepts: [
      {
        name: 'Formation',
        description: 'How black holes are born when massive dying stars run out of fuel and collapse under their own gravity.',
        subConcepts: ['Stellar Collapse', 'Supernova Explosions', 'Core Implosion'],
        quiz: {
          question: 'How do stellar-mass black holes typically form?',
          options: [
            'Through the collapse of massive stars at the end of their lives',
            'By colliding with asteroids',
            'From giant clouds of gas freezing solid',
            'When planets collide with moons',
          ],
          answerIndex: 0,
          explanation: 'When a massive star exhausts its nuclear fuel, its core collapses under its own gravity into a black hole.',
        },
      },
      {
        name: 'Structure',
        description: 'The physical anatomy of a black hole, from its central point to its boundary.',
        subConcepts: ['Accretion Disk', 'Event Horizon', 'Singularities'],
        quiz: {
          question: 'What is the point of no return around a black hole called?',
          options: ['Event Horizon', 'Singularity', 'Photon Sphere', 'Accretion Disk'],
          answerIndex: 0,
          explanation: 'The event horizon is the boundary beyond which nothing can escape the gravitational pull.',
        },
      },
      {
        name: 'Types',
        description: 'Black holes come in distinct size classes ranging from stellar mass to billions of suns.',
        subConcepts: ['Intermediate', 'Supermassive', 'Stellar-mass', 'Primordial'],
        quiz: {
          question: 'Which type of black hole sits at the centers of most galaxies?',
          options: ['Supermassive Black Hole', 'Micro Black Hole', 'Neutron Star', 'White Dwarf'],
          answerIndex: 0,
          explanation: 'Supermassive black holes, millions or billions of times the mass of the Sun, anchor galactic cores.',
        },
      },
      {
        name: 'Observation',
        description: 'How astronomers detect black holes indirectly through their effects on surrounding matter.',
        subConcepts: ['Gravitational Lensing', 'Event Horizon Telescope', 'X-Ray Jets'],
        quiz: {
          question: 'How do scientists image or detect black holes?',
          options: [
            'By observing gravitational lensing and glowing accretion disks',
            'By shining bright flashlights at them',
            'By sending astronauts into the horizon',
            'By listening for sound waves in space',
          ],
          answerIndex: 0,
          explanation: 'Scientists detect the light bending around them and the blazing gas swirling in their accretion disks.',
        },
      },
      {
        name: 'Effects',
        description: 'Extreme gravitational consequences like time slowing down and quantum radiation.',
        subConcepts: ['Time Dilation', 'Hawking Radiation', 'Spaghettification'],
        quiz: {
          question: 'What happens to time as you approach a black hole’s event horizon?',
          options: [
            'Time appears to slow down relative to a distant observer',
            'Time runs backwards',
            'Time completely stops everywhere in the galaxy',
            'Time speeds up infinitely',
          ],
          answerIndex: 0,
          explanation: 'General relativity shows that strong gravitational fields cause gravitational time dilation.',
        },
      },
    ],
  },

  cooking: {
    subject: 'Cooking',
    description:
      'Cooking is the art and everyday practice of preparing food with heat, flavors, and fresh ingredients. From simple 15-minute weeknight dinners to baking fresh bread, mastering basic kitchen skills makes cooking rewarding and fun.',
    quiz: {
      question: 'What is the most fundamental skill for efficient and safe home cooking?',
      options: [
        'Proper knife grip and basic chopping technique',
        'Buying the most expensive copper pans',
        'Memorizing 1,000 fancy French recipes',
        'Always using maximum high heat for everything',
      ],
      answerIndex: 0,
      explanation: 'Good knife skills and control make food preparation faster, safer, and result in evenly cooked meals.',
    },
    concepts: [
      {
        name: 'Cooking Basics',
        description: 'Essential kitchen skills, measuring, knife handling, and heat control.',
        subConcepts: ['Knife Skills', 'Salt & Seasoning', 'Heat Control', 'Pantry Essentials'],
        quiz: {
          question: 'When should you typically salt food during cooking for the best flavor?',
          options: [
            'Throughout the cooking process in stages',
            'Only at the very end at the dining table',
            'Never, salt ruins food',
            'Only before turning on the stove',
          ],
          answerIndex: 0,
          explanation: 'Layering salt throughout cooking draws out moisture and seasons ingredients from the inside out.',
        },
      },
      {
        name: 'Easy Meals',
        description: 'Quick 20-minute weeknight dinners that require minimal dishes and ingredients.',
        subConcepts: ['One-Pot Pastas', 'Sheet Pan Dinners', '15-Minute Stir-Fry', 'Skillet Chicken'],
        quiz: {
          question: 'What makes sheet pan meals so popular for weeknight cooking?',
          options: [
            'Everything roasts together on one tray for easy cleanup',
            'They require a wood-fired pizza oven',
            'They only work with cold raw food',
            'They take 6 hours to simmer',
          ],
          answerIndex: 0,
          explanation: 'Sheet pan meals allow meat and vegetables to roast simultaneously with just one pan to wash.',
        },
      },
      {
        name: 'Dinner Ideas',
        description: 'Hearty, crowd-pleasing mains, steaks, roasted chicken, and pasta classics.',
        subConcepts: ['Crispy Roast Chicken', 'Steak Searing', 'Creamy Pasta Carbonara', 'Rich Meat Stews'],
        quiz: {
          question: 'How do you get a great golden crust when searing steak or chicken?',
          options: [
            'Dry the meat surface with paper towels before hitting a hot pan',
            'Boil the meat in water first',
            'Keep the meat freezing cold and wet',
            'Cover the pan with a lid on low heat',
          ],
          answerIndex: 0,
          explanation: 'Moisture creates steam; patting the meat dry allows the Maillard reaction to create a crisp golden crust.',
        },
      },
      {
        name: 'Baking & Sweets',
        description: 'Fresh artisanal breads, cookies, cakes, and delicious oven-baked treats.',
        subConcepts: ['Chocolate Chip Cookies', 'Sourdough Bread', 'Banana Bread', 'Flaky Pie Crust'],
        quiz: {
          question: 'Why is accurate measuring especially important in baking compared to stovetop cooking?',
          options: [
            'Baking relies on exact chemical ratios of flour, liquid, fat, and leaveners',
            'Baking has no rules and you can eyeball anything',
            'Baking ovens cannot handle changes in temperature',
            'Sugar only melts if measured in ounces',
          ],
          answerIndex: 0,
          explanation: 'Baking is food science where precise ratios determine rise, texture, moisture, and gluten structure.',
        },
      },
      {
        name: 'Sauces & Spices',
        description: 'The secret to restaurant-level flavor: vinaigrettes, pan sauces, and herbs.',
        subConcepts: ['Garlic Butter Pan Sauce', 'Classic Tomato Marinara', 'Homemade Pesto', 'Herb Dressings'],
        quiz: {
          question: 'What is "deglazing" a pan after searing meat?',
          options: [
            'Adding liquid like broth or wine to dissolve the tasty browned bits on the bottom',
            'Washing the pan with cold soapy water while hot',
            'Throwing away the burnt bits immediately',
            'Sprinkling powdered sugar over the pan',
          ],
          answerIndex: 0,
          explanation: 'Deglazing dissolves the caramelized fond on the bottom of the pan into an intensely flavorful sauce.',
        },
      },
      {
        name: 'Breakfast & Brunch',
        description: 'Fluffy eggs, golden pancakes, breakfast sandwiches, and morning favorites.',
        subConcepts: ['Scrambled Eggs Technique', 'Fluffy Buttermilk Pancakes', 'Crispy Bacon', 'Breakfast Burritos'],
        quiz: {
          question: 'What is the secret to creamy, tender scrambled eggs?',
          options: [
            'Low and gentle heat with constant stirring',
            'Scorching maximum heat for 10 seconds',
            'Baking them in the oven for an hour',
            'Using cold unwhisked eggs straight into dry metal',
          ],
          answerIndex: 0,
          explanation: 'Low heat prevents egg proteins from seizing up and squeezing out liquid, keeping them soft and custardy.',
        },
      },
    ],
  },

  italy: {
    subject: 'Italy',
    description:
      'Italy is a Mediterranean country renowned for its world-famous food, rich ancient Roman history, Renaissance art, romantic canals, and breathtaking coastal landscapes.',
    quiz: {
      question: 'What is the capital city of Italy?',
      options: ['Rome', 'Milan', 'Venice', 'Florence'],
      answerIndex: 0,
      explanation: 'Rome, the Eternal City, is the capital of Italy and was the heart of the ancient Roman Empire.',
    },
    concepts: [
      {
        name: 'Food & Pasta',
        description: 'Authentic handmade pasta, Neapolitan wood-fired pizza, gelato, and espresso culture.',
        subConcepts: ['Handmade Tagliatelle', 'Neapolitan Pizza', 'Artisan Gelato', 'Espresso Culture'],
        quiz: {
          question: 'Which Italian city is world-famous as the birthplace of modern pizza?',
          options: ['Naples (Napoli)', 'Milan', 'Venice', 'Turin'],
          answerIndex: 0,
          explanation: 'Pizza Margherita was invented in Naples in honor of Queen Margherita of Savoy in 1889.',
        },
      },
      {
        name: 'Culture & Lifestyle',
        description: 'La Dolce Vita, evening strolls (passeggiata), vibrant piazzas, and family hospitality.',
        subConcepts: ['La Dolce Vita', 'The Passeggiata', 'Piazza Life', 'Italian Fashion & Design'],
        quiz: {
          question: 'What does the popular Italian expression "La Dolce Vita" mean?',
          options: ['The Sweet Life', 'The Fast Train', 'The Cold Winter', 'The Great Work'],
          answerIndex: 0,
          explanation: '"La Dolce Vita" translates to "The Sweet Life", celebrating enjoying good food, friends, and leisure.',
        },
      },
      {
        name: 'Venice & Canals',
        description: 'The romantic floating city of gondolas, bridges, marble palaces, and carnival masks.',
        subConcepts: ['Gondola Rides', 'Grand Canal', 'St. Mark’s Basilica', 'Murano Glass'],
        quiz: {
          question: 'What is the primary mode of transportation in the historic center of Venice?',
          options: [
            'Boats, gondolas, and walking on foot',
            'Subway trains and sports cars',
            'Bicycles and electric scooters',
            'Underground tramways',
          ],
          answerIndex: 0,
          explanation: 'Venice has no cars or roads in its historic island center; everything moves by foot or water.',
        },
      },
      {
        name: 'Rome & Ancient History',
        description: 'The Colosseum, Pantheon, Roman Forum, and historic Vatican City.',
        subConcepts: ['The Colosseum', 'Roman Forum', 'Vatican City', 'Trevi Fountain'],
        quiz: {
          question: 'Which ancient monument in Rome has a massive unreinforced concrete dome with an open oculus?',
          options: ['The Pantheon', 'The Colosseum', 'The Leaning Tower', 'Milan Cathedral'],
          answerIndex: 0,
          explanation: 'The Pantheon was built almost 2,000 years ago and remains the world’s largest unreinforced concrete dome.',
        },
      },
      {
        name: 'Florence & Renaissance',
        description: 'The cradle of the Renaissance, Michelangelo’s David, and the Uffizi Gallery.',
        subConcepts: ['Duomo Cathedral', 'Michelangelo’s David', 'Uffizi Gallery', 'Ponte Vecchio Bridge'],
        quiz: {
          question: 'Which famous artistic and cultural period began in Florence during the 14th century?',
          options: ['The Renaissance', 'The Industrial Revolution', 'The Baroque Era', 'The Romantic Period'],
          answerIndex: 0,
          explanation: 'Florence was the birthplace of the Italian Renaissance, sparked by artists like Leonardo da Vinci and Michelangelo.',
        },
      },
      {
        name: 'Amalfi & Landscapes',
        description: 'Dramatic cliffs, pastel cliffside villages, lemon groves, and the blue Mediterranean.',
        subConcepts: ['Positano Village', 'Capri Island', 'Tuscan Rolling Hills', 'Lake Como'],
        quiz: {
          question: 'What famous citrus fruit is celebrated on the Amalfi Coast for making limoncello?',
          options: ['Sorento Lemons', 'Blood Oranges', 'Grapefruits', 'Limes'],
          answerIndex: 0,
          explanation: 'Massive, fragrant Amalfi lemons grow on terraced hillsides and are used to brew authentic limoncello liqueur.',
        },
      },
    ],
  },
};

// Everyday, practical topic generator for ANY user search
export function generateEverydayConcepts(subject: string): ConstellationGenerationResult {
  const norm = subject.trim().toLowerCase();

  // 1. Check exact presets
  if (PRESET_CONSTELLATIONS[norm]) {
    return PRESET_CONSTELLATIONS[norm];
  }

  // 2. Specialized sensible templates based on subject category
  if (norm.includes('cook') || norm.includes('food') || norm.includes('baking') || norm.includes('recipe')) {
    return PRESET_CONSTELLATIONS['cooking'];
  }
  if (norm.includes('italy') || norm.includes('italian')) {
    return PRESET_CONSTELLATIONS['italy'];
  }
  if (norm.includes('black hole') || norm.includes('astronomy') || norm.includes('space')) {
    return PRESET_CONSTELLATIONS['black holes'];
  }

  // 3. Sensible Everyday Fallback Generator (Clear, practical, zero philosophical nonsense!)
  return {
    subject: subject.trim(),
    description: `${subject.trim()} is an engaging topic with many practical aspects, foundational techniques, and exciting areas to explore.`,
    quiz: {
      question: `What is the best way to get started with learning about ${subject.trim()}?`,
      options: [
        'Start with the core basics and practice step-by-step',
        'Try to do the most complicated part on day one',
        'Memorize a textbook without ever trying it',
        'Wait for someone else to do it for you',
      ],
      answerIndex: 0,
      explanation: `Mastering the fundamentals step-by-step is the most effective way to build confidence in ${subject.trim()}.`,
    },
    concepts: [
      {
        name: `${subject.trim()} Basics`,
        description: `Core fundamentals, essential terminology, and starting tips for ${subject.trim()}.`,
        subConcepts: ['Getting Started', 'Key Terminology', 'Essential Tools', 'First Steps'],
        quiz: {
          question: `Why are the basics essential in ${subject.trim()}?`,
          options: [
            'They provide the solid foundation for all advanced techniques',
            'They are the only thing you will ever need to know',
            'They make things unnecessarily complicated',
            'They are only meant for young children',
          ],
          answerIndex: 0,
          explanation: 'A strong grasp of the fundamentals makes learning advanced skills much easier and faster.',
        },
      },
      {
        name: 'Common Techniques & Methods',
        description: `Practical step-by-step techniques and standard practices used by enthusiasts and pros.`,
        subConcepts: ['Standard Workflows', 'Best Practices', 'Step-by-Step Guide'],
        quiz: {
          question: `What should you do when practicing a new technique?`,
          options: [
            'Practice slowly and focus on good form before speeding up',
            'Rush as fast as possible',
            'Ignore mistakes and never review your work',
            'Only practice once a year',
          ],
          answerIndex: 0,
          explanation: 'Practicing deliberately with good form builds correct muscle memory and understanding.',
        },
      },
      {
        name: 'Tools & Essentials',
        description: `Recommended equipment, gear, resources, and materials to succeed with ${subject.trim()}.`,
        subConcepts: ['Beginner Gear', 'Useful Software / Equipment', 'Maintenance & Care'],
        quiz: {
          question: `Do you need the most expensive equipment to begin ${subject.trim()}?`,
          options: [
            'No, simple reliable starter gear is usually best to begin with',
            'Yes, you cannot start without spending thousands of dollars',
            'Tools do not matter at all',
            'You must build all equipment from scratch',
          ],
          answerIndex: 0,
          explanation: 'Starting with simple, quality basics lets you learn what you actually need before upgrading.',
        },
      },
      {
        name: 'Popular Examples & Styles',
        description: `Famous examples, popular varieties, and inspiring benchmarks in ${subject.trim()}.`,
        subConcepts: ['Modern Trends', 'Classic Examples', 'Community Favorites'],
        quiz: {
          question: `Why is it helpful to study popular examples of ${subject.trim()}?`,
          options: [
            'It provides inspiration and shows what works well in the real world',
            'It guarantees you never have to think for yourself',
            'It is forbidden by experts',
            'It only works for theoretical exams',
          ],
          answerIndex: 0,
          explanation: 'Analyzing great real-world examples helps you understand key standards and gain inspiration.',
        },
      },
      {
        name: 'Tips & Mistakes to Avoid',
        description: `Practical troubleshooting, beginner pitfalls to dodge, and quick time-saving tricks.`,
        subConcepts: ['Top Beginner Mistakes', 'Time-Saving Shortcuts', 'Safety & Tips'],
        quiz: {
          question: `What is the most common pitfall beginners face?`,
          options: [
            'Skipping the basic steps and trying to do too much too fast',
            'Practicing too consistently',
            'Asking questions when confused',
            'Using the right tools for the job',
          ],
          answerIndex: 0,
          explanation: 'Taking time to build solid foundational habits prevents costly mistakes down the road.',
        },
      },
    ],
  };
}
