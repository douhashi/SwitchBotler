import { Fragment, type HTMLAttributes, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpFromLine } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReorderDirection } from "@/stores/favorites-store";
import { FavoriteContextMenu } from "./favorite-context-menu";
import { FavoritesSection } from "./favorites-section";
import { ReorderControls } from "./reorder-controls";
import { useFavoritesDnd } from "./use-favorites-dnd";

/** 行に渡る props。カード側（DeviceCard / SceneRow）がそのまま spread できる形にする。 */
export type FavoriteRowProps = {
  /** 操作系の差し替え（並び替えモードの ↑↓）。未指定ならカード既定の操作系。 */
  control?: ReactNode;
  dragProps: HTMLAttributes<HTMLElement> & {
    draggable?: boolean;
    "data-fav-id"?: string;
  };
  dragging: boolean;
  /** 読み上げ用（お気に入りでは「N 件中 M 番目」を含む）。 */
  label?: string;
};

type Identified = { id: string; name: string };

/**
 * 「お気に入り＝ドロップ先」の盤面。デバイスにもシーンにも同じものを使う。
 *
 * - お気に入りへ落とす → **登録**（落とした位置がそのまま並び順）
 * - お気に入りの中で落とす → **並び替え**（同じ操作）
 * - その他へ落とす → **解除**
 *
 * 登録は「移動」なので、その他のセクションからは消える（**居場所そのものが状態**）。
 * ドラッグはポインタ専用の経路なので、キーボード代替（コンテキストメニュー / ↑↓）を必ず併設する。
 */
export function FavoritesBoard<T extends Identified>({
  items,
  favoritesTitle,
  restTitle,
  favoriteIds,
  place,
  remove,
  toggle,
  move,
  renderRow,
}: {
  /** お気に入りに入れられる全件（お気に入り・その他の両方をここから引く）。 */
  items: T[];
  favoritesTitle: string;
  restTitle: string;
  /** お気に入りの id（この並びが表示順）。 */
  favoriteIds: string[];
  place: (id: string, index: number) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  move: (id: string, direction: ReorderDirection) => void;
  renderRow: (item: T, props: FavoriteRowProps) => ReactNode;
}) {
  const { t } = useTranslation("common");
  const [editing, setEditing] = useState(false);
  const {
    draggingId,
    insertAt,
    overRemove,
    cardProps,
    favoritesZoneProps,
    removeZoneProps,
  } = useFavoritesDnd({ favoriteIds, onPlace: place, onRemove: remove });

  const favorites = favoriteIds
    .map((id) => items.find((x) => x.id === id))
    .filter((x): x is T => x !== undefined);
  const rest = items.filter((x) => !favoriteIds.includes(x.id));

  if (items.length === 0) return null;

  return (
    <>
      {/* お気に入り = ドロップ先。空でも必ず出す（そうしないとドラッグできると気づけない）。 */}
      <FavoritesSection
        title={favoritesTitle}
        count={favorites.length}
        editing={editing}
        onToggleEditing={() => setEditing((v) => !v)}
        zoneProps={favoritesZoneProps}
        active={draggingId !== null && insertAt !== null}
      >
        {/* listitem は list の直下に置く（ラッパで挟まない）。 */}
        {favorites.map((item, index) => (
          <Fragment key={item.id}>
            {/* 落とし込み位置の目印（ここに入る、が見える）。 */}
            {insertAt === index && <DropLine />}
            <FavoriteContextMenu
              favorite
              onAdd={() => toggle(item.id)}
              onRemove={() => remove(item.id)}
            >
              {renderRow(item, {
                dragProps: cardProps(item.id),
                dragging: draggingId === item.id,
                label: t("favorites.positionAria", {
                  name: item.name,
                  position: index + 1,
                  total: favorites.length,
                }),
                control: editing ? (
                  <ReorderControls
                    name={item.name}
                    canMoveUp={index > 0}
                    canMoveDown={index < favorites.length - 1}
                    onMoveUp={() => move(item.id, "up")}
                    onMoveDown={() => move(item.id, "down")}
                  />
                ) : undefined,
              })}
            </FavoriteContextMenu>
          </Fragment>
        ))}
        {insertAt === favorites.length && <DropLine />}
      </FavoritesSection>

      {/* その他 = お気に入りに入っていないもの。ここへ落とすとお気に入りから外れる。
          **空でも必ず出す。** ここが解除の唯一のドロップ先なので、全件をお気に入りに入れた
          瞬間にこのセクションが消えると、ドラッグでは二度と戻せなくなる。 */}
      <section
        {...removeZoneProps}
        className={cn(
          "rounded-2xl p-2.5 transition-colors",
          // 解除は破壊寄りの操作なので赤系。お気に入りへ入れる側（インディゴ）と対にする。
          // outline を使うのは、ring が box-shadow で描かれ shadow-inset と奪い合うため。
          overRemove &&
            "bg-destructive/5 outline-2 -outline-offset-2 outline-destructive",
        )}
      >
        <h2 className="mb-2 px-0.5 text-xs font-semibold text-muted-foreground">
          {restTitle}
        </h2>
        <div
          role="list"
          aria-label={restTitle}
          className={cn(
            rest.length > 0
              ? "grid-cards"
              : "grid min-h-[76px] place-items-center rounded-2xl p-2.5 shadow-inset",
          )}
        >
          {rest.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-4 text-center">
              <ArrowUpFromLine
                size={18}
                strokeWidth={1.9}
                className="text-muted-foreground"
              />
              <span className="text-[12.5px] text-muted-foreground">
                {t("favorites.removeHint")}
              </span>
            </div>
          ) : (
            rest.map((item) => (
              <FavoriteContextMenu
                key={item.id}
                favorite={false}
                onAdd={() => toggle(item.id)}
                onRemove={() => remove(item.id)}
              >
                {renderRow(item, {
                  dragProps: cardProps(item.id),
                  dragging: draggingId === item.id,
                })}
              </FavoriteContextMenu>
            ))
          )}
        </div>
      </section>
    </>
  );
}

/** ドロップ位置の目印。 */
function DropLine() {
  return (
    <div
      aria-hidden
      className="mb-2.5 h-0.5 rounded-full bg-sd-accent shadow-[0_0_8px_var(--sd-accent)]"
    />
  );
}
