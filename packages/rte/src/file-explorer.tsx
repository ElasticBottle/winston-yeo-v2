"use client";

import { Button } from "@winston/ui/button";
import type { dir, file } from "opfs-tools";
import { useMemo, useRef } from "react";
import {
	Tree,
	type TreeDataProvider,
	type TreeEnvironmentRef,
	type TreeItem,
	type TreeItemIndex,
	UncontrolledTreeEnvironment,
} from "react-complex-tree";

import "react-complex-tree/lib/style-modern.css";
import "./file-explorer-override.css";
import { FilePlus, Folder, FolderOpen, FolderPlus } from "lucide-react";

const NOTE_BASE_DIR = "yanta-notes";

type DirectoryType = ReturnType<typeof dir>;
type FileType = ReturnType<typeof file>;

const initializeNoteDir = async () => {
	const { dir } = await import("opfs-tools");
	const noteDirExists = await dir(NOTE_BASE_DIR).exists();
	if (!noteDirExists) {
		await dir(NOTE_BASE_DIR).create();
	}
	return dir(NOTE_BASE_DIR);
};

const getFileTree = async (
	baseDir: DirectoryType,
): Promise<Record<string, TreeItem<FileType | DirectoryType>>> => {
	let treeExplorerItems: Record<
		string,
		TreeItem<FileType | DirectoryType>
	> = {};

	const baseTreeItem: TreeItem<FileType | DirectoryType> = {
		index: baseDir.name,
		canMove: true,
		canRename: true,
		isFolder: true,
		data: baseDir,
		children: [],
	};

	treeExplorerItems[baseDir.name] = baseTreeItem;

	const children = await baseDir.children();
	for (const child of children) {
		baseTreeItem.children?.push(child.name);
		if (child.kind === "file") {
			const childTreeItem: TreeItem<FileType> = {
				index: child.name,
				canMove: true,
				canRename: true,
				isFolder: false,
				data: child,
			};
			treeExplorerItems[child.name] = childTreeItem;
		} else {
			const childTree = await getFileTree(child);
			treeExplorerItems = { ...treeExplorerItems, ...childTree };
		}
	}

	return treeExplorerItems;
};

