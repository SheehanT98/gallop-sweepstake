"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Sparkles } from "lucide-react";
import type { WrappedFact } from "@/lib/wrapped/types";
import { cn } from "@/lib/utils";

type SortableFactListProps = {
  facts: WrappedFact[];
  onReorder: (ids: string[]) => void;
};

export function SortableFactList({ facts, onReorder }: SortableFactListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = facts.map((f) => f.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {facts.map((fact, i) => (
            <SortableRow key={fact.id} fact={fact} index={i} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ fact, index }: { fact: WrappedFact; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: fact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-3",
        isDragging && "z-10 opacity-90 shadow-lg",
      )}
    >
      <button
        type="button"
        className="touch-none text-white/40 hover:text-white"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-xs font-bold text-emerald-200">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-white/40">{fact.category}</p>
        <p className="truncate font-semibold text-white">{fact.headline}</p>
      </div>
      {fact.visual && fact.visual !== "default" ? (
        <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : null}
    </li>
  );
}
