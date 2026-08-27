"use client";

import { forwardRef, useState, useTransition } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Seg } from "@/components/ui/Seg";
import { RadioGroup } from "@/components/ui/Radio";
import { DIFFICULTIES, MEAL_TYPES } from "@/lib/ai/schema";
import { MEAL_LABELS, DIFFICULTY_LABELS } from "@/lib/ai/recipe-labels";
import { DIET_TAG_LABELS, DIET_TAG_ORDER } from "@/lib/ai/diet-labels";
import { normalizePantryKey } from "@/lib/recipes/pantry-match";
import { parsePantryEntry } from "@/lib/pantry/parse";
import { editRecipeSchema, type EditRecipeValues, type Visibility } from "@/lib/recipes/edit-schema";
import { publicEnv } from "@/lib/env";
import { updateRecipeAction, rewriteRecipeAction } from "./actions";

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Private — only you" },
  { value: "unlisted", label: "Unlisted — anyone with the link" },
  { value: "public", label: "Public — listed and linkable" },
];

const REWRITE_PRESETS = [
  "Make it simpler",
  "Make it faster",
  "Make it spicier",
  "Swap the main protein",
];

const DIRTY_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  summary: "Summary",
  meal_type: "Meal",
  cuisine: "Cuisine",
  difficulty: "Effort",
  prep_minutes: "Prep time",
  cook_minutes: "Cook time",
  servings: "Servings",
  ingredients: "Ingredients",
  steps: "Method",
  tags: "Tags",
  diet_tags: "Diet tags",
  visibility: "Sharing",
};

// forwardRef so useSortable's setActivatorNodeRef can be attached here —
// required whenever the drag handle is a different element than the
// sortable node itself (setNodeRef, on the row <div>). Without it,
// dnd-kit's activator check (event.target === active.activatorNode.current)
// never matches this button, and drag never starts at all, keyboard or
// pointer — confirmed live: keyboard reordering silently did nothing until
// this was wired up.
const DragHandle = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  function DragHandle(props, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="btn-icon btn-ghost cursor-grab touch-none"
      aria-label="Drag to reorder"
      {...props}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
  },
);

