import type { ReactNode } from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * お気に入りの登録 / 解除の**非ドラッグ経路**（右クリック）。
 *
 * 操作モデルの本線はドラッグ（お気に入りセクションへ移す）だが、ドラッグは
 * ポインタ専用なので、**キーボードでも辿れる経路を必ず用意する**
 * （ジェスチャ単独に依存しない / ドラッグにはキーボード代替を用意する）。
 * radix の ContextMenu はキーボード（メニューキー / Shift+F10）でも開ける。
 */
export function FavoriteContextMenu({
  favorite,
  onAdd,
  onRemove,
  children,
}: {
  favorite: boolean;
  onAdd: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="z-50 min-w-[200px] rounded-xl bg-card p-1.5 text-popover-foreground shadow-raise">
          <ContextMenuPrimitive.Item
            onSelect={favorite ? onRemove : onAdd}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none select-none data-[highlighted]:shadow-inset-sm"
          >
            {favorite ? (
              <Minus size={15} strokeWidth={2} className="text-muted-foreground" />
            ) : (
              <Plus size={15} strokeWidth={2} className="text-muted-foreground" />
            )}
            {favorite ? t("favorites.remove") : t("favorites.add")}
          </ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
