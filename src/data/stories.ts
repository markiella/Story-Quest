import type { Category, Story, StoryData, StoryEvent } from '../types';
import { allStories } from './stories/index';

// ─── Adapter ─────────────────────────────────────────────────────────────────
// Converts the rich StoryData format (used by the new story database) into the
// Story format consumed by the game engine (EventSequencer).
//
// Mapping:
//   StoryData.story       → Story.fullStory
//   StoryData.storySteps  → Story.events   (sorted by .sequence)
//   StoryData.storySteps  → Story.correctOrder (sorted ids)

function adaptToGameStory(sd: StoryData): Story {
  const sortedSteps = [...sd.storySteps].sort((a, b) => a.sequence - b.sequence);

  const events: StoryEvent[] = sortedSteps.map(step => ({
    id:   step.id,
    text: step.text,
  }));

  const correctOrder: string[] = sortedSteps.map(step => step.id);

  return {
    id:           sd.id,
    category:     sd.category,
    title:        sd.title,
    fullStory:    sd.story,
    events,
    correctOrder,
  };
}

// ─── Exported story list (all 85 stories, adapted for the game engine) ────────
export const stories: Story[] = allStories.map(adaptToGameStory);

// ─── Category metadata (images, colours, descriptions) ───────────────────────
// Record<Category, ...> ensures TypeScript errors if any Category value is missing an entry.
export const categoryMeta: Record<Category, { image: string; color: string; border: string; desc: string }> = {
  Fable:              { image: '/cat_fable.png',   color: '#7c4f2a', border: '#a0622e', desc: 'Wise animal tales with life lessons' },
  Myth:               { image: '/cat_myth.png',    color: '#1a3a5c', border: '#2563a8', desc: 'Legendary stories of gods and heroes' },
  'Realistic Fiction':{ image: '/cat_fiction.png', color: '#2d7a3a', border: '#3a9e4a', desc: 'Everyday adventures of real-life kids' },
  Legend:             { image: '/cat_legend.png',  color: '#6b2d8b', border: '#9b3dbb', desc: 'Heroic tales passed down through time' },
  'Grade 5':          { image: '/cat_grade5.png',  color: '#7a5c1a', border: '#b08a2a', desc: 'Curated stories for Grade 5 readers' },
  'Grade 6':          { image: '/cat_grade6.png',  color: '#1a3a6b', border: '#2a5aab', desc: 'Curated stories for Grade 6 readers' },
};