export function EditForm({
  recipeId,
  defaultValues,
  shareSlug,
}: {
  recipeId: string;
  defaultValues: EditRecipeValues;
  shareSlug: string | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<EditRecipeValues>({
    resolver: zodResolver(editRecipeSchema) as Resolver<EditRecipeValues>,
    defaultValues,
  });

  const ingredientsArray = useFieldArray({ control, name: "ingredients" });
  const stepsArray = useFieldArray({ control, name: "steps" });

  const [quickAdd, setQuickAdd] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savePending, startSaveTransition] = useTransition();
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [rewritePending, startRewriteTransition] = useTransition();
  const [customInstruction, setCustomInstruction] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibility = watch("visibility");
  const dietTags = watch("diet_tags");
  // formState.isDirty is unreliable here — a known react-hook-form/
  // useFieldArray interaction where isDirty reports true on first render
  // even though dirtyFields is genuinely empty and getValues() deep-equals
  // defaultValues exactly (confirmed directly: logged both and diffed
  // them). dirtyFields itself doesn't have this problem, so "any field
  // actually touched" is derived from its key count instead of isDirty.
  const hasChanges = Object.keys(dirtyFields).length > 0;
  const shareUrl = shareSlug ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/r/${shareSlug}` : null;

  function onIngredientDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ingredientsArray.fields.findIndex((f) => f.id === active.id);
    const newIndex = ingredientsArray.fields.findIndex((f) => f.id === over.id);
    ingredientsArray.move(oldIndex, newIndex);
  }

  function onStepDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stepsArray.fields.findIndex((f) => f.id === active.id);
    const newIndex = stepsArray.fields.findIndex((f) => f.id === over.id);
    stepsArray.move(oldIndex, newIndex);
  }

  function addQuickIngredient() {
    const value = quickAdd.trim();
    if (!value) return;
    const parsed = parsePantryEntry(value);
    const name = parsed.name || value;
    ingredientsArray.append({
      name,
      pantry_key: normalizePantryKey(name),
      quantity: parsed.quantity ?? undefined,
      unit: parsed.unit ?? undefined,
      optional: false,
    });
    setQuickAdd("");
  }

  function askForRewrite(instruction: string) {
    const trimmed = instruction.trim();
    if (!trimmed || rewritePending) return;
    setRewriteError(null);
    startRewriteTransition(async () => {
      const values = getValues();
      const content = {
        title: values.title,
        summary: values.summary,
        meal_type: values.meal_type,
        cuisine: values.cuisine,
        difficulty: values.difficulty,
        prep_minutes: values.prep_minutes,
        cook_minutes: values.cook_minutes,
        servings: values.servings,
        ingredients: values.ingredients,
        steps: values.steps,
        tags: values.tags,
        diet_tags: values.diet_tags,
      };
      const result = await rewriteRecipeAction(content, trimmed);
      if (!result.ok) {
        setRewriteError(result.error);
        return;
      }
      const recipe = result.recipe;
      setValue("title", recipe.title, { shouldDirty: true });
      setValue("summary", recipe.summary, { shouldDirty: true });
      setValue("meal_type", recipe.meal_type, { shouldDirty: true });
      setValue("cuisine", recipe.cuisine, { shouldDirty: true });
      setValue("difficulty", recipe.difficulty, { shouldDirty: true });
      setValue("prep_minutes", recipe.prep_minutes, { shouldDirty: true });
      setValue("cook_minutes", recipe.cook_minutes, { shouldDirty: true });
      setValue("servings", recipe.servings, { shouldDirty: true });
      setValue("tags", recipe.tags, { shouldDirty: true });
      setValue("diet_tags", recipe.diet_tags, { shouldDirty: true });
      ingredientsArray.replace(recipe.ingredients);
      stepsArray.replace(recipe.steps);
      setCustomInstruction("");
    });
  }

  function onSubmit(values: EditRecipeValues) {
    setSaveError(null);
    startSaveTransition(async () => {
      const result = await updateRecipeAction(recipeId, values);
      if (result && !result.ok) setSaveError(result.error);
    });
  }

  const changedLabels = Object.keys(dirtyFields)
    .map((key) => DIRTY_FIELD_LABELS[key] ?? key)
    .join(", ");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-4 rounded-[30px] bg-surface p-6">
        <Field label="Title" htmlFor="recipe-title">
          <input id="recipe-title" className="input" {...register("title")} />
          {errors.title ? <p className="mt-1 text-xs text-snack-800">{errors.title.message}</p> : null}
        </Field>

        <Field label="Summary" htmlFor="recipe-summary">
          <Textarea id="recipe-summary" rows={2} {...register("summary")} />
        </Field>

        <div className="flex flex-wrap gap-6">
          <div className="max-w-full overflow-x-auto">
            <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Meal</div>
            <Seg
              name="meal_type"
              value={watch("meal_type")}
              onChange={(v) => setValue("meal_type", v, { shouldDirty: true })}
              options={MEAL_TYPES.map((mt) => ({ value: mt, label: MEAL_LABELS[mt] }))}
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Effort</div>
            <Seg
              name="difficulty"
              value={watch("difficulty")}
              onChange={(v) => setValue("difficulty", v, { shouldDirty: true })}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
            />
          </div>
          <Field label="Cuisine" htmlFor="recipe-cuisine">
            <input id="recipe-cuisine" className="input w-36" {...register("cuisine")} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6">
          <Field label="Prep minutes" htmlFor="recipe-prep-minutes">
            <input
              id="recipe-prep-minutes"
              type="number"
              min={0}
              className="input w-28"
              {...register("prep_minutes", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Cook minutes" htmlFor="recipe-cook-minutes">
            <input
              id="recipe-cook-minutes"
              type="number"
              min={0}
              className="input w-28"
              {...register("cook_minutes", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Servings" htmlFor="recipe-servings">
            <input
              id="recipe-servings"
              type="number"
              min={1}
              className="input w-28"
              {...register("servings", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Diet tags</div>
          <div className="flex flex-wrap gap-2">
            {DIET_TAG_ORDER.map((tag) => {
              const checked = dietTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => {
                    const current = getValues("diet_tags");
                    setValue(
                      "diet_tags",
                      checked ? current.filter((t) => t !== tag) : [...current, tag],
                      { shouldDirty: true },
                    );
                  }}
                  className={`tag ${checked ? "tag-accent" : "tag-outline"}`}
                >
                  {DIET_TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
        </div>

        <TagsField
          label="Tags"
          value={watch("tags")}
          onChange={(v) => setValue("tags", v, { shouldDirty: true })}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Ingredients</h2>
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Quick add — “2 limes”, “a bag of rice”…"
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addQuickIngredient();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addQuickIngredient}>
            Add
          </Button>
        </div>

        <DndContext
          id="ingredients-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onIngredientDragEnd}
        >
          <SortableContext
            items={ingredientsArray.fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {ingredientsArray.fields.map((field, index) => (
                <SortableIngredientRow
                  key={field.id}
                  id={field.id}
                  index={index}
                  register={register}
                  onNameBlur={(name) =>
                    setValue(`ingredients.${index}.pantry_key`, normalizePantryKey(name))
                  }
                  onRemove={() => ingredientsArray.remove(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {errors.ingredients?.message ? (
          <p className="text-xs text-snack-800">{errors.ingredients.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Method</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => stepsArray.append({ text: "" })}
          >
            Add step
          </Button>
        </div>

        <DndContext
          id="steps-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onStepDragEnd}
        >
          <SortableContext items={stepsArray.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {stepsArray.fields.map((field, index) => (
                <SortableStepRow
                  key={field.id}
                  id={field.id}
                  index={index}
                  register={register}
                  onRemove={() => stepsArray.remove(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {errors.steps?.message ? (
          <p className="text-xs text-snack-800">{errors.steps.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <h2 className="text-lg">Ask for a rewrite</h2>
        <p className="text-xs text-[color:var(--color-muted)]">
          Sends this recipe back to the model with a change request. Review the result before saving.
        </p>
        <div className="flex flex-wrap gap-2">
          {REWRITE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={rewritePending}
              onClick={() => askForRewrite(preset)}
              className="tag tag-outline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Or describe your own change…"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={rewritePending || customInstruction.trim().length === 0}
            onClick={() => askForRewrite(customInstruction)}
          >
            {rewritePending ? "Asking…" : "Ask"}
          </Button>
        </div>
        {rewriteError ? <p className="text-xs text-snack-800">{rewriteError}</p> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <h2 className="text-lg">Sharing</h2>
        <RadioGroup
          name="visibility"
          value={visibility}
          onChange={(v) => setValue("visibility", v, { shouldDirty: true })}
          options={VISIBILITY_OPTIONS}
        />
        {visibility !== "private" ? (
          <p className="text-xs text-[color:var(--color-muted)]">
            {shareUrl
              ? <>Link: <code className="text-accent-700">{shareUrl}</code></>
              : "A link will be created the first time you save this."}
          </p>
        ) : null}
      </div>

      {hasChanges ? (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-[color:var(--color-divider)] bg-bg px-6 py-3.5 md:left-[214px]">
          <span className="text-xs text-[color:var(--color-muted)]">
            Unsaved changes: {changedLabels || "recipe"}
          </span>
          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" onClick={() => reset()} disabled={savePending}>
              Discard
            </Button>
            <Button type="submit" disabled={savePending}>
              {savePending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}
      {saveError ? <p className="text-xs text-snack-800">{saveError}</p> : null}
    </form>
  );
}

function TagsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    setDraft("");
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
  }

  return (
    <div>
      <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">{label}</div>
      <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-[color:var(--color-divider)] bg-bg p-2.5">
        {value.map((item) => (
          <span key={item} className="tag bg-accent-700 text-accent-contrast">
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((i) => i !== item))}
              className="ml-1.5"
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? "+ tag" : undefined}
          className="min-w-[100px] flex-1 border-0 bg-transparent px-2 py-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

type RegisterFn = ReturnType<typeof useForm<EditRecipeValues>>["register"];

function SortableIngredientRow({
  id,
  index,
  register,
  onNameBlur,
  onRemove,
}: {
  id: string;
  index: number;
  register: RegisterFn;
  onNameBlur: (name: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-2">
      <DragHandle ref={setActivatorNodeRef} {...attributes} {...listeners} />
      <input
        className="input order-1 min-w-[160px] flex-1 basis-full sm:basis-auto sm:flex-[2]"
        placeholder="Ingredient"
        {...register(`ingredients.${index}.name`, { onBlur: (e) => onNameBlur(e.target.value) })}
      />
      <input
        type="number"
        step="any"
        className="input order-2 w-20"
        placeholder="Qty"
        {...register(`ingredients.${index}.quantity`, {
          setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
        })}
      />
      <input
        className="input order-3 w-24"
        placeholder="Unit"
        {...register(`ingredients.${index}.unit`)}
      />
      <label className="order-4 flex items-center gap-1 whitespace-nowrap text-xs">
        <input type="checkbox" {...register(`ingredients.${index}.optional`)} />
        optional
      </label>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove ingredient"
        className="btn-icon btn-ghost order-5 ml-auto"
      >
        ×
      </button>
    </div>
  );
}

function SortableStepRow({
  id,
  index,
  register,
  onRemove,
}: {
  id: string;
  index: number;
  register: RegisterFn;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-start gap-2">
      <DragHandle
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="order-0 mt-1.5"
      />
      <Textarea
        rows={2}
        className="order-1 min-w-[200px] basis-full flex-1 sm:basis-auto"
        placeholder="Step"
        {...register(`steps.${index}.text`)}
      />
      <input
        type="number"
        min={1}
        className="input order-2 w-24"
        placeholder="Timer (min)"
        {...register(`steps.${index}.timer_minutes`, {
          setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
        })}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove step"
        className="btn-icon btn-ghost order-3 ml-auto"
      >
        ×
      </button>
    </div>
  );
}
