import React from "react";
import { Box, IconButton, Stack } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/** Ширина одного уровня вложенности. */
const LEVEL_WIDTH = 22;

export type TreeGuides = {
  /**
   * Для каждого уровня-предка: продолжается ли его ветка ниже текущей строки.
   * Длина массива — число уровней между корнем и родителем узла.
   */
  guides: boolean[];
  /** Узел — последний среди соседей: уголок «└», а не «├». */
  isLastChild: boolean;
};

/**
 * Ячейка узла дерева: направляющие линии уровней, уголок к самому узлу и
 * кнопка раскрытия. Ставится в столбец с cellSx={{ py: 0 }} — тогда линии
 * занимают всю высоту строки и стыкуются между соседними строками.
 */
export function TreeBranchCell({
  depth,
  guides,
  isLastChild,
  hasChildren,
  expanded,
  onToggle,
  children
}: TreeGuides & {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const levels = Math.max(0, depth - 1);

  return (
    <Stack direction="row" alignItems="stretch" sx={{ minHeight: 44 }}>
      {Array.from({ length: levels }).map((_, index) => {
        const isElbow = index === levels - 1;
        // Сквозная линия уровня-предка либо продолжение ветки соседей узла.
        const continuesBelow = isElbow ? !isLastChild : Boolean(guides[index]);
        // На «транзитных» уровнях линия либо идёт через всю строку, либо её нет
        // вовсе: обрубок до середины рисуется только у уголка самого узла.
        const showLine = isElbow || continuesBelow;
        return (
          <Box key={index} sx={{ width: LEVEL_WIDTH, flexShrink: 0, position: "relative" }}>
            {showLine && (
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: continuesBelow ? 0 : "50%",
                  borderLeft: "1px solid var(--border)"
                }}
              />
            )}
            {isElbow && (
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  right: 0,
                  top: "50%",
                  borderTop: "1px solid var(--border)"
                }}
              />
            )}
          </Box>
        );
      })}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            sx={{ flexShrink: 0 }}
          >
            {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 30, flexShrink: 0 }} />
        )}
        {children}
      </Stack>
    </Stack>
  );
}

/**
 * Раскладывает дерево в плоский список видимых строк и попутно считает
 * направляющие для отрисовки ветвления.
 */
export function flattenTree<T>({
  items,
  getId,
  getParentId,
  expandedIds,
  sortSiblings
}: {
  items: T[];
  getId: (item: T) => number;
  getParentId: (item: T) => number | null;
  expandedIds: Set<number>;
  sortSiblings?: (items: T[]) => T[];
}) {
  const known = new Set(items.map(getId));
  const childrenMap = new Map<number | null, T[]>();

  items.forEach((item) => {
    const parentId = getParentId(item);
    const key = parentId && known.has(parentId) ? parentId : null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(item);
  });

  const order = (list: T[]) => (sortSiblings ? sortSiblings(list) : list);

  const result: Array<
    T & TreeGuides & { treeDepth: number; hasChildren: boolean; childrenCount: number }
  > = [];

  const walk = (node: T, depth: number, guides: boolean[], isLastChild: boolean) => {
    const children = order(childrenMap.get(getId(node)) || []);
    result.push({
      ...node,
      treeDepth: depth,
      hasChildren: children.length > 0,
      childrenCount: children.length,
      guides,
      isLastChild
    });
    if (!expandedIds.has(getId(node))) return;
    const childGuides = depth === 1 ? [] : [...guides, !isLastChild];
    children.forEach((child, index) => walk(child, depth + 1, childGuides, index === children.length - 1));
  };

  const roots = order(childrenMap.get(null) || []);
  roots.forEach((root, index) => walk(root, 1, [], index === roots.length - 1));
  return result;
}