class OpfsFileDataProvider
	implements TreeDataProvider<DirectoryType | FileType>
{
	state: "not-initialized" | "initialized" | "stale" = "not-initialized";
	data: Record<string, TreeItem<FileType | DirectoryType>> = {};
	treeChangeListeners: Array<(changedItemIds: Array<TreeItemIndex>) => void> =
		[];

	async initialize() {
		if (this.state === "initialized") {
			return;
		}
		this.state = "initialized";
		this.data = await getFileTree(await initializeNoteDir());
	}

	async getTreeItem(itemId: TreeItemIndex) {
		if (this.state !== "initialized") {
			await this.initialize();
		}
		const result = this.data[itemId];
		if (!result) {
			throw new Error(`Error getting tree item with id: ${itemId}`);
		}
		return result;
	}

	async getTreeItems(itemIds: Array<TreeItemIndex>) {
		if (this.state !== "initialized") {
			await this.initialize();
		}
		return itemIds.map((itemId) => {
			const result = this.data?.[itemId];
			if (!result) {
				throw new Error(`Error getting tree items with id: ${itemId}`);
			}
			return result;
		});
	}

	onChangeItemChildren(
		itemId: TreeItemIndex,
		newChildren: Array<TreeItemIndex>,
	) {
		console.log("itemId", itemId);
		console.log("newChildren", newChildren);
		return Promise.resolve();
	}

	onDidChangeTreeData(
		listener: (changedItemIds: Array<TreeItemIndex>) => void,
	) {
		this.treeChangeListeners.push(listener);
		return {
			dispose: () =>
				this.treeChangeListeners.splice(
					this.treeChangeListeners.indexOf(listener),
					1,
				),
		};
	}

	/**
	 * @description Note that you have to update the {@param item} itself with the
	 * new name because that seems to be implicitly used by the tree component to show the update
	 * @param item - The tree item that is being renamed
	 * @param newName - The new name that is to be set
	 */
	async onRenameItem(
		item: TreeItem<FileType | DirectoryType>,
		newName: string,
	) {
		const { dir, file } = await import("opfs-tools");

		const data = item.data;
		if (data.kind === "dir") {
			item.data = await data.moveTo(dir(`${data.parent?.path}/${newName}`));
		} else if (data.kind === "file") {
			item.data = await data.moveTo(file(`${data.parent?.path}/${newName}`));
		}
		item.index = newName;

		this.state = "stale";
	}

	/**
	 * get the current focused item
	 * if the focus item is a folder, create a new folder inside it
	 * if the focus item is a file, create a folder inside the parent folder
	 */
	async createFolder({
		currentFocusedIndex,
		newFolderName,
	}: { currentFocusedIndex?: TreeItemIndex; newFolderName: string }) {
		const { dir, file } = await import("opfs-tools");

		const currentFocusedItem = this.data[currentFocusedIndex ?? NOTE_BASE_DIR];
		if (!currentFocusedItem) {
			throw new Error(`Current focused index ${currentFocusedIndex} not found`);
		}

		const currentData = currentFocusedItem.data;
		let path = `${currentData.path}/${newFolderName}`;
		if (currentData.kind === "file") {
			path = `${currentData.parent?.path}/${newFolderName}`;
		}
		const newDir = dir(path);
		if ((await newDir.exists()) || (await file(path).exists())) {
			alert("Folder already exists");
			return;
		}
		await newDir.create();

		const newTreeItem: TreeItem<DirectoryType> = {
			index: newDir.name,
			canMove: true,
			canRename: true,
			isFolder: true,
			data: newDir,
			children: [],
		};
		this.data[newDir.name] = newTreeItem;

		if (currentData.kind === "file") {
			if (!currentData.parent) {
				throw new Error("Parent not found");
			}
			const parentItem = this.data[currentData.parent.name];
			parentItem?.children?.push(newFolderName);
		} else if (currentData.kind === "dir") {
			currentFocusedItem.children?.push(newFolderName);
		}

		for (const listener of this.treeChangeListeners) {
			listener([currentFocusedItem.index]);
		}
	}
	/**
	 * get the current focused item
	 * if the focus item is a folder, create a new folder inside it
	 * if the focus item is a file, create a folder inside the parent folder
	 */
	async createFile({
		currentFocusedIndex,
		newFileName,
	}: { currentFocusedIndex?: TreeItemIndex; newFileName: string }) {
		const { file, write, dir } = await import("opfs-tools");

		if (!this.data) {
			throw new Error("Data not initialized");
		}

		const currentFocusedItem = this.data[currentFocusedIndex ?? NOTE_BASE_DIR];
		if (!currentFocusedItem) {
			throw new Error(`Current focused index ${currentFocusedIndex} not found`);
		}

		const currentData = currentFocusedItem.data;
		console.log("parent path", currentData.parent?.path);
		console.log("path", currentData.path);
		let filePath = `${currentData.path}/${newFileName}`;

		if (currentData.kind === "file") {
			filePath = `${currentData.parent?.path}/${newFileName}`;
		}
		const newFile = file(filePath);
		if ((await newFile.exists()) || (await dir(filePath).exists())) {
			alert("File already exists");
			return;
		}
		await write(filePath, "");

		const newTreeItem: TreeItem<FileType> = {
			index: newFile.name,
			canMove: true,
			canRename: true,
			isFolder: false,
			data: newFile,
			children: [],
		};
		this.data[newFile.name] = newTreeItem;

		if (currentData.kind === "file") {
			if (!currentData.parent) {
				throw new Error("Parent not found");
			}
			const parentItem = this.data[currentData.parent.name];
			parentItem?.children?.push(newFileName);
		} else if (currentData.kind === "dir") {
			currentFocusedItem.children?.push(newFileName);
		}

		for (const listener of this.treeChangeListeners) {
			listener([currentFocusedItem.index]);
		}
	}
}

export function FileExplorer() {
	const environment = useRef<TreeEnvironmentRef<
		FileType | DirectoryType
	> | null>(null);
	const treeId = "opfs-file-explorer";

	const dataProvider = useMemo(() => new OpfsFileDataProvider(), []);

	return (
		<UncontrolledTreeEnvironment
			ref={environment}
			canDragAndDrop
			canDropOnFolder
			dataProvider={dataProvider}
			getItemTitle={(item) => item.data.name}
			viewState={{}}
			renderItemArrow={(item) => {
				let body: JSX.Element | null = null;
				if (item.item.isFolder && item.context.isExpanded) {
					body = <FolderOpen />;
				} else if (item.item.isFolder) {
					body = <Folder />;
				}
				return (
					<div className="z-10 h-4 w-4 flex justify-center rounded-md -mr-3 items-center cursor-pointer pointer-events-none">
						{body}
					</div>
				);
			}}
		>
			<div className="flex w-full gap-2">
				<Button
					variant={"ghost"}
					size={"icon-sm"}
					aria-label="create new folder"
					onClick={async () => {
						const folderName = prompt("Enter folder name");
						if (!folderName) {
							return;
						}
						await dataProvider.createFolder({
							newFolderName: folderName,
							currentFocusedIndex:
								environment.current?.viewState[treeId]?.focusedItem,
						});
					}}
				>
					<FolderPlus size={18} />
				</Button>
				<Button
					variant={"ghost"}
					size={"icon-sm"}
					aria-label="create new file"
					onClick={async () => {
						const fileName = prompt("Enter folder name");
						console.log("fileName", fileName);
						if (!fileName) {
							return;
						}

						await dataProvider.createFile({
							newFileName: fileName,
							currentFocusedIndex:
								environment.current?.viewState[treeId]?.focusedItem,
						});
					}}
				>
					<FilePlus size={18} />
				</Button>
			</div>
			<Tree treeId={treeId} rootItem={NOTE_BASE_DIR} treeLabel="Tree Example" />
		</UncontrolledTreeEnvironment>
	);
}
