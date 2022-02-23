# ADVERB

> **Rename code symbol names locally without changing the original source code file.**

This vscode extension for *javascript/typescript* makes it possible to increase code readability by renaming code symbols without changing the underlying source code file. The "renames" are only visual changes: the original symbol name gets hidden, while the "new" name is displayed instead of the original name.

## Features

For each source code file, it can be decided individually whether all symbol names should be "renamed" automatically using a renaming technique, or only individual manually selected symbols.

To "rename" a single symbol locally, you can use the command **"Adverb: Rename single symbol (locally)"**, that can be executed via the context menu, the command palette or the shortcut `Shift + F2`. To "rename" all symbols of a source code file, the corresponding command **"Adverb: Rename all symbols (locally)"** can also be executed from the context menu, from the command palette or via the key combination `Ctrl + Shift + F2`.
After executing the respective command, a selection window appears in which the respective renaming technique can be selected.

The following renaming techniques can be used to rename the source code symbols:

* manual renaming (only for single symbols)
* remove vowels
* keep only the 1° letter, upper-case letters and special characters + the first letter following
* change to kamelCase
* change to PascalCase
* change to snake_case
* change to kebab-case
* change to UPPERCASE
* change to lowercase

All "renamings" are stored per source code file in the json file `adverb.config.json` in the folder `.vscode` of the workspace. Furthermore, all active "renamings" of the currently opened source code file are displayed in a treeview in the sidebar, from which they can also be edited or removed afterwards.

> Tip: When editing or clicking on a source code line, the original symbol name is always displayed.

## Extension Settings

This extension contributes the following settings:

* `adverb.enabled`: enable/disable this extension
* `adverb.treeViewEnabled`: enable/disable the treeview in the sidebar for this extension
* `adverb.fontWeight`: font weight for the "renamed" symbol
* `adverb.fontStyle`: font style for the "renamed" symbol
* `adverb.fontSize`: font size for the "renamed" symbol
* `adverb.margin`: margin of the "renamed" symbol
* `adverb.padding`: padding of the "renamed" symbol
* `adverb.borderRadius`: border radius of the "renamed" symbol
* `adverb.border`: border of the "renamed" symbol
* `adverb.backgroundColor`: background color of the "renamed" symbol
* `adverb.fontColor`: font color for the "renamed" symbol

**Enjoy!**
