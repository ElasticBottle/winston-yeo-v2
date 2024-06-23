import { atom, useAtom } from "jotai";

export type SaveStateType = "unsaved" | "saved" | "saving" | "auto-saved";
const SaveStateAtom = atom<SaveStateType>("unsaved");
export const useSaveState = () => useAtom(SaveStateAtom);
