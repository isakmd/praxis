import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Plus, Trash, GripVertical } from 'lucide-react';
import { QuizSlideConfig } from '../SlideEditor';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
//import type { AbstractIntlMessages } from 'next-intl';

interface QuizSlideProps {
  config: QuizSlideConfig;
  onConfigChange: (configUpdate: Partial<QuizSlideConfig>) => void;
}

// Sortable option component
const SortableOption = ({
  id,
  option,
  index,
  isCorrect,
  multipleCorrect,
  onUpdate,
  onRemove,
  onToggleCorrect,
  t
}: {
  id: string;
  option: string;
  index: number;
  isCorrect: boolean;
  multipleCorrect: boolean;
  onUpdate: (value: string) => void;
  onRemove: () => void;
  onToggleCorrect: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div className="cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-md text-xs font-medium">
        {index + 1}
      </div>
      <Input
        placeholder={`${t('slides.quiz.optionPlaceholder')} ${index + 1}`}
        value={option}
        onChange={(e) => onUpdate(e.target.value)}
        className="flex-1"
      />
      <Button
        type="button"
        variant={isCorrect ? "default" : "outline"}
        size="sm"
        onClick={onToggleCorrect}
        className="h-8 px-2"
      >
        {multipleCorrect ? (isCorrect ? t('slides.quiz.selected') : t('slides.quiz.select')) : t('slides.quiz.correct')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRemove}
        className="h-8 px-2 text-red-500 hover:text-red-600"
      >
        <Trash className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export const QuizSlideContent = ({ config, onConfigChange }: QuizSlideProps) => {
  const t = useTranslations();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add a quiz option
  const addQuizOption = () => {
    const updatedOptions = [...config.options, ''];
    const updatedExplanations = [...(config.explanations || []), ''];
    const updatedOptionImages = [...(config.optionImages || []), ''];

    onConfigChange({
      options: updatedOptions,
      explanations: updatedExplanations,
      optionImages: updatedOptionImages,
    });
  };

  // Remove a quiz option
  const removeQuizOption = (optionIndex: number) => {
    const updatedOptions = [...config.options];
    updatedOptions.splice(optionIndex, 1);

    const updatedExplanations = [...(config.explanations || [])];
    updatedExplanations.splice(optionIndex, 1);

    const updatedOptionImages = [...(config.optionImages || [])];
    updatedOptionImages.splice(optionIndex, 1);

    // Update correct option indices if needed
    let updatedCorrectOptionIndices = [...(config.correctOptionIndices || [])];

    if (config.multipleCorrect) {
      // For multiple correct answers
      updatedCorrectOptionIndices = updatedCorrectOptionIndices
        .filter(index => index !== optionIndex)
        .map(index => index > optionIndex ? index - 1 : index);
    } else {
      // For single correct answer
      let correctOptionIndex = config.correctOptionIndex;
      if (optionIndex === correctOptionIndex) {
        correctOptionIndex = 0;
      } else if (optionIndex < correctOptionIndex) {
        correctOptionIndex--;
      }

      onConfigChange({
        options: updatedOptions,
        explanations: updatedExplanations,
        optionImages: updatedOptionImages,
        correctOptionIndex,
      });
      return;
    }

    onConfigChange({
      options: updatedOptions,
      explanations: updatedExplanations,
      optionImages: updatedOptionImages,
      correctOptionIndices: updatedCorrectOptionIndices,
    });
  };

  // Update a quiz option
  const updateQuizOption = (optionIndex: number, value: string) => {
    const updatedOptions = [...config.options];
    updatedOptions[optionIndex] = value;

    onConfigChange({
      options: updatedOptions
    });
  };

  // Set correct quiz option(s)
  const setCorrectQuizOption = (optionIndex: number) => {
    if (config.multipleCorrect) {
      // For multiple correct answers
      const updatedCorrectOptionIndices = [...(config.correctOptionIndices || [])];
      const index = updatedCorrectOptionIndices.indexOf(optionIndex);

      if (index === -1) {
        updatedCorrectOptionIndices.push(optionIndex);
      } else {
        updatedCorrectOptionIndices.splice(index, 1);
      }

      onConfigChange({
        correctOptionIndices: updatedCorrectOptionIndices
      });
    } else {
      // For single correct answer
      onConfigChange({
        correctOptionIndex: optionIndex
      });
    }
  };

  // Handle drag end for reordering options
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = config.options.findIndex((_, i) => `option-${i}` === active.id);
      const newIndex = config.options.findIndex((_, i) => `option-${i}` === over.id);

      const updatedOptions = arrayMove([...config.options], oldIndex, newIndex);

      // Also update explanations and images if they exist
      const updatedExplanations = config.explanations
        ? arrayMove([...config.explanations], oldIndex, newIndex)
        : undefined;

      const updatedOptionImages = config.optionImages
        ? arrayMove([...config.optionImages], oldIndex, newIndex)
        : undefined;

      // Update correct option indices
      if (config.multipleCorrect) {
        const updatedCorrectOptionIndices = config.correctOptionIndices?.map(index => {
          if (index === oldIndex) return newIndex;
          if (index === newIndex) return oldIndex;
          return index;
        });

        onConfigChange({
          options: updatedOptions,
          explanations: updatedExplanations,
          optionImages: updatedOptionImages,
          correctOptionIndices: updatedCorrectOptionIndices,
        });
      } else {
        let correctOptionIndex = config.correctOptionIndex;
        if (correctOptionIndex === oldIndex) {
          correctOptionIndex = newIndex;
        } else if (correctOptionIndex === newIndex) {
          correctOptionIndex = oldIndex;
        }

        onConfigChange({
          options: updatedOptions,
          explanations: updatedExplanations,
          optionImages: updatedOptionImages,
          correctOptionIndex,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t('slides.quiz.description')}</label>
            <span className="text-xs text-muted-foreground">{t('slides.quiz.optional')}</span>
          </div>
          <Input
            placeholder={t('slides.quiz.descInp')}
            value={config.description || ''}
            onChange={(e) => onConfigChange({ description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('slides.quiz.question')}</label>
          <Input
            placeholder={t('slides.quiz.questionPlaceholder')}
            value={config.question || ''}
            onChange={(e) => onConfigChange({ question: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">{t('slides.quiz.options')}</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuizOption}
            className="h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> {t('slides.quiz.addOption')}
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={config.options.map((_, i) => `option-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            {config.options.map((option: string, optionIndex: number) => (
              <div key={optionIndex}>
                <SortableOption
                  id={`option-${optionIndex}`}
                  option={option}
                  index={optionIndex}
                  isCorrect={config.multipleCorrect
                    ? (config.correctOptionIndices || []).includes(optionIndex)
                    : config.correctOptionIndex === optionIndex
                  }
                  multipleCorrect={config.multipleCorrect || false}
                  onUpdate={(value) => updateQuizOption(optionIndex, value)}
                  onRemove={() => removeQuizOption(optionIndex)}
                  onToggleCorrect={() => setCorrectQuizOption(optionIndex)}
                  t={t}
                />
              </div>
            ))}
          </SortableContext>
        </DndContext>

        <p className="text-xs text-muted-foreground">
          {config.multipleCorrect
            ? t('slides.quiz.selectMultiple')
            : t('slides.quiz.selectOne')}
        </p>
      </div>
    </div>
  );
};

export const QuizSlideTypeBadge = () => {
  const t = useTranslations();
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
      <ListTodo className="h-3 w-3 mr-1" /> {t('slides.common.quizSlide')}
    </Badge>
  );
};

// Get default quiz config
export const getDefaultQuizSlideConfig = (): QuizSlideConfig => {
  return {
    type: 'quiz',
    question: '',
    description: '',
    options: ['', '', ''],
    correctOptionIndex: 0,
    explanations: ['', '', ''],
    optionImages: ['', '', ''],
    shuffleOptions: false,
    multipleCorrect: false,
    correctOptionIndices: [],
    isRequired: true,
  };
};

// Create default quiz config
export const createDefaultQuizSlideConfig = (): QuizSlideConfig => {
  return getDefaultQuizSlideConfig();
};

export default QuizSlideContent;
